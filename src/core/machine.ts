// 公開ファサード。アセンブラ＋実行エンジン＋ジャーナルを束ね、UI 非依存の API を提供する。
import {
  DEFAULT_MAX_STEPS,
  HALT_ADDR,
  WORD_MASK,
  type Address,
  type GRIndex,
  type HaltReason,
  type MachineStatus,
  type Word,
} from './types';
import { Executor, type RunResult, type StepResult } from './executor';
import { decode, type DecodedInstruction } from './decoder';
import { assemble } from './assembler';
import type { AssembleResult, SourceMapEntry } from './assembler';
import type { Change, StepDelta } from './journal';
import { wordsToString } from './io';

export interface RegistersView {
  GR: Word[];
  PR: Address;
  SP: Address;
  FR: { OF: boolean; SF: boolean; ZF: boolean };
  IE: boolean;
  IVR: Address;
}

export interface LastChanges {
  addresses: Set<Address>;
  gr: Set<number>;
  pr: boolean;
  sp: boolean;
  fr: boolean;
  ie: boolean;
  ivr: boolean;
}

export type MachineEvent =
  | { type: 'stepped'; delta?: StepDelta }
  | { type: 'stepped-back' }
  | { type: 'ran' }
  | { type: 'reset' }
  | { type: 'loaded' };

export class Machine {
  private ex = new Executor();
  private sourceMap?: SourceMapEntry[];
  private addrLine = new Map<Address, number>();
  private listeners = new Set<(ev: MachineEvent) => void>();

  // --- 準備 ---

  assemble(source: string): AssembleResult {
    return assemble(source);
  }

  load(image: NonNullable<AssembleResult['image']>, sourceMap?: SourceMapEntry[]): void {
    this.ex.reset();
    for (let i = 0; i < image.words.length; i++) {
      this.ex.memory.setRaw(image.origin + i, image.words[i]);
    }
    // 主プログラムの最終 RET 用に番兵を積む
    const sp = (image.spInit - 1) & WORD_MASK;
    this.ex.memory.setRaw(sp, HALT_ADDR);
    this.ex.regs.SP = sp;
    this.ex.regs.PR = image.entryPoint;
    this.ex.status = 'loaded';
    this.ex.version++;
    this.sourceMap = sourceMap;
    this.addrLine.clear();
    if (sourceMap) {
      for (const e of sourceMap) {
        for (let i = 0; i < e.words.length; i++) this.addrLine.set(e.address + i, e.sourceLine);
      }
    }
    this.emit({ type: 'loaded' });
  }

  assembleAndLoad(source: string): AssembleResult {
    const result = this.assemble(source);
    if (result.ok && result.image) this.load(result.image, result.sourceMap);
    return result;
  }

  reset(): void {
    this.ex.reset();
    this.sourceMap = undefined;
    this.addrLine.clear();
    this.emit({ type: 'reset' });
  }

  // --- 実行制御 ---

  step(): StepResult {
    const r = this.ex.step();
    this.emit({ type: 'stepped', delta: this.ex.journal.last() });
    return r;
  }

  stepBack(): boolean {
    const ok = this.ex.stepBack();
    this.emit({ type: 'stepped-back' });
    return ok;
  }

  run(maxSteps = DEFAULT_MAX_STEPS, breakpoints?: ReadonlySet<Address>): RunResult {
    const r = this.ex.run(maxSteps, breakpoints);
    this.emit({ type: 'ran' });
    return r;
  }

  fireInterrupt(no = 0): void {
    this.ex.interrupt.fire(no);
  }

  // --- I/O ---

  setInput(text: string): void {
    this.ex.io.setInputText(text);
  }
  getOutput(): string {
    return this.ex.io.outputString();
  }

  // --- 状態取得 ---

  getVersion(): number {
    return this.ex.version;
  }
  getStatus(): MachineStatus {
    return this.ex.status;
  }
  getHaltReason(): HaltReason | undefined {
    return this.ex.haltReason;
  }
  getStepCount(): number {
    return this.ex.stepCount;
  }
  getWord(a: Address): Word {
    return this.ex.memory.get(a);
  }
  getMemory(): Uint16Array {
    return this.ex.memory.words;
  }
  getRegisters(): RegistersView {
    const r = this.ex.regs;
    return {
      GR: [...r.GR],
      PR: r.PR,
      SP: r.SP,
      FR: { ...r.FR },
      IE: r.IE,
      IVR: r.IVR,
    };
  }
  getGR(i: GRIndex): Word {
    return this.ex.regs.GR[i];
  }

  getLastDelta(): StepDelta | undefined {
    return this.ex.journal.last();
  }

  getLastChanges(): LastChanges {
    const res: LastChanges = {
      addresses: new Set(),
      gr: new Set(),
      pr: false,
      sp: false,
      fr: false,
      ie: false,
      ivr: false,
    };
    const delta = this.ex.journal.last();
    if (!delta) return res;
    for (const c of delta.changes) classifyChange(c, res);
    return res;
  }

  canStepBack(): boolean {
    return this.ex.journal.canStepBack();
  }

  // --- デコード（多重解釈ビュー用） ---

  /** 番地の語を命令としてデコード（2語命令は次番地も読む）。 */
  decodeAt(a: Address): DecodedInstruction {
    return decode((x) => this.ex.memory.get(x), a);
  }

  getSourceMap(): SourceMapEntry[] | undefined {
    return this.sourceMap;
  }
  addressToSourceLine(a: Address): number | undefined {
    return this.addrLine.get(a);
  }

  // --- 購読 ---

  subscribe(listener: (ev: MachineEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private emit(ev: MachineEvent): void {
    for (const l of this.listeners) l(ev);
  }
}

function classifyChange(c: Change, res: LastChanges): void {
  switch (c.kind) {
    case 'MEM':
      res.addresses.add(c.address);
      break;
    case 'GR':
      res.gr.add(c.index);
      break;
    case 'PR':
      res.pr = true;
      break;
    case 'SP':
      res.sp = true;
      break;
    case 'FR':
      res.fr = true;
      break;
    case 'IE':
      res.ie = true;
      break;
    case 'IVR':
      res.ivr = true;
      break;
    default:
      break;
  }
}

export { wordsToString };
