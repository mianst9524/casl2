import { describe, it, expect } from 'vitest';
import {
  toHex,
  toBin,
  toBinGrouped,
  toSignedStr,
  toUnsignedStr,
  toCharStr,
} from '../../src/ui/lib/radix';

describe('radix 変換', () => {
  it('toHex は # + 4桁大文字', () => {
    expect(toHex(0)).toBe('#0000');
    expect(toHex(15)).toBe('#000F');
    expect(toHex(0xabcd)).toBe('#ABCD');
  });
  it('toBin は16桁', () => {
    expect(toBin(0)).toBe('0000000000000000');
    expect(toBin(0xf0)).toBe('0000000011110000');
  });
  it('toBinGrouped は4桁区切り', () => {
    expect(toBinGrouped(0xf0)).toBe('0000 0000 1111 0000');
  });
  it('符号あり/なし10進', () => {
    expect(toUnsignedStr(0xffff)).toBe('65535');
    expect(toSignedStr(0xffff)).toBe('-1');
    expect(toSignedStr(0x8000)).toBe('-32768');
  });
  it('文字は表示可能のみ、それ以外は記号', () => {
    expect(toCharStr(0x41)).toBe('A');
    expect(toCharStr(0)).toBe('·');
  });
});
