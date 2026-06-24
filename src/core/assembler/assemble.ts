// 2パスアセンブラ本体。
import { PROGRAM_ORIGIN, SP_INIT, WORD_MASK, type Word } from '../types';
import { SVC_IN, SVC_OUT } from '../instructions';
import { ErrorCollector } from './errors';
import { tokenize, type RawLine } from './tokenizer';
import {
  MACRO,
  MNEMONICS,
  isRegister,
  registerIndex,
  type MnemInfo,
} from './mnemonics';
import type { AssembleResult, SourceMapEntry } from './types';

interface MachineInstr {
  mnemonic: string;
  operands: string[];
}

interface LinePlan {
  raw: RawLine;
  address: number;
  length: number;
  kind: SourceMapEntry['kind'];
  emit: (ctx: ResolveCtx) => Word[];
}

interface ResolveCtx {
  symbols: Map<string, number>;
  literalAddr: Map<string, number>;
  errors: ErrorCollector;
  line: number;
}

// --- 数値・文字列の解析 ---

/** #hex または 10進（負可）を数値へ。数値でなければ null。 */
function parseNumber(token: string): number | null {
  const t = token.trim();
  if (/^#[0-9a-fA-F]+$/.test(t)) return parseInt(t.slice(1), 16) & WORD_MASK;
  if (/^-?\d+$/.test(t)) return parseInt(t, 10) & WORD_MASK;
  return null;
}

/** 'ABC' 形式の文字列を語列へ。'' は単一引用符1個。文字列でなければ null。 */
function parseString(token: string): Word[] | null {
  const t = token.trim();
  if (t.length < 2 || t[0] !== "'" || t[t.length - 1] !== "'") return null;
  const inner = t.slice(1, -1).replace(/''/g, "'");
  return Array.from(inner, (ch) => ch.charCodeAt(0) & WORD_MASK);
}

/** リテラル '=...' の中身を語列に。 */
function parseLiteralValue(token: string): Word[] {
  const body = token.slice(1).trim();
  const s = parseString(body);
  if (s) return s;
  const n = parseNumber(body);
  if (n !== null) return [n];
  return [0];
}

/** アドレス/値オペランドを解決（label / 数値 / リテラル）。 */
function resolveValue(token: string, ctx: ResolveCtx): number {
  const t = token.trim();
  const n = parseNumber(t);
  if (n !== null) return n;
  if (t.startsWith('=')) {
    const a = ctx.literalAddr.get(t);
    if (a === undefined) {
      ctx.errors.error(ctx.line, `リテラルを解決できません: ${t}`);
      return 0;
    }
    return a;
  }
  const sym = ctx.symbols.get(t);
  if (sym === undefined) {
    ctx.errors.error(ctx.line, `未定義のラベル: ${t}`);
    return 0;
  }
  return sym;
}

function parseReg(token: string, ctx: ResolveCtx): number {
  if (!isRegister(token)) {
    ctx.errors.error(ctx.line, `レジスタが必要です: ${token}`);
    return 0;
  }
  return registerIndex(token);
}

// --- 命令の語長と符号化 ---

function machineLength(m: string, operands: string[]): number {
  const info = MNEMONICS[m];
  if (!info) return 0;
  switch (info.form) {
    case 'two':
      return operands.length >= 2 && isRegister(operands[1]) ? 1 : 2;
    case 'r-adr':
    case 'adr-x':
      return 2;
    case 'r':
    case 'none':
      return 1;
  }
}

function encodeMachine(m: string, operands: string[], ctx: ResolveCtx): Word[] {
  const info = MNEMONICS[m] as MnemInfo;
  const word1 = (op: number, r1 = 0, r2 = 0) =>
    ((op << 8) | ((r1 & 0xf) << 4) | (r2 & 0xf)) & WORD_MASK;
  switch (info.form) {
    case 'two': {
      const r1 = parseReg(operands[0] ?? '', ctx);
      if (operands.length >= 2 && isRegister(operands[1])) {
        const r2 = registerIndex(operands[1]);
        return [word1(info.opReg!, r1, r2)];
      }
      const adr = resolveValue(operands[1] ?? '0', ctx);
      const idx = operands[2] ? parseReg(operands[2], ctx) : 0;
      return [word1(info.opAdr!, r1, idx), adr];
    }
    case 'r-adr': {
      const r1 = parseReg(operands[0] ?? '', ctx);
      const adr = resolveValue(operands[1] ?? '0', ctx);
      const idx = operands[2] ? parseReg(operands[2], ctx) : 0;
      return [word1(info.opAdr!, r1, idx), adr];
    }
    case 'adr-x': {
      const adr = resolveValue(operands[0] ?? '0', ctx);
      const idx = operands[1] ? parseReg(operands[1], ctx) : 0;
      return [word1(info.opAdr!, 0, idx), adr];
    }
    case 'r': {
      const r1 = parseReg(operands[0] ?? '', ctx);
      return [word1(info.opAdr!, r1, 0)];
    }
    case 'none':
      return [word1(info.opAdr!, 0, 0)];
  }
}

// --- マクロ展開 ---

function expandMacro(m: string, operands: string[]): MachineInstr[] {
  switch (m) {
    case 'IN':
    case 'OUT': {
      const buf = operands[0] ?? '0';
      const len = operands[1] ?? '0';
      const svcNo = m === 'IN' ? String(SVC_IN) : String(SVC_OUT);
      return [
        { mnemonic: 'PUSH', operands: ['0', 'GR1'] },
        { mnemonic: 'PUSH', operands: ['0', 'GR2'] },
        { mnemonic: 'LAD', operands: ['GR1', buf] },
        { mnemonic: 'LAD', operands: ['GR2', len] },
        { mnemonic: 'SVC', operands: [svcNo] },
        { mnemonic: 'POP', operands: ['GR2'] },
        { mnemonic: 'POP', operands: ['GR1'] },
      ];
    }
    case 'RPUSH':
      return [1, 2, 3, 4, 5, 6, 7].map((n) => ({
        mnemonic: 'PUSH',
        operands: ['0', `GR${n}`],
      }));
    case 'RPOP':
      return [7, 6, 5, 4, 3, 2, 1].map((n) => ({
        mnemonic: 'POP',
        operands: [`GR${n}`],
      }));
    default:
      return [];
  }
}

// --- 本体 ---

export function assemble(source: string): AssembleResult {
  const errors = new ErrorCollector();
  const lines = tokenize(source);
  const symbols = new Map<string, number>();
  const plans: LinePlan[] = [];

  // リテラル収集
  const literalOrder: string[] = [];
  const literalWords = new Map<string, Word[]>();
  const literalAddr = new Map<string, number>();
  const collectLiteral = (token: string) => {
    const t = token.trim();
    if (t.startsWith('=') && !literalWords.has(t)) {
      literalOrder.push(t);
      literalWords.set(t, parseLiteralValue(t));
    }
  };

  let lc = PROGRAM_ORIGIN;
  let entryPoint = PROGRAM_ORIGIN;
  let entryLabel: string | undefined;
  let sawStart = false;

  // --- パス1：番地割付・ラベル解決・リテラル収集 ---
  for (const raw of lines) {
    if (raw.isEmpty) continue;
    const { mnemonic } = raw;

    if (raw.label && mnemonic !== 'START') {
      if (symbols.has(raw.label)) errors.error(raw.line, `ラベルの多重定義: ${raw.label}`);
      symbols.set(raw.label, lc);
    }

    if (!mnemonic) continue; // ラベルのみ

    if (mnemonic === 'START') {
      sawStart = true;
      if (raw.label) symbols.set(raw.label, lc);
      if (raw.operands[0]) entryLabel = raw.operands[0];
      else entryPoint = lc;
      continue;
    }
    if (mnemonic === 'END') {
      continue;
    }
    if (mnemonic === 'DS') {
      const n = parseNumber(raw.operands[0] ?? '0') ?? 0;
      const count = Math.max(0, n);
      const address = lc;
      plans.push({
        raw,
        address,
        length: count,
        kind: 'pseudo-ds',
        emit: () => new Array<Word>(count).fill(0),
      });
      lc += count;
      continue;
    }
    if (mnemonic === 'DC') {
      const ops = raw.operands;
      // 語長を算出
      const parts = ops.map((o) => {
        const s = parseString(o);
        if (s) return { kind: 'str' as const, words: s };
        return { kind: 'val' as const, token: o };
      });
      const length = parts.reduce(
        (sum, p) => sum + (p.kind === 'str' ? p.words.length : 1),
        0,
      );
      const address = lc;
      plans.push({
        raw,
        address,
        length,
        kind: 'pseudo-dc',
        emit: (ctx) => {
          const out: Word[] = [];
          for (const p of parts) {
            if (p.kind === 'str') out.push(...p.words);
            else out.push(resolveValue(p.token, ctx));
          }
          return out;
        },
      });
      lc += length;
      continue;
    }

    if (MACRO.has(mnemonic)) {
      const instrs = expandMacro(mnemonic, raw.operands);
      instrs.forEach((mi) => mi.operands.forEach(collectLiteral));
      const length = instrs.reduce((s, mi) => s + machineLength(mi.mnemonic, mi.operands), 0);
      const address = lc;
      plans.push({
        raw,
        address,
        length,
        kind: 'macro',
        emit: (ctx) => instrs.flatMap((mi) => encodeMachine(mi.mnemonic, mi.operands, ctx)),
      });
      lc += length;
      continue;
    }

    if (MNEMONICS[mnemonic]) {
      raw.operands.forEach(collectLiteral);
      const length = machineLength(mnemonic, raw.operands);
      const address = lc;
      plans.push({
        raw,
        address,
        length,
        kind: 'instruction',
        emit: (ctx) => encodeMachine(mnemonic, raw.operands, ctx),
      });
      lc += length;
      continue;
    }

    errors.error(raw.line, `未知の命令: ${mnemonic}`);
  }

  if (!sawStart) errors.warn(0, 'START 疑似命令がありません');

  // リテラルプールを末尾に配置
  for (const t of literalOrder) {
    literalAddr.set(t, lc);
    lc += literalWords.get(t)!.length;
  }

  // エントリポイント（START のオペランドラベル）
  if (entryLabel) {
    const a = symbols.get(entryLabel);
    if (a === undefined) errors.error(0, `START の実行開始ラベルが未定義: ${entryLabel}`);
    else entryPoint = a;
  }

  // --- パス2：コード生成・ソースマップ ---
  const totalLength = lc - PROGRAM_ORIGIN;
  const words: Word[] = new Array<Word>(totalLength).fill(0);
  const sourceMap: SourceMapEntry[] = [];

  for (const plan of plans) {
    const ctx: ResolveCtx = { symbols, literalAddr, errors, line: plan.raw.line };
    const emitted = plan.emit(ctx);
    for (let i = 0; i < emitted.length; i++) {
      words[plan.address - PROGRAM_ORIGIN + i] = emitted[i] & WORD_MASK;
    }
    if (plan.length > 0) {
      sourceMap.push({
        sourceLine: plan.raw.line,
        address: plan.address,
        words: emitted,
        label: plan.raw.label,
        text: plan.raw.text,
        kind: plan.kind,
      });
    }
  }

  // リテラルを配置
  for (const t of literalOrder) {
    const addr = literalAddr.get(t)!;
    const lw = literalWords.get(t)!;
    for (let i = 0; i < lw.length; i++) words[addr - PROGRAM_ORIGIN + i] = lw[i];
  }

  const symbolRecord: Record<string, number> = {};
  for (const [k, v] of symbols) symbolRecord[k] = v;

  if (errors.hasError) {
    return { ok: false, errors: errors.errors, symbols: symbolRecord };
  }

  return {
    ok: true,
    errors: errors.errors,
    image: { words, origin: PROGRAM_ORIGIN, entryPoint, spInit: SP_INIT },
    sourceMap,
    symbols: symbolRecord,
  };
}
