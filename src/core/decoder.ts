// メモリ語を命令としてデコードする。副作用なし・キャッシュなし（ADR-0001）。
import { WORD_MASK, type Address, type Word } from './types';
import { OP_META, mnemonicOf, wordLengthOf } from './opcodes';

export interface DecodedInstruction {
  /** この命令の先頭番地。 */
  pr: Address;
  opcode: number;
  mnemonic: string;
  /** 第1語 bits 4-7（r1 または r）。0..15 の生値。 */
  r1: number;
  /** 第1語 bits 0-3（r2 または指標レジスタ XR）。0..15 の生値。 */
  r2: number;
  wordLength: 1 | 2;
  /** 2語命令の第2語（生の adr）。1語命令では undefined。 */
  adr?: Word;
  /** 表示・整合用の生の語列。 */
  raw: Word[];
  /** 既知のオペコードか（未知なら実行時に invalid-opcode で停止）。 */
  known: boolean;
}

/** memory[pr] から1命令をデコードする。memory は読み取りのみ。 */
export function decode(read: (a: Address) => Word, pr: Address): DecodedInstruction {
  const w1 = read(pr) & WORD_MASK;
  const opcode = w1 >> 8;
  const r1 = (w1 >> 4) & 0xf;
  const r2 = w1 & 0xf;
  const known = opcode in OP_META;
  const wordLength = wordLengthOf(opcode);
  const raw: Word[] = [w1];
  let adr: Word | undefined;
  if (wordLength === 2) {
    adr = read((pr + 1) & WORD_MASK) & WORD_MASK;
    raw.push(adr);
  }
  return {
    pr,
    opcode,
    mnemonic: mnemonicOf(opcode),
    r1,
    r2,
    wordLength,
    adr,
    raw,
    known,
  };
}
