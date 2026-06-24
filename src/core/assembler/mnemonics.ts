// ニーモニック → オペコード/オペランド形の表。
import * as op from '../opcodes';

export type Form =
  | 'two' // r-r と r-adr の両形（オペランド2がレジスタなら r-r）
  | 'r-adr' // r, adr, x（2語固定）
  | 'adr-x' // adr, x（2語）
  | 'r' // r（1語）
  | 'none'; // オペランドなし（1語）

export interface MnemInfo {
  form: Form;
  /** two: r-adr 形オペコード / 単形: そのオペコード */
  opAdr?: number;
  /** two: r-r 形オペコード */
  opReg?: number;
}

export const MNEMONICS: Record<string, MnemInfo> = {
  LD: { form: 'two', opAdr: op.LD_ADR, opReg: op.LD_REG },
  ST: { form: 'r-adr', opAdr: op.ST },
  LAD: { form: 'r-adr', opAdr: op.LAD },
  ADDA: { form: 'two', opAdr: op.ADDA_ADR, opReg: op.ADDA_REG },
  SUBA: { form: 'two', opAdr: op.SUBA_ADR, opReg: op.SUBA_REG },
  ADDL: { form: 'two', opAdr: op.ADDL_ADR, opReg: op.ADDL_REG },
  SUBL: { form: 'two', opAdr: op.SUBL_ADR, opReg: op.SUBL_REG },
  AND: { form: 'two', opAdr: op.AND_ADR, opReg: op.AND_REG },
  OR: { form: 'two', opAdr: op.OR_ADR, opReg: op.OR_REG },
  XOR: { form: 'two', opAdr: op.XOR_ADR, opReg: op.XOR_REG },
  CPA: { form: 'two', opAdr: op.CPA_ADR, opReg: op.CPA_REG },
  CPL: { form: 'two', opAdr: op.CPL_ADR, opReg: op.CPL_REG },
  SLA: { form: 'r-adr', opAdr: op.SLA },
  SRA: { form: 'r-adr', opAdr: op.SRA },
  SLL: { form: 'r-adr', opAdr: op.SLL },
  SRL: { form: 'r-adr', opAdr: op.SRL },
  JMI: { form: 'adr-x', opAdr: op.JMI },
  JNZ: { form: 'adr-x', opAdr: op.JNZ },
  JZE: { form: 'adr-x', opAdr: op.JZE },
  JUMP: { form: 'adr-x', opAdr: op.JUMP },
  JPL: { form: 'adr-x', opAdr: op.JPL },
  JOV: { form: 'adr-x', opAdr: op.JOV },
  PUSH: { form: 'adr-x', opAdr: op.PUSH },
  POP: { form: 'r', opAdr: op.POP },
  CALL: { form: 'adr-x', opAdr: op.CALL },
  RET: { form: 'none', opAdr: op.RET },
  SVC: { form: 'adr-x', opAdr: op.SVC },
  NOP: { form: 'none', opAdr: op.NOP },
  // 拡張命令（ADR-0002）
  RETI: { form: 'none', opAdr: op.RETI },
  EI: { form: 'none', opAdr: op.EI },
  DI: { form: 'none', opAdr: op.DI },
  SIV: { form: 'adr-x', opAdr: op.SIV },
};

export const PSEUDO = new Set(['START', 'END', 'DS', 'DC']);
export const MACRO = new Set(['IN', 'OUT', 'RPUSH', 'RPOP']);

export const isRegister = (token: string): boolean => /^GR[0-7]$/i.test(token.trim());
export const registerIndex = (token: string): number =>
  parseInt(token.trim().slice(2), 10);
