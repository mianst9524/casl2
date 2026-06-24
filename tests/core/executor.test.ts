import { describe, it, expect } from 'vitest';
import { Executor } from '../../src/core/executor';
import {
  ADDA_REG,
  CPA_ADR,
  JZE,
  LAD,
  LD_REG,
  ST,
  JUMP,
  PUSH,
  POP,
  CALL,
  RET,
  SVC,
  EI,
  SIV,
  SUBA_ADR,
} from '../../src/core/opcodes';
import { SVC_IN, SVC_OUT } from '../../src/core/instructions';
import { loadWords, prime, snapshot, w } from './helpers';
import { SP_INIT } from '../../src/core/types';

describe('基本命令とフラグ', () => {
  it('LAD + ADDA(r-r) で加算', () => {
    const ex = new Executor();
    loadWords(ex, 0, [w(LAD, 1), 5, w(LAD, 2), 3, w(ADDA_REG, 1, 2)]);
    prime(ex);
    ex.step(); // LAD GR1,5
    ex.step(); // LAD GR2,3
    ex.step(); // ADDA GR1,GR2
    expect(ex.regs.GR[1]).toBe(8);
    expect(ex.regs.FR.ZF).toBe(false);
    expect(ex.regs.FR.SF).toBe(false);
  });

  it('SUBA で 0 になると ZF=1', () => {
    const ex = new Executor();
    // LAD GR1,7 ; SUBA GR1,DATA ; DATA DC 7
    loadWords(ex, 0, [w(LAD, 1), 7, w(SUBA_ADR, 1), 6 /*adr*/]);
    ex.memory.setRaw(6, 7);
    prime(ex);
    ex.step();
    ex.step();
    expect(ex.regs.GR[1]).toBe(0);
    expect(ex.regs.FR.ZF).toBe(true);
  });
});

describe('比較とループ', () => {
  it('CPA + JZE による条件分岐', () => {
    const ex = new Executor();
    // LAD GR1,5 ; CPA GR1,DATA(=5) ; JZE 8 ; (skip) ; 8: LAD GR0,99
    loadWords(ex, 0, [
      w(LAD, 1),
      5,
      w(CPA_ADR, 1),
      7, // adr of DATA
      w(JZE),
      9, // jump target addr 9
    ]);
    ex.memory.setRaw(7, 5); // DATA
    ex.memory.setRaw(9, w(LAD, 0));
    ex.memory.setRaw(10, 99);
    prime(ex);
    ex.step(); // LAD GR1,5
    ex.step(); // CPA → ZF=1
    expect(ex.regs.FR.ZF).toBe(true);
    ex.step(); // JZE → PR=9
    expect(ex.regs.PR).toBe(9);
    ex.step(); // LAD GR0,99
    expect(ex.regs.GR[0]).toBe(99);
  });
});

describe('スタックとサブルーチン', () => {
  it('CALL/RET と PUSH/POP', () => {
    const ex = new Executor();
    // 0: CALL 4 ; 2: (戻り) LAD GR0,1 ; (番兵 RET 用に SP に HALT_ADDR を積む)
    // 4: PUSH 0,GR? いや単純に: 4: LAD GR1,42 ; 6: RET
    loadWords(ex, 0, [w(CALL), 4, w(LAD, 0), 1, w(LAD, 1), 42, w(RET)]);
    prime(ex);
    const sp0 = ex.regs.SP;
    ex.step(); // CALL 4 → push 戻り番地2, PR=4
    expect(ex.regs.PR).toBe(4);
    expect(ex.regs.SP).toBe((sp0 - 1) & 0xffff);
    ex.step(); // LAD GR1,42
    ex.step(); // RET → PR=2
    expect(ex.regs.PR).toBe(2);
    expect(ex.regs.SP).toBe(sp0);
    ex.step(); // LAD GR0,1
    expect(ex.regs.GR[0]).toBe(1);
  });

  it('PUSH で値を積み POP で取り出す', () => {
    const ex = new Executor();
    loadWords(ex, 0, [w(PUSH), 0x1234, w(POP, 3)]);
    prime(ex);
    ex.step(); // PUSH 0x1234
    ex.step(); // POP GR3
    expect(ex.regs.GR[3]).toBe(0x1234);
  });
});

describe('自己書き換えコード（ADR-0001 の核）', () => {
  it('ST で命令語を書き換え、その語が実行される', () => {
    const ex = new Executor();
    // 0: LAD GR1,#1401 ; 2: ST GR1,6 ; 4: JUMP 6 ; 6: NOP(0) → 実行時 LD GR0,GR1
    loadWords(ex, 0, [w(LAD, 1), 0x1401, w(ST, 1), 6, w(JUMP), 6, 0x0000]);
    prime(ex);
    ex.step(); // GR1 = 0x1401
    ex.step(); // mem[6] = 0x1401
    expect(ex.memory.get(6)).toBe(0x1401);
    ex.step(); // JUMP 6
    expect(ex.regs.PR).toBe(6);
    ex.step(); // mem[6]=0x1401 = LD GR0,GR1 → GR0 = 0x1401
    expect(ex.regs.GR[0]).toBe(0x1401);
  });
});

describe('未定義オペコード（PR のデータ侵入）', () => {
  it('未知の語を実行すると invalid-opcode で停止', () => {
    const ex = new Executor();
    loadWords(ex, 0, [0xffff]); // 未定義オペコード 0xFF
    prime(ex);
    const r = ex.step();
    expect(r.halted).toBe(true);
    expect(r.haltReason).toBe('invalid-opcode');
    expect(ex.regs.PR).toBe(0); // PR は進めない
  });
});

describe('I/O（事前入力バッファ）', () => {
  it('IN で入力を読み OUT で出力する', () => {
    const ex = new Executor();
    ex.io.setInputText('AB\n');
    // LAD GR1,0x20 ; LAD GR2,0x30 ; SVC 1(IN) ; SVC 2(OUT)
    loadWords(ex, 0, [
      w(LAD, 1),
      0x20,
      w(LAD, 2),
      0x30,
      w(SVC),
      SVC_IN,
      w(SVC),
      SVC_OUT,
    ]);
    prime(ex);
    ex.step(); // LAD GR1
    ex.step(); // LAD GR2
    ex.step(); // IN
    expect(ex.memory.get(0x20)).toBe(0x41); // 'A'
    expect(ex.memory.get(0x21)).toBe(0x42); // 'B'
    expect(ex.memory.get(0x30)).toBe(2); // 長さ
    expect(ex.io.cursor).toBe(3); // "AB\n" 消費
    ex.step(); // OUT
    expect(ex.io.outputString()).toBe('AB');
  });
});

describe('割り込み拡張（ADR-0002）', () => {
  it('発火 → 命令完了後に退避しハンドラへ、RETI で復帰', () => {
    const ex = new Executor();
    // 0: SIV 0x10 ; 2: EI ; 3: NOP ; ... 0x10: RETI
    loadWords(ex, 0, [w(SIV), 0x10, w(EI), 0x0000]);
    ex.memory.setRaw(0x10, w(0x82)); // RETI
    prime(ex);
    ex.step(); // SIV → IVR=0x10
    expect(ex.regs.IVR).toBe(0x10);
    ex.step(); // EI → IE=1
    expect(ex.regs.IE).toBe(true);
    ex.interrupt.fire(7);
    const spBefore = ex.regs.SP;
    const r = ex.step(); // NOP 実行 → 完了後に割り込み退避
    expect(r.deltasPushed).toBe(2);
    expect(ex.regs.PR).toBe(0x10); // ハンドラへ
    expect(ex.regs.IE).toBe(false);
    expect(ex.regs.SP).toBe((spBefore - 2) & 0xffff); // FR と PR を退避
    ex.step(); // RETI → 復帰
    expect(ex.regs.IE).toBe(true);
    expect(ex.regs.PR).toBe(4); // NOP の次（退避した戻り番地）
    expect(ex.regs.SP).toBe(spBefore);
  });

  it('IE=0 の間は発火しても退避しない', () => {
    const ex = new Executor();
    loadWords(ex, 0, [0x0000, 0x0000]); // NOP, NOP
    prime(ex);
    ex.interrupt.fire();
    const r = ex.step();
    expect(r.deltasPushed).toBe(1); // 割り込み entry なし
    expect(ex.interrupt.hasPending()).toBe(true);
  });
});

describe('逆実行の不変条件（ADR-0003）', () => {
  it('複合プログラムを全 stepBack すると初期状態に完全一致', () => {
    const ex = new Executor();
    // 算術・メモリ書込・スタック・自己書き換え・I/O を混ぜる
    ex.io.setInputText('Z\n');
    loadWords(ex, 0, [
      w(LAD, 1),
      0x20, // GR1=0x20
      w(LAD, 2),
      0x30, // GR2=0x30
      w(SVC),
      SVC_IN, // IN（cursor/mem 変化）
      w(LAD, 3),
      10, // GR3=10
      w(PUSH),
      0xabcd, // push
      w(POP, 4), // GR4=0xabcd
      w(ST, 3),
      0x40, // mem[0x40]=10
      w(LD_REG, 5, 3), // GR5=GR3
    ]);
    prime(ex);
    const init = snapshot(ex);

    const states: ReturnType<typeof snapshot>[] = [init];
    let total = 0;
    for (let i = 0; i < 8; i++) {
      const r = ex.step();
      total += r.deltasPushed;
      states.push(snapshot(ex));
      if (r.halted) break;
    }
    expect(total).toBeGreaterThan(0);

    // 全部巻き戻す
    while (ex.journal.canStepBack()) ex.stepBack();

    const back = snapshot(ex);
    expect(back.GR).toEqual(init.GR);
    expect(back.PR).toBe(init.PR);
    expect(back.SP).toBe(init.SP);
    expect(back.FR).toEqual(init.FR);
    expect(back.cursor).toBe(init.cursor);
    expect(back.output).toEqual(init.output);
    expect([...back.mem]).toEqual([...init.mem]);
  });

  it('1 ステップごとの step→stepBack で完全復元', () => {
    const ex = new Executor();
    loadWords(ex, 0, [w(LAD, 1), 0x7fff, w(ADDA_REG, 1, 1), w(ST, 1), 0x50]);
    prime(ex);
    for (let i = 0; i < 3; i++) {
      const before = snapshot(ex);
      ex.step();
      ex.stepBack();
      const after = snapshot(ex);
      expect(after.GR).toEqual(before.GR);
      expect(after.PR).toBe(before.PR);
      expect(after.FR).toEqual(before.FR);
      expect([...after.mem]).toEqual([...before.mem]);
      ex.step(); // 進めて次へ
    }
  });
});

describe('run', () => {
  it('番兵 RET で正常終了する', () => {
    const ex = new Executor();
    // SP に HALT_ADDR を積んでおき、最後の RET で終了
    loadWords(ex, 0, [w(LAD, 0), 1, w(RET)]);
    prime(ex);
    // 番兵を積む
    ex.regs.SP = (SP_INIT - 1) & 0xffff;
    ex.memory.setRaw(ex.regs.SP, 0xffff); // HALT_ADDR
    const r = ex.run(100);
    expect(r.halted).toBe(true);
    expect(r.haltReason).toBe('end');
    expect(ex.regs.GR[0]).toBe(1);
  });
});
