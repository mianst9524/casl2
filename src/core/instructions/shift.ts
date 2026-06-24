// SLA / SRA（算術）, SLL / SRL（論理）。シフト数は実効アドレス値。OF＝最後に押し出たビット。
import type { ExecContext, InstructionDef } from '../exec-context';
import type { DecodedInstruction } from '../decoder';
import { asGR, isZero, signBit, toSigned } from '../bits';
import { WORD_MASK } from '../types';
import { SLA, SLL, SRA, SRL } from '../opcodes';

function setShiftFlags(ctx: ExecContext, value: number, lastOut: number) {
  ctx.setFlags({ OF: lastOut !== 0, SF: signBit(value), ZF: isZero(value) });
}

function shiftCount(ctx: ExecContext, ins: DecodedInstruction): number {
  return ctx.effectiveAddress(ins.adr ?? 0, ins.r2);
}

export const shiftDefs: InstructionDef[] = [
  {
    opcode: SLL,
    mnemonic: 'SLL',
    exec(ctx, ins) {
      const r = asGR(ins.r1);
      const v = ctx.getGR(r);
      const n = shiftCount(ctx, ins);
      const value = n >= 16 ? 0 : (v << n) & WORD_MASK;
      const lastOut = n >= 1 && n <= 16 ? (v >> (16 - n)) & 1 : 0;
      ctx.setGR(r, value);
      setShiftFlags(ctx, value, lastOut);
    },
  },
  {
    opcode: SRL,
    mnemonic: 'SRL',
    exec(ctx, ins) {
      const r = asGR(ins.r1);
      const v = ctx.getGR(r);
      const n = shiftCount(ctx, ins);
      const value = n >= 16 ? 0 : (v >>> n) & WORD_MASK;
      const lastOut = n >= 1 && n <= 16 ? (v >> (n - 1)) & 1 : 0;
      ctx.setGR(r, value);
      setShiftFlags(ctx, value, lastOut);
    },
  },
  {
    opcode: SLA,
    mnemonic: 'SLA',
    exec(ctx, ins) {
      const r = asGR(ins.r1);
      const v = ctx.getGR(r);
      const n = shiftCount(ctx, ins);
      const sign = v & 0x8000;
      const lower = v & 0x7fff;
      const value = sign | (n >= 15 ? 0 : (lower << n) & 0x7fff);
      const lastOut = n >= 1 && n <= 15 ? (lower >> (15 - n)) & 1 : 0;
      ctx.setGR(r, value);
      setShiftFlags(ctx, value, lastOut);
    },
  },
  {
    opcode: SRA,
    mnemonic: 'SRA',
    exec(ctx, ins) {
      const r = asGR(ins.r1);
      const v = ctx.getGR(r);
      const n = shiftCount(ctx, ins);
      const s = toSigned(v);
      const value = (n >= 16 ? (s < 0 ? -1 : 0) : s >> n) & WORD_MASK;
      const lastOut = n >= 1 && n <= 16 ? (v >> (n - 1)) & 1 : 0;
      ctx.setGR(r, value);
      setShiftFlags(ctx, value, lastOut);
    },
  },
];
