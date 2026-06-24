// LD / ST / LAD
import type { InstructionDef } from '../exec-context';
import { asGR, isZero, signBit } from '../bits';
import { LD_ADR, LD_REG, ST, LAD } from '../opcodes';

export const transferDefs: InstructionDef[] = [
  {
    opcode: LD_ADR,
    mnemonic: 'LD',
    exec(ctx, ins) {
      const ea = ctx.effectiveAddress(ins.adr ?? 0, ins.r2);
      const v = ctx.readMem(ea);
      ctx.setGR(asGR(ins.r1), v);
      ctx.setFlags({ OF: false, SF: signBit(v), ZF: isZero(v) });
    },
  },
  {
    opcode: LD_REG,
    mnemonic: 'LD',
    exec(ctx, ins) {
      const v = ctx.getGR(asGR(ins.r2));
      ctx.setGR(asGR(ins.r1), v);
      ctx.setFlags({ OF: false, SF: signBit(v), ZF: isZero(v) });
    },
  },
  {
    opcode: ST,
    mnemonic: 'ST',
    exec(ctx, ins) {
      const ea = ctx.effectiveAddress(ins.adr ?? 0, ins.r2);
      ctx.writeMem(ea, ctx.getGR(asGR(ins.r1)));
      // ST はフラグ不変
    },
  },
  {
    opcode: LAD,
    mnemonic: 'LAD',
    exec(ctx, ins) {
      const ea = ctx.effectiveAddress(ins.adr ?? 0, ins.r2);
      ctx.setGR(asGR(ins.r1), ea);
      // LAD はフラグ不変
    },
  },
];
