// PUSH / POP / CALL / RET。フラグは不変。
import type { InstructionDef } from '../exec-context';
import { asGR } from '../bits';
import { CALL, POP, PUSH, RET } from '../opcodes';

export const stackDefs: InstructionDef[] = [
  {
    opcode: PUSH,
    mnemonic: 'PUSH',
    exec(ctx, ins) {
      // PUSH は実効アドレス（値）を積む
      ctx.push(ctx.effectiveAddress(ins.adr ?? 0, ins.r2));
    },
  },
  {
    opcode: POP,
    mnemonic: 'POP',
    exec(ctx, ins) {
      ctx.setGR(asGR(ins.r1), ctx.pop());
    },
  },
  {
    opcode: CALL,
    mnemonic: 'CALL',
    exec(ctx, ins) {
      // PR は既に次命令を指している（戻り番地）
      ctx.push(ctx.getPR());
      ctx.setPR(ctx.effectiveAddress(ins.adr ?? 0, ins.r2));
    },
  },
  {
    opcode: RET,
    mnemonic: 'RET',
    exec(ctx) {
      ctx.setPR(ctx.pop());
    },
  },
];
