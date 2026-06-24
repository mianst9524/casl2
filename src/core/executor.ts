// 実行エンジン本体。毎ステップ live メモリから fetch→decode→execute（ADR-0001）。
// 状態変更はすべて RecordingContext 経由で StepDelta に集約（ADR-0003）。
import {
  DEFAULT_MAX_STEPS,
  HALT_ADDR,
  WORD_MASK,
  type Address,
  type Flags,
  type GRIndex,
  type HaltReason,
  type MachineStatus,
  type Word,
} from './types';
import { clampGR } from './bits';
import { Memory } from './memory';
import { RegisterFile } from './registers';
import { Io } from './io';
import { InterruptController, packFR } from './interrupt';
import { Journal, type Change, type StepDelta } from './journal';
import { decode } from './decoder';
import { OPCODE_TABLE } from './instructions';
import type { ExecContext, ExecIo } from './exec-context';

export interface StepResult {
  executed: boolean;
  deltasPushed: number;
  halted: boolean;
  haltReason?: HaltReason;
}

export interface RunResult {
  steps: number;
  halted: boolean;
  haltReason?: HaltReason;
  stoppedBy: 'halt' | 'maxSteps' | 'breakpoint';
}

const NEWLINE = 0x0a;

/** 状態書き込みの単一経路。読み取り＋記録付き書き込みを提供する。 */
class RecordingContext implements ExecContext {
  halted = false;
  haltReason?: HaltReason;
  readonly io: ExecIo;

  constructor(
    private readonly ex: Executor,
    private readonly changes: Change[],
  ) {
    this.io = {
      readLine: (maxLen) => this.readLine(maxLen),
      write: (words) => this.writeOut(words),
    };
  }

  getGR(i: GRIndex): Word {
    return this.ex.regs.GR[i];
  }
  getPR(): Address {
    return this.ex.regs.PR;
  }
  getSP(): Address {
    return this.ex.regs.SP;
  }
  getFlags(): Flags {
    return this.ex.regs.FR;
  }
  getIE(): boolean {
    return this.ex.regs.IE;
  }
  getIVR(): Address {
    return this.ex.regs.IVR;
  }
  readMem(a: Address): Word {
    return this.ex.memory.get(a);
  }
  effectiveAddress(adr: Word, xr: number): Address {
    const idx = xr & 0xf;
    const base = idx !== 0 ? this.ex.regs.GR[clampGR(idx)] : 0;
    return (adr + base) & WORD_MASK;
  }

  setGR(i: GRIndex, v: Word): void {
    const neu = v & WORD_MASK;
    const old = this.ex.regs.GR[i];
    if (old === neu) return;
    this.ex.regs.setGRRaw(i, neu);
    this.changes.push({ kind: 'GR', index: i, old, neu });
  }
  setPR(a: Address): void {
    const neu = a & WORD_MASK;
    const old = this.ex.regs.PR;
    if (old === neu) return;
    this.ex.regs.PR = neu;
    this.changes.push({ kind: 'PR', old, neu });
  }
  setSP(a: Address): void {
    const neu = a & WORD_MASK;
    const old = this.ex.regs.SP;
    if (old === neu) return;
    this.ex.regs.SP = neu;
    this.changes.push({ kind: 'SP', old, neu });
  }
  setFlags(f: Flags): void {
    const old = this.ex.regs.FR;
    if (old.OF === f.OF && old.SF === f.SF && old.ZF === f.ZF) return;
    this.ex.regs.FR = { OF: f.OF, SF: f.SF, ZF: f.ZF };
    this.changes.push({ kind: 'FR', old, neu: this.ex.regs.FR });
  }
  setIE(v: boolean): void {
    const old = this.ex.regs.IE;
    if (old === v) return;
    this.ex.regs.IE = v;
    this.changes.push({ kind: 'IE', old, neu: v });
  }
  setIVR(a: Address): void {
    const neu = a & WORD_MASK;
    const old = this.ex.regs.IVR;
    if (old === neu) return;
    this.ex.regs.IVR = neu;
    this.changes.push({ kind: 'IVR', old, neu });
  }
  writeMem(a: Address, v: Word): void {
    const addr = a & WORD_MASK;
    const neu = v & WORD_MASK;
    const old = this.ex.memory.get(addr);
    if (old === neu) return;
    this.ex.memory.setRaw(addr, neu);
    this.changes.push({ kind: 'MEM', address: addr, old, neu });
  }

  push(v: Word): void {
    const nsp = (this.ex.regs.SP - 1) & WORD_MASK;
    this.setSP(nsp);
    this.writeMem(nsp, v);
  }
  pop(): Word {
    const sp = this.ex.regs.SP;
    const v = this.ex.memory.get(sp);
    this.setSP((sp + 1) & WORD_MASK);
    return v;
  }

  halt(reason: HaltReason): void {
    this.halted = true;
    this.haltReason = reason;
  }

  private readLine(maxLen: number): Word[] | null {
    const io = this.ex.io;
    if (io.cursor >= io.input.length) return null;
    const start = io.cursor;
    let i = start;
    const out: Word[] = [];
    while (i < io.input.length && out.length < maxLen && io.input[i] !== NEWLINE) {
      out.push(io.input[i]);
      i++;
    }
    // 改行を消費（あれば）
    if (i < io.input.length && io.input[i] === NEWLINE) i++;
    if (i !== start) {
      io.setCursorRaw(i);
      this.changes.push({ kind: 'IN_CURSOR', old: start, neu: i });
    }
    return out;
  }

  private writeOut(words: Word[]): void {
    if (words.length === 0) return;
    const copy = words.map((w) => w & WORD_MASK);
    this.ex.io.appendOutputRaw(copy);
    this.changes.push({ kind: 'OUT_APPEND', words: copy });
  }
}

export class Executor {
  readonly memory = new Memory();
  readonly regs = new RegisterFile();
  readonly io = new Io();
  readonly interrupt = new InterruptController();
  readonly journal = new Journal();

  status: MachineStatus = 'idle';
  haltReason?: HaltReason;
  stepCount = 0;
  /** UI 購読用の単調増加バージョン。 */
  version = 0;

  reset(): void {
    this.memory.clear();
    this.regs.reset();
    this.io.reset();
    this.interrupt.reset();
    this.journal.clear();
    this.stepCount = 0;
    this.status = 'idle';
    this.haltReason = undefined;
    this.version++;
  }

  /** 1 命令を実行。命令完了後に割り込みを評価する。 */
  step(): StepResult {
    if (this.status === 'halted' || this.status === 'error') {
      return { executed: false, deltasPushed: 0, halted: true, haltReason: this.haltReason };
    }
    // 番兵番地へ戻っていれば正常終了
    if (this.regs.PR === HALT_ADDR) {
      this.status = 'halted';
      this.haltReason = 'end';
      return { executed: false, deltasPushed: 0, halted: true, haltReason: 'end' };
    }

    const decoded = decode((a) => this.memory.get(a), this.regs.PR);

    if (!decoded.known) {
      // PR がデータ領域へ侵入＝未定義オペコード。PR を進めず停止し、UI で当該語を示す。
      this.status = 'halted';
      this.haltReason = 'invalid-opcode';
      this.version++;
      return {
        executed: false,
        deltasPushed: 0,
        halted: true,
        haltReason: 'invalid-opcode',
      };
    }

    const delta: StepDelta = {
      index: this.stepCount,
      prBefore: this.regs.PR,
      kind: 'instruction',
      changes: [],
      decodedMnemonic: decoded.mnemonic,
    };
    const ctx = new RecordingContext(this, delta.changes);
    // 実行前に PR を語長分進める（CALL/分岐は exec で上書き）
    ctx.setPR((this.regs.PR + decoded.wordLength) & WORD_MASK);
    OPCODE_TABLE.get(decoded.opcode)!.exec(ctx, decoded);

    this.journal.push(delta);
    this.stepCount++;
    this.version++;

    let deltasPushed = 1;
    if (ctx.halted) {
      this.status = 'halted';
      this.haltReason = ctx.haltReason;
      return { executed: true, deltasPushed, halted: true, haltReason: ctx.haltReason };
    }
    this.status = 'paused';

    if (this.serviceInterrupt()) deltasPushed++;
    return { executed: true, deltasPushed, halted: false };
  }

  /** 命令完了後の割り込み評価。発生したら interrupt-entry の差分を1つ積む。 */
  private serviceInterrupt(): boolean {
    if (!this.regs.IE || !this.interrupt.hasPending()) return false;
    const no = this.interrupt.pending[0];
    const delta: StepDelta = {
      index: this.stepCount,
      prBefore: this.regs.PR,
      kind: 'interrupt-entry',
      changes: [],
    };
    const ctx = new RecordingContext(this, delta.changes);
    this.interrupt.pending.shift();
    delta.changes.push({ kind: 'INT_CONSUME', no });
    // FR を退避（先）→ PR を退避（後＝スタック上位）
    ctx.push(packFR(this.regs.FR));
    ctx.push(this.regs.PR);
    ctx.setIE(false);
    ctx.setPR(this.regs.IVR);

    this.journal.push(delta);
    this.stepCount++;
    this.version++;
    return true;
  }

  /** 直近の差分を1つ巻き戻す。 */
  stepBack(): boolean {
    const delta = this.journal.popLast();
    if (!delta) return false;
    for (let i = delta.changes.length - 1; i >= 0; i--) {
      this.applyOld(delta.changes[i]);
    }
    this.stepCount = Math.max(0, this.stepCount - 1);
    if (this.status === 'halted' || this.status === 'error') {
      this.status = this.stepCount === 0 ? 'loaded' : 'paused';
      this.haltReason = undefined;
    }
    this.version++;
    return true;
  }

  private applyOld(c: Change): void {
    switch (c.kind) {
      case 'GR':
        this.regs.setGRRaw(c.index, c.old);
        break;
      case 'PR':
        this.regs.PR = c.old;
        break;
      case 'SP':
        this.regs.SP = c.old;
        break;
      case 'FR':
        this.regs.FR = { ...c.old };
        break;
      case 'IE':
        this.regs.IE = c.old;
        break;
      case 'IVR':
        this.regs.IVR = c.old;
        break;
      case 'MEM':
        this.memory.setRaw(c.address, c.old);
        break;
      case 'IN_CURSOR':
        this.io.setCursorRaw(c.old);
        break;
      case 'OUT_APPEND':
        this.io.truncateOutputRaw(c.words.length);
        break;
      case 'INT_CONSUME':
        this.interrupt.pending.unshift(c.no);
        break;
    }
  }

  /** halt / breakpoint / maxSteps まで連続実行。 */
  run(maxSteps = DEFAULT_MAX_STEPS, breakpoints?: ReadonlySet<Address>): RunResult {
    let steps = 0;
    while (steps < maxSteps) {
      if (this.status === 'halted' || this.status === 'error') {
        return { steps, halted: true, haltReason: this.haltReason, stoppedBy: 'halt' };
      }
      const r = this.step();
      steps++;
      if (r.halted) {
        return { steps, halted: true, haltReason: this.haltReason, stoppedBy: 'halt' };
      }
      if (breakpoints && breakpoints.has(this.regs.PR)) {
        return { steps, halted: false, stoppedBy: 'breakpoint' };
      }
    }
    return { steps, halted: false, stoppedBy: 'maxSteps' };
  }
}
