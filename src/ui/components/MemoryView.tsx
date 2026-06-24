import { useMemo, useRef } from 'react';
import { FixedSizeList, type ListChildComponentProps } from 'react-window';
import { useMachine } from '../machine/MachineContext';
import { useMachineVersion } from '../machine/useMachineVersion';
import { toHex } from '../lib/radix';
import { formatDecoded } from '../lib/format';
import { wordToChar, type Machine, MEMORY_SIZE } from '../../core';

type Role = 'code' | 'data' | 'stack' | 'free';

interface RowData {
  m: Machine;
  roleMap: Map<number, Role>;
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
  const { m, roleMap, pr, sp, selected, changed, onSelect } = data;
  const value = m.getWord(index);
  let role: Role = roleMap.get(index) ?? 'free';
  if (role === 'free' && index >= sp) role = 'stack';
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
      ? formatDecoded(m.decodeAt(index))
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

  const roleMap = useMemo(() => {
    const map = new Map<number, Role>();
    const sm = m.getSourceMap();
    if (sm) {
      for (const e of sm) {
        const role: Role = e.kind === 'pseudo-dc' || e.kind === 'pseudo-ds' ? 'data' : 'code';
        for (let i = 0; i < e.words.length; i++) map.set(e.address + i, role);
      }
    }
    return map;
    // sourceMap はロード時のみ変わる。version で十分。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, m.getVersion()]);

  const data: RowData = {
    m,
    roleMap,
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
