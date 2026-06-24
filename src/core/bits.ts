// 16ビット/符号付き演算の単一情報源。符号付き⇔符号なしの扱いはすべてここに閉じ込める。
import { WORD_MASK, type GRIndex, type Word } from './types';

/** number を 16ビット語へ丸める（下位16ビット）。 */
export const toWord = (n: number): Word => n & WORD_MASK;

/** 語を符号なし 10進（0..65535）として解釈。 */
export const toUnsigned = (w: Word): number => w & WORD_MASK;

/** 語を 2 の補数の符号付き 10進（-32768..32767）として解釈。 */
export const toSigned = (w: Word): number => ((w & WORD_MASK) << 16) >> 16;

/** 符号付き 10進値を 16ビット語へ。 */
export const fromSigned = (n: number): Word => n & WORD_MASK;

export interface AddResult {
  value: Word;
  /** 符号なし加算の桁上げ（ADDL の OF 用）。 */
  carry: boolean;
  /** 符号付き加算の桁あふれ（ADDA の OF 用）。 */
  overflow: boolean;
}

export interface SubResult {
  value: Word;
  /** 符号なし減算の借り（SUBL の OF 用）。 */
  borrow: boolean;
  /** 符号付き減算の桁あふれ（SUBA の OF 用）。 */
  overflow: boolean;
}

/** 16ビット加算。符号なし桁上げと符号付き桁あふれを同時に算出（丸める前の値で判定）。 */
export function add16(a: Word, b: Word): AddResult {
  const ua = a & WORD_MASK;
  const ub = b & WORD_MASK;
  const sum = ua + ub;
  const value = sum & WORD_MASK;
  const carry = sum > WORD_MASK;
  const signedSum = toSigned(a) + toSigned(b);
  const overflow = signedSum < -32768 || signedSum > 32767;
  return { value, carry, overflow };
}

/** 16ビット減算 a - b。符号なし借りと符号付き桁あふれを同時に算出。 */
export function sub16(a: Word, b: Word): SubResult {
  const ua = a & WORD_MASK;
  const ub = b & WORD_MASK;
  const value = (ua - ub) & WORD_MASK;
  const borrow = ua < ub;
  const signedDiff = toSigned(a) - toSigned(b);
  const overflow = signedDiff < -32768 || signedDiff > 32767;
  return { value, borrow, overflow };
}

/** 結果語の符号ビット（SF）。 */
export const signBit = (w: Word): boolean => (w & 0x8000) !== 0;
/** 結果語がゼロか（ZF）。 */
export const isZero = (w: Word): boolean => (w & WORD_MASK) === 0;

/** GR 添字を 0..7 に収める（データを命令として実行した場合の安全策）。 */
export const clampGR = (n: number): number => n & 0x7;
/** 生のニブルを GRIndex（0..7）へ。 */
export const asGR = (n: number): GRIndex => (n & 0x7) as GRIndex;
