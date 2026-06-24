// ADDA / SUBA（符号付き）, ADDL / SUBL（符号なし）。adr 形と r-r 形。
import type { ExecContext, InstructionDef } from '../exec-context';
import type { DecodedInstruction } from '../decoder';
import { add16, asGR, isZero, signBit, sub16 } from '../bits';
import {
  ADDA_ADR,
  ADDA_REG,
  ADDL_ADR,
  ADDL_REG,
  SUBA_ADR,
  SUBA_REG,
  SUBL_ADR,
  SUBL_REG,
} from '../opcodes';

const adrOperand = (ctx: ExecContext, ins: DecodedInstruction): number =>
  ctx.readMem(ctx.effectiveAddress(ins.adr ?? 0, ins.r2));
const regOperand = (ctx: ExecContext, ins: DecodedInstruction): number =>
  ctx.getGR(asGR(ins.r2));

function doAdda(ctx: ExecContext, ins: DecodedInstruction, operand: number) {
  const r = asGR(ins.r1);
  const res = add16(ctx.getGR(r), operand);
  ctx.setGR(r, res.value);
  ctx.setFlags({ OF: res.overflow, SF: signBit(res.value), ZF: isZero(res.value) });
}
function doAddl(ctx: ExecContext, ins: DecodedInstruction, operand: number) {
  const r = asGR(ins.r1);
  const res = add16(ctx.getGR(r), operand);
  ctx.setGR(r, res.value);
  ctx.setFlags({ OF: res.carry, SF: signBit(res.value), ZF: isZero(res.value) });
}
function doSuba(ctx: ExecContext, ins: DecodedInstruction, operand: number) {
  const r = asGR(ins.r1);
  const res = sub16(ctx.getGR(r), operand);
  ctx.setGR(r, res.value);
  ctx.setFlags({ OF: res.overflow, SF: signBit(res.value), ZF: isZero(res.value) });
}
function doSubl(ctx: ExecContext, ins: DecodedInstruction, operand: number) {
  const r = asGR(ins.r1);
  const res = sub16(ctx.getGR(r), operand);
  ctx.setGR(r, res.value);
  ctx.setFlags({ OF: res.borrow, SF: signBit(res.value), ZF: isZero(res.value) });
}

export const arithmeticDefs: InstructionDef[] = [
  { opcode: ADDA_ADR, mnemonic: 'ADDA', exec: (c, i) => doAdda(c, i, adrOperand(c, i)) },
  { opcode: ADDA_REG, mnemonic: 'ADDA', exec: (c, i) => doAdda(c, i, regOperand(c, i)) },
  { opcode: ADDL_ADR, mnemonic: 'ADDL', exec: (c, i) => doAddl(c, i, adrOperand(c, i)) },
  { opcode: ADDL_REG, mnemonic: 'ADDL', exec: (c, i) => doAddl(c, i, regOperand(c, i)) },
  { opcode: SUBA_ADR, mnemonic: 'SUBA', exec: (c, i) => doSuba(c, i, adrOperand(c, i)) },
  { opcode: SUBA_REG, mnemonic: 'SUBA', exec: (c, i) => doSuba(c, i, regOperand(c, i)) },
  { opcode: SUBL_ADR, mnemonic: 'SUBL', exec: (c, i) => doSubl(c, i, adrOperand(c, i)) },
  { opcode: SUBL_REG, mnemonic: 'SUBL', exec: (c, i) => doSubl(c, i, regOperand(c, i)) },
];
