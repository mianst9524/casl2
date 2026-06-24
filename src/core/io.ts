// 入出力：事前入力バッファ方式（grill 決定）。IN は先頭から消費、OUT は追記。
// 生の状態と素の操作のみを持つ。記録（IN_CURSOR / OUT_APPEND）は executor の Mutator が行う。
import type { Word } from './types';

/** 文字（コードポイント）→ 語。ASCII 上位互換（差し替え可能な単一箇所）。 */
export const charToWord = (ch: string): Word => ch.charCodeAt(0) & 0xffff;
/** 語 → 表示文字。非表示・範囲外は記号で代替。 */
export const wordToChar = (w: Word): string => {
  const c = w & 0xffff;
  if (c >= 0x20 && c <= 0x7e) return String.fromCharCode(c);
  return '·';
};

export const stringToWords = (s: string): Word[] =>
  Array.from(s, (ch) => charToWord(ch));
export const wordsToString = (words: Word[]): string =>
  words.map(wordToChar).join('');

/** EOF を表す入力文字長（COMET II 慣例の -1）。 */
export const EOF_LENGTH = 0xffff;

export class Io {
  /** 入力バッファ（語列）。改行は 0x0A。 */
  input: Word[] = [];
  /** 次に読む位置。 */
  cursor = 0;
  /** 出力バッファ（語列）。 */
  output: Word[] = [];

  /** 事前入力をまとめて設定。 */
  setInputText(text: string): void {
    this.input = stringToWords(text);
    this.cursor = 0;
  }

  setCursorRaw(n: number): void {
    this.cursor = n;
  }

  appendOutputRaw(words: Word[]): void {
    for (const w of words) this.output.push(w & 0xffff);
  }

  /** 末尾から count 語を取り除く（巻き戻し用）。 */
  truncateOutputRaw(count: number): void {
    this.output.length = Math.max(0, this.output.length - count);
  }

  reset(): void {
    this.cursor = 0;
    this.output = [];
  }

  atEof(): boolean {
    return this.cursor >= this.input.length;
  }

  outputString(): string {
    return wordsToString(this.output);
  }
}
