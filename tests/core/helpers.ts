import { Executor } from '../../src/core/executor';
import { SP_INIT, type Word } from '../../src/core/types';

/** 第1語を組み立てる： (opcode<<8) | (r1<<4) | r2 */
export const w = (op: number, r1 = 0, r2 = 0): Word =>
  ((op << 8) | ((r1 & 0xf) << 4) | (r2 & 0xf)) & 0xffff;

/** 語列をメモリへ直接配置（アセンブラ未使用のテスト用）。 */
export function loadWords(ex: Executor, start: number, words: Word[]): void {
  words.forEach((x, i) => ex.memory.setRaw(start + i, x));
}

/** PR/SP を初期化して実行可能状態にする。 */
export function prime(ex: Executor, pr = 0, sp = SP_INIT): void {
  ex.regs.PR = pr;
  ex.regs.SP = sp;
  ex.status = 'loaded';
}

export interface FullSnapshot {
  mem: Uint16Array;
  GR: Word[];
  PR: number;
  SP: number;
  FR: { OF: boolean; SF: boolean; ZF: boolean };
  IE: boolean;
  IVR: number;
  cursor: number;
  output: Word[];
  pending: number[];
}

export function snapshot(ex: Executor): FullSnapshot {
  return {
    mem: ex.memory.words.slice(),
    GR: [...ex.regs.GR],
    PR: ex.regs.PR,
    SP: ex.regs.SP,
    FR: { ...ex.regs.FR },
    IE: ex.regs.IE,
    IVR: ex.regs.IVR,
    cursor: ex.io.cursor,
    output: [...ex.io.output],
    pending: [...ex.interrupt.pending],
  };
}
