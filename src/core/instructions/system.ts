// NOP / SVC（システムコール）/ RETI・EI・DI・SIV（割り込み拡張・ADR-0002）。
import type { InstructionDef } from '../exec-context';
import { unpackFR } from '../interrupt';
import { EOF_LENGTH } from '../io';
import { WORD_MASK } from '../types';
import { DI, EI, NOP, RETI, SIV, SVC } from '../opcodes';

/** SVC 呼び出し番号の規約（本シミュレーター独自）。 */
export const SVC_EXIT = 0; // プログラム終了
export const SVC_IN = 1; // 入力（GR1=入力域, GR2=文字長域）
export const SVC_OUT = 2; // 出力（GR1=出力域, GR2=文字長域）
/** IN の1行最大文字数。 */
export const MAX_IN_LEN = 256;

export const systemDefs: InstructionDef[] = [
  { opcode: NOP, mnemonic: 'NOP', exec: () => {} },
  {
    opcode: SVC,
    mnemonic: 'SVC',
    exec(ctx, ins) {
      const num = ctx.effectiveAddress(ins.adr ?? 0, ins.r2);
      if (num === SVC_EXIT) {
        ctx.halt('svc-exit');
        return;
      }
      if (num === SVC_IN) {
        const bufAddr = ctx.getGR(1);
        const lenAddr = ctx.getGR(2);
        const line = ctx.io.readLine(MAX_IN_LEN);
        if (line === null) {
          ctx.writeMem(lenAddr, EOF_LENGTH);
          return;
        }
        for (let i = 0; i < line.length; i++) {
          ctx.writeMem((bufAddr + i) & WORD_MASK, line[i]);
        }
        ctx.writeMem(lenAddr, line.length & WORD_MASK);
        return;
      }
      if (num === SVC_OUT) {
        const bufAddr = ctx.getGR(1);
        const lenAddr = ctx.getGR(2);
        const len = ctx.readMem(lenAddr);
        const words: number[] = [];
        for (let i = 0; i < len; i++) {
          words.push(ctx.readMem((bufAddr + i) & WORD_MASK));
        }
        ctx.io.write(words);
        return;
      }
      // 未知の SVC 番号は何もしない（学習用）。
    },
  },
  // --- 割り込み拡張 ---
  {
    opcode: RETI,
    mnemonic: 'RETI',
    exec(ctx) {
      ctx.setPR(ctx.pop());
      ctx.setFlags(unpackFR(ctx.pop()));
      ctx.setIE(true);
    },
  },
  { opcode: EI, mnemonic: 'EI', exec: (ctx) => ctx.setIE(true) },
  { opcode: DI, mnemonic: 'DI', exec: (ctx) => ctx.setIE(false) },
  {
    opcode: SIV,
    mnemonic: 'SIV',
    exec: (ctx, ins) => ctx.setIVR(ctx.effectiveAddress(ins.adr ?? 0, ins.r2)),
  },
];
