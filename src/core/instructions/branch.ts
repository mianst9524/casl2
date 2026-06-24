// 分岐命令。条件成立で PR←実効アドレス。フラグは不変。
import type { ExecContext, InstructionDef } from '../exec-context';
import type { DecodedInstruction } from '../decoder';
import { JMI, JNZ, JOV, JPL, JUMP, JZE } from '../opcodes';

function branchIf(ctx: ExecContext, ins: DecodedInstruction, cond: boolean) {
  if (cond) {
    ctx.setPR(ctx.effectiveAddress(ins.adr ?? 0, ins.r2));
  }
}

export const branchDefs: InstructionDef[] = [
  { opcode: JMI, mnemonic: 'JMI', exec: (c, i) => branchIf(c, i, c.getFlags().SF) },
  { opcode: JNZ, mnemonic: 'JNZ', exec: (c, i) => branchIf(c, i, !c.getFlags().ZF) },
  { opcode: JZE, mnemonic: 'JZE', exec: (c, i) => branchIf(c, i, c.getFlags().ZF) },
  { opcode: JUMP, mnemonic: 'JUMP', exec: (c, i) => branchIf(c, i, true) },
  {
    opcode: JPL,
    mnemonic: 'JPL',
    exec: (c, i) => branchIf(c, i, !c.getFlags().SF && !c.getFlags().ZF),
  },
  { opcode: JOV, mnemonic: 'JOV', exec: (c, i) => branchIf(c, i, c.getFlags().OF) },
];
