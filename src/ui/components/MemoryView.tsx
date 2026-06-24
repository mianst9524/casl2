import { useMemo, useRef } from 'react';
import { FixedSizeList, type ListChildComponentProps } from 'react-window';
import { useMachine } from '../machine/MachineContext';
import { useMachineVersion } from '../machine/useMachineVersion';
import { toHex } from '../lib/radix';
import { formatDecoded } from '../lib/format';
import { decode, wordToChar, type Machine, MEMORY_SIZE } from '../../core';

type Role = 'code' | 'data' | 'stack' | 'free';

interface RowData {
  m: Machine;
  roleMap: Map<number, Role>;
  /** 2語命令のオペランド語（命令の2語目）。単独デコードしない。 */
  operandWords: Set<number>;
  pr: number;
  sp: number;
  selected: number;
  changed: Set<number>;
  onSelect: (a: number) => void;
}

const ROLE_LABEL: Record<Role, string> = {
  code: '命令',
  data: 'データ',
  stack: 'スタック',
  free: '空き',
};

function Row({ index, style, data }: ListChildComponentProps<RowData>) {
  const { m, roleMap, operandWords, pr, sp, selected, changed, onSelect } = data;
  const value = m.getWord(index);
  let role: Role = roleMap.get(index) ?? 'free';
  if (role === 'free' && index >= sp) role = 'stack';
  const isOperand = role === 'code' && operandWords.has(index);
  const isPR = index === pr;
  const isSP = index === sp;
  const cls = [
    'memrow',
    `role-${role}`,
    isPR ? 'pr' : '',
    index === selected ? 'selected' : '',
    changed.has(index) ? 'changed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const interp =
    role === 'code'
      ? isOperand
        ? `↳ オペランド ${value}`
        : formatDecoded(m.decodeAt(index))
      : `${value} '${wordToChar(value)}'`;

  return (
    <div className={cls} style={style} onClick={() => onSelect(index)}>
      <span className="marker">{isPR ? '▶' : isSP ? 'SP' : ''}</span>
      <span className="addr mono">{toHex(index)}</span>
      <span className="word mono">{toHex(value)}</span>
      <span className={`rolelabel role-${role}`}>{ROLE_LABEL[role]}</span>
      <span className="interp mono">{interp}</span>
    </div>
  );
}

export function MemoryView({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (a: number) => void;
}) {
  const m = useMachine();
  useMachineVersion();
  const listRef = useRef<FixedSizeList>(null);
  const r = m.getRegisters();
  const ch = m.getLastChanges();

  const { roleMap, operandWords } = useMemo(() => {
    const map = new Map<number, Role>();
    const operands = new Set<number>();
    const sm = m.getSourceMap();
    if (sm) {
      for (const e of sm) {
        const role: Role = e.kind === 'pseudo-dc' || e.kind === 'pseudo-ds' ? 'data' : 'code';
        for (let i = 0; i < e.words.length; i++) map.set(e.address + i, role);
        if (role !== 'code') continue;
        // 命令境界を再構築し、2語命令の2語目（オペランド語）を記録する。
        // マクロ展開で複数命令が連なる行にも対応するため語長で歩く。
        let off = 0;
        while (off < e.words.length) {
          const d = decode((a) => e.words[a - e.address] ?? 0, e.address + off);
          if (d.wordLength === 2 && off + 1 < e.words.length) operands.add(e.address + off + 1);
          off += d.wordLength;
        }
      }
    }
    return { roleMap: map, operandWords: operands };
    // sourceMap はロード時のみ変わる。version で十分。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, m.getVersion()]);

  const data: RowData = {
    m,
    roleMap,
    operandWords,
    pr: r.PR,
    sp: r.SP,
    selected,
    changed: ch.addresses,
    onSelect,
  };

  return (
    <div className="panel memory">
      <div className="memory-head">
        <h2>メモリ（1 本のフラットな語配列）</h2>
        <div className="memory-tools">
          <button onClick={() => listRef.current?.scrollToItem(r.PR, 'center')}>
            PR へ追従
          </button>
          <button onClick={() => listRef.current?.scrollToItem(r.SP, 'center')}>
            SP へ
          </button>
        </div>
      </div>
      <div className="legend">
        <span className="role-code">命令</span>
        <span className="role-data">データ</span>
        <span className="role-stack">スタック</span>
        <span className="note">※ 色分けは人間向けの注釈。ハードに区画は無い。</span>
      </div>
      <FixedSizeList
        ref={listRef}
        height={420}
        itemCount={MEMORY_SIZE}
        itemSize={22}
        width="100%"
        itemData={data}
        className="memlist"
      >
        {Row}
      </FixedSizeList>
    </div>
  );
}
