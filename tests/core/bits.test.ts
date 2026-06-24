import { describe, it, expect } from 'vitest';
import { add16, sub16, toSigned, toUnsigned, fromSigned } from '../../src/core/bits';

describe('符号変換', () => {
  it('toSigned は 2 の補数で解釈する', () => {
    expect(toSigned(0x0000)).toBe(0);
    expect(toSigned(0x7fff)).toBe(32767);
    expect(toSigned(0x8000)).toBe(-32768);
    expect(toSigned(0xffff)).toBe(-1);
  });
  it('toUnsigned は 0..65535', () => {
    expect(toUnsigned(0xffff)).toBe(65535);
    expect(toUnsigned(0x8000)).toBe(32768);
  });
  it('fromSigned は語へ丸める', () => {
    expect(fromSigned(-1)).toBe(0xffff);
    expect(fromSigned(-32768)).toBe(0x8000);
  });
});

describe('add16', () => {
  it('符号付き桁あふれ: 0x7FFF + 1', () => {
    const r = add16(0x7fff, 0x0001);
    expect(r.value).toBe(0x8000);
    expect(r.overflow).toBe(true);
    expect(r.carry).toBe(false);
  });
  it('符号なし桁上げ: 0xFFFF + 1', () => {
    const r = add16(0xffff, 0x0001);
    expect(r.value).toBe(0x0000);
    expect(r.carry).toBe(true);
    expect(r.overflow).toBe(false);
  });
});

describe('sub16', () => {
  it('符号なし借り: 0 - 1', () => {
    const r = sub16(0x0000, 0x0001);
    expect(r.value).toBe(0xffff);
    expect(r.borrow).toBe(true);
    expect(r.overflow).toBe(false);
  });
  it('符号付き桁あふれ: 0x8000 - 1', () => {
    const r = sub16(0x8000, 0x0001);
    expect(r.value).toBe(0x7fff);
    expect(r.overflow).toBe(true);
    expect(r.borrow).toBe(false);
  });
});
