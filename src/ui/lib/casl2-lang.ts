// CASL2 の簡易シンタックスハイライトと、実行中行のハイライト拡張。
import { StreamLanguage, type StringStream } from '@codemirror/language';
import {
  StateEffect,
  StateField,
  type Extension,
  type Range,
} from '@codemirror/state';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';

const MACHINE = new Set([
  'LD', 'ST', 'LAD', 'ADDA', 'SUBA', 'ADDL', 'SUBL', 'AND', 'OR', 'XOR',
  'CPA', 'CPL', 'SLA', 'SRA', 'SLL', 'SRL', 'JMI', 'JNZ', 'JZE', 'JUMP',
  'JPL', 'JOV', 'PUSH', 'POP', 'CALL', 'RET', 'SVC', 'NOP',
]);
const EXTENSION = new Set(['RETI', 'EI', 'DI', 'SIV']);
const PSEUDO = new Set(['START', 'END', 'DS', 'DC']);
const MACRO = new Set(['IN', 'OUT', 'RPUSH', 'RPOP']);

/** CASL2 用 StreamLanguage。トークン名は one-dark テーマが着色する。 */
export const casl2Language = StreamLanguage.define({
  token(stream: StringStream): string | null {
    if (stream.eatSpace()) return null;
    if (stream.match(/;.*/)) return 'comment';
    if (stream.match(/'(?:[^']|'')*'/)) return 'string';
    if (stream.match(/#[0-9A-Fa-f]+/)) return 'number';
    if (stream.match(/-?\d+/)) return 'number';
    if (stream.match(/=[^,\s]+/)) return 'atom'; // リテラル
    if (stream.match(/\bGR[0-7]\b/)) return 'variableName';
    const m = stream.match(/[A-Za-z_][A-Za-z0-9_]*/) as RegExpMatchArray | null;
    if (m) {
      const word = m[0].toUpperCase();
      if (MACHINE.has(word) || PSEUDO.has(word) || MACRO.has(word)) return 'keyword';
      if (EXTENSION.has(word)) return 'tagName'; // 拡張命令は別色
      return 'variableName'; // ラベル
    }
    stream.next();
    return null;
  },
});

/** 実行中行（PR の行）をハイライトする拡張。 */
export const setExecLine = StateEffect.define<number | null>();

const execLineDeco = Decoration.line({ class: 'cm-exec-line' });

export const execLineField: StateField<DecorationSet> = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setExecLine)) {
        const ln = e.value;
        if (ln == null || ln < 1 || ln > tr.state.doc.lines) return Decoration.none;
        const line = tr.state.doc.line(ln);
        const ranges: Range<Decoration>[] = [execLineDeco.range(line.from)];
        return Decoration.set(ranges);
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export const casl2Extensions: Extension[] = [casl2Language, execLineField];
