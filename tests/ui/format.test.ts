import { describe, it, expect } from 'vitest';
import { decode } from '../../src/core';
import { formatDecoded } from '../../src/ui/lib/format';

function fmt(words: number[]): string {
  const read = (a: number) => words[a] ?? 0;
  return formatDecoded(decode(read, 0));
}

describe('formatDecoded', () => {
  it('r-r 形式', () => {
    expect(fmt([0x1412])).toBe('LD GR1,GR2'); // LD GR1,GR2
  });
  it('r-adr 形式', () => {
    expect(fmt([0x1210, 0x0005])).toBe('LAD GR1,#0005');
  });
  it('指標修飾あり', () => {
    expect(fmt([0x1012, 0x0005])).toBe('LD GR1,#0005,GR2'); // LD GR1,#5,GR2
  });
  it('adr-x 形式', () => {
    expect(fmt([0x6400, 0x0010])).toBe('JUMP #0010');
  });
  it('オペランドなし', () => {
    expect(fmt([0x8100])).toBe('RET');
  });
  it('未定義命令', () => {
    expect(fmt([0xff00])).toBe('(未定義命令)');
  });
});
