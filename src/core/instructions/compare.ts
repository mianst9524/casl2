// CPA（符号付き比較）/ CPL（符号なし比較）。GR は不変、フラグのみ設定。OF←0。
import type { ExecContext, InstructionDef } from '../exec-context';
import type { DecodedInstruction } from '../decoder';
import { asGR, toSigned, toUnsigned } from '../bits';
import { CPA_ADR, CPA_REG, CPL_ADR, CPL_REG } from '../opcodes';

const adrOperand = (ctx: ExecContext, ins: DecodedInstruction): number =>
  ctx.readMem(ctx.effectiveAddress(ins.adr ?? 0, ins.r2));
const regOperand = (ctx: ExecContext, ins: DecodedInstruction): number =>
  ctx.getGR(asGR(ins.r2));

function compare(ctx: ExecContext, a: number, b: number) {
  // a<b で SF=1、a==b で ZF=1
  ctx.setFlags({ OF: false, SF: a < b, ZF: a === b });
}

export const compareDefs: InstructionDef[] = [
  {
    opcode: CPA_ADR,
    mnemonic: 'CPA',
    exec: (c, i) =>
      compare(c, toSigned(c.getGR(asGR(i.r1))), toSigned(adrOperand(c, i))),
  },
  {
    opcode: CPA_REG,
    mnemonic: 'CPA',
    exec: (c, i) =>
      compare(c, toSigned(c.getGR(asGR(i.r1))), toSigned(regOperand(c, i))),
  },
  {
    opcode: CPL_ADR,
    mnemonic: 'CPL',
    exec: (c, i) =>
      compare(c, toUnsigned(c.getGR(asGR(i.r1))), toUnsigned(adrOperand(c, i))),
  },
  {
    opcode: CPL_REG,
    mnemonic: 'CPL',
    exec: (c, i) =>
      compare(c, toUnsigned(c.getGR(asGR(i.r1))), toUnsigned(regOperand(c, i))),
  },
];
