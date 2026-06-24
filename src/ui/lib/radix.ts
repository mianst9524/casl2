// 1 語を各基数・文字へ変換する純関数（4基数表示の単一情報源）。
import { toSigned, toUnsigned, wordToChar, type Word } from '../../core';

export const toHex = (w: Word): string =>
  '#' + (w & 0xffff).toString(16).toUpperCase().padStart(4, '0');

export const toBin = (w: Word): string =>
  (w & 0xffff).toString(2).padStart(16, '0');

/** 2進を4ビット区切りで表示。 */
export const toBinGrouped = (w: Word): string =>
  (toBin(w).match(/.{4}/g) ?? []).join(' ');

export const toUnsignedStr = (w: Word): string => String(toUnsigned(w));
export const toSignedStr = (w: Word): string => String(toSigned(w));
export const toCharStr = (w: Word): string => wordToChar(w);

export interface RadixViews {
  hex: string;
  bin: string;
  unsigned: string;
  signed: string;
  char: string;
}

export function radixViews(w: Word): RadixViews {
  return {
    hex: toHex(w),
    bin: toBinGrouped(w),
    unsigned: toUnsignedStr(w),
    signed: toSignedStr(w),
    char: toCharStr(w),
  };
}
