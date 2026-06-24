// オペコードのメタ情報（ニーモニック・語長・オペランド形）の単一情報源。
// 実行関数は持たない純データ。decoder と instructions の双方が参照する（循環回避）。

export type InstrFormat =
  | 'r-adr' // r1, adr, x（2語）
  | 'r-r' // r1, r2（1語）
  | 'adr-x' // adr, x（2語。PUSH/分岐/CALL/SVC/SIV）
  | 'r' // r1 のみ（1語。POP）
  | 'none'; // オペランドなし（1語。NOP/RET/RETI/EI/DI）

export interface OpMeta {
  mnemonic: string;
  wordLength: 1 | 2;
  format: InstrFormat;
}

// 標準命令
export const NOP = 0x00;
export const LD_ADR = 0x10;
export const ST = 0x11;
export const LAD = 0x12;
export const LD_REG = 0x14;
export const ADDA_ADR = 0x20;
export const SUBA_ADR = 0x21;
export const ADDL_ADR = 0x22;
export const SUBL_ADR = 0x23;
export const ADDA_REG = 0x24;
export const SUBA_REG = 0x25;
export const ADDL_REG = 0x26;
export const SUBL_REG = 0x27;
export const AND_ADR = 0x30;
export const OR_ADR = 0x31;
export const XOR_ADR = 0x32;
export const AND_REG = 0x34;
export const OR_REG = 0x35;
export const XOR_REG = 0x36;
export const CPA_ADR = 0x40;
export const CPL_ADR = 0x41;
export const CPA_REG = 0x44;
export const CPL_REG = 0x45;
export const SLA = 0x50;
export const SRA = 0x51;
export const SLL = 0x52;
export const SRL = 0x53;
export const JMI = 0x61;
export const JNZ = 0x62;
export const JZE = 0x63;
export const JUMP = 0x64;
export const JPL = 0x65;
export const JOV = 0x66;
export const PUSH = 0x70;
export const POP = 0x71;
export const CALL = 0x80;
export const RET = 0x81;
export const SVC = 0xf0;

// 拡張命令（ハードウェア割り込み。ADR-0002）
export const RETI = 0x82;
export const EI = 0x83;
export const DI = 0x84;
export const SIV = 0x85;

export const OP_META: Record<number, OpMeta> = {
  [NOP]: { mnemonic: 'NOP', wordLength: 1, format: 'none' },
  [LD_ADR]: { mnemonic: 'LD', wordLength: 2, format: 'r-adr' },
  [ST]: { mnemonic: 'ST', wordLength: 2, format: 'r-adr' },
  [LAD]: { mnemonic: 'LAD', wordLength: 2, format: 'r-adr' },
  [LD_REG]: { mnemonic: 'LD', wordLength: 1, format: 'r-r' },
  [ADDA_ADR]: { mnemonic: 'ADDA', wordLength: 2, format: 'r-adr' },
  [SUBA_ADR]: { mnemonic: 'SUBA', wordLength: 2, format: 'r-adr' },
  [ADDL_ADR]: { mnemonic: 'ADDL', wordLength: 2, format: 'r-adr' },
  [SUBL_ADR]: { mnemonic: 'SUBL', wordLength: 2, format: 'r-adr' },
  [ADDA_REG]: { mnemonic: 'ADDA', wordLength: 1, format: 'r-r' },
  [SUBA_REG]: { mnemonic: 'SUBA', wordLength: 1, format: 'r-r' },
  [ADDL_REG]: { mnemonic: 'ADDL', wordLength: 1, format: 'r-r' },
  [SUBL_REG]: { mnemonic: 'SUBL', wordLength: 1, format: 'r-r' },
  [AND_ADR]: { mnemonic: 'AND', wordLength: 2, format: 'r-adr' },
  [OR_ADR]: { mnemonic: 'OR', wordLength: 2, format: 'r-adr' },
  [XOR_ADR]: { mnemonic: 'XOR', wordLength: 2, format: 'r-adr' },
  [AND_REG]: { mnemonic: 'AND', wordLength: 1, format: 'r-r' },
  [OR_REG]: { mnemonic: 'OR', wordLength: 1, format: 'r-r' },
  [XOR_REG]: { mnemonic: 'XOR', wordLength: 1, format: 'r-r' },
  [CPA_ADR]: { mnemonic: 'CPA', wordLength: 2, format: 'r-adr' },
  [CPL_ADR]: { mnemonic: 'CPL', wordLength: 2, format: 'r-adr' },
  [CPA_REG]: { mnemonic: 'CPA', wordLength: 1, format: 'r-r' },
  [CPL_REG]: { mnemonic: 'CPL', wordLength: 1, format: 'r-r' },
  [SLA]: { mnemonic: 'SLA', wordLength: 2, format: 'r-adr' },
  [SRA]: { mnemonic: 'SRA', wordLength: 2, format: 'r-adr' },
  [SLL]: { mnemonic: 'SLL', wordLength: 2, format: 'r-adr' },
  [SRL]: { mnemonic: 'SRL', wordLength: 2, format: 'r-adr' },
  [JMI]: { mnemonic: 'JMI', wordLength: 2, format: 'adr-x' },
  [JNZ]: { mnemonic: 'JNZ', wordLength: 2, format: 'adr-x' },
  [JZE]: { mnemonic: 'JZE', wordLength: 2, format: 'adr-x' },
  [JUMP]: { mnemonic: 'JUMP', wordLength: 2, format: 'adr-x' },
  [JPL]: { mnemonic: 'JPL', wordLength: 2, format: 'adr-x' },
  [JOV]: { mnemonic: 'JOV', wordLength: 2, format: 'adr-x' },
  [PUSH]: { mnemonic: 'PUSH', wordLength: 2, format: 'adr-x' },
  [POP]: { mnemonic: 'POP', wordLength: 1, format: 'r' },
  [CALL]: { mnemonic: 'CALL', wordLength: 2, format: 'adr-x' },
  [RET]: { mnemonic: 'RET', wordLength: 1, format: 'none' },
  [SVC]: { mnemonic: 'SVC', wordLength: 2, format: 'adr-x' },
  [RETI]: { mnemonic: 'RETI', wordLength: 1, format: 'none' },
  [EI]: { mnemonic: 'EI', wordLength: 1, format: 'none' },
  [DI]: { mnemonic: 'DI', wordLength: 1, format: 'none' },
  [SIV]: { mnemonic: 'SIV', wordLength: 2, format: 'adr-x' },
};

/** 拡張命令（標準 JIS X 0205 外）のオペコード集合。UI で「拡張」表示に使う。 */
export const EXTENSION_OPCODES: ReadonlySet<number> = new Set([RETI, EI, DI, SIV]);

export const isKnownOpcode = (op: number): boolean => op in OP_META;
export const wordLengthOf = (op: number): 1 | 2 => OP_META[op]?.wordLength ?? 1;
export const mnemonicOf = (op: number): string => OP_META[op]?.mnemonic ?? '???';
