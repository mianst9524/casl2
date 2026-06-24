// AND / OR / XOR。adr 形と r-r 形。論理演算は OF←0。
import type { ExecContext, InstructionDef } from '../exec-context';
import type { DecodedInstruction } from '../decoder';
import { asGR, isZero, signBit } from '../bits';
import { WORD_MASK } from '../types';
import {
  AND_ADR,
  AND_REG,
  OR_ADR,
  OR_REG,
  XOR_ADR,
  XOR_REG,
} from '../opcodes';

const adrOperand = (ctx: ExecContext, ins: DecodedInstruction): number =>
  ctx.readMem(ctx.effectiveAddress(ins.adr ?? 0, ins.r2));
const regOperand = (ctx: ExecContext, ins: DecodedInstruction): number =>
  ctx.getGR(asGR(ins.r2));

function apply(
  ctx: ExecContext,
  ins: DecodedInstruction,
  operand: number,
  op: (a: number, b: number) => number,
) {
  const r = asGR(ins.r1);
  const v = op(ctx.getGR(r), operand) & WORD_MASK;
  ctx.setGR(r, v);
  ctx.setFlags({ OF: false, SF: signBit(v), ZF: isZero(v) });
}

const and = (a: number, b: number) => a & b;
const or = (a: number, b: number) => a | b;
const xor = (a: number, b: number) => a ^ b;

export const logicDefs: InstructionDef[] = [
  { opcode: AND_ADR, mnemonic: 'AND', exec: (c, i) => apply(c, i, adrOperand(c, i), and) },
  { opcode: AND_REG, mnemonic: 'AND', exec: (c, i) => apply(c, i, regOperand(c, i), and) },
  { opcode: OR_ADR, mnemonic: 'OR', exec: (c, i) => apply(c, i, adrOperand(c, i), or) },
  { opcode: OR_REG, mnemonic: 'OR', exec: (c, i) => apply(c, i, regOperand(c, i), or) },
  { opcode: XOR_ADR, mnemonic: 'XOR', exec: (c, i) => apply(c, i, adrOperand(c, i), xor) },
  { opcode: XOR_REG, mnemonic: 'XOR', exec: (c, i) => apply(c, i, regOperand(c, i), xor) },
];
