// DecodedInstruction を表示文字列へ整形する。
import { OP_META, type DecodedInstruction } from '../../core';

const hex = (w: number): string => '#' + (w & 0xffff).toString(16).toUpperCase().padStart(4, '0');

export function formatDecoded(d: DecodedInstruction): string {
  if (!d.known) return '(未定義命令)';
  const meta = OP_META[d.opcode];
  const r1 = d.r1 & 7;
  const r2 = d.r2 & 7;
  const idx = r2 !== 0 ? `,GR${r2}` : '';
  switch (meta.format) {
    case 'none':
      return d.mnemonic;
    case 'r':
      return `${d.mnemonic} GR${r1}`;
    case 'r-r':
      return `${d.mnemonic} GR${r1},GR${r2}`;
    case 'r-adr':
      return `${d.mnemonic} GR${r1},${hex(d.adr ?? 0)}${idx}`;
    case 'adr-x':
      return `${d.mnemonic} ${hex(d.adr ?? 0)}${idx}`;
    default:
      return d.mnemonic;
  }
}
