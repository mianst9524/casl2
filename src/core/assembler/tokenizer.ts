// CASL2 ソースを行単位のトークンへ分解する。
// 行書式： [ラベル] <命令> [オペランド,...] [; コメント]
// ラベルは行頭（非空白始まり）の最初のフィールド。先頭が空白ならラベル無し。
export interface RawLine {
  line: number; // 1 起点の行番号
  text: string; // 元の行（コメント込み）
  label?: string;
  mnemonic?: string; // 大文字化済み
  operands: string[]; // 生のオペランド文字列（trim 済み）
  isEmpty: boolean; // 空行 or コメントのみ
}

/** コメント（; 以降）を取り除く。単一引用符内の ; は無視。 */
function stripComment(s: string): string {
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "'") {
      // '' は文字列内のエスケープ
      if (inStr && s[i + 1] === "'") {
        i++;
        continue;
      }
      inStr = !inStr;
    } else if (c === ';' && !inStr) {
      return s.slice(0, i);
    }
  }
  return s;
}

/** カンマでオペランドを分割。単一引用符内のカンマは無視。 */
function splitOperands(s: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "'") {
      if (inStr && s[i + 1] === "'") {
        cur += "''";
        i++;
        continue;
      }
      inStr = !inStr;
      cur += c;
    } else if (c === ',' && !inStr) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  if (cur.trim().length > 0 || out.length > 0) out.push(cur.trim());
  return out.filter((x, i) => !(x === '' && i === out.length - 1 && out.length === 1));
}

export function tokenizeLine(text: string, line: number): RawLine {
  const code = stripComment(text);
  if (code.trim() === '') {
    return { line, text, operands: [], isEmpty: true };
  }
  const startsWithSpace = /^\s/.test(code);
  let rest = code;
  let label: string | undefined;
  if (!startsWithSpace) {
    const m = code.match(/^(\S+)(.*)$/);
    if (m) {
      label = m[1];
      rest = m[2];
    }
  }
  rest = rest.trim();
  if (rest === '') {
    // ラベルのみの行
    return { line, text, label, operands: [], isEmpty: false };
  }
  const m2 = rest.match(/^(\S+)(.*)$/);
  const mnemonic = m2 ? m2[1].toUpperCase() : undefined;
  const operandStr = m2 ? m2[2].trim() : '';
  const operands = operandStr === '' ? [] : splitOperands(operandStr);
  return { line, text, label, mnemonic, operands, isEmpty: false };
}

export function tokenize(source: string): RawLine[] {
  return source.split(/\r?\n/).map((text, i) => tokenizeLine(text, i + 1));
}
