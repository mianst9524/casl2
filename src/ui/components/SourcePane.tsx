import { useMachine } from '../machine/MachineContext';
import { useMachineVersion } from '../machine/useMachineVersion';
import { toHex } from '../lib/radix';
import { Casl2Editor } from './Casl2Editor';
import type { AssembleResult } from '../../core';

function AssemblyListing() {
  const m = useMachine();
  useMachineVersion();
  const sm = m.getSourceMap();
  const pr = m.getRegisters().PR;
  const currentLine = m.addressToSourceLine(pr);
  if (!sm) return null;
  return (
    <div className="listing" aria-label="アセンブル結果一覧">
      <div className="listing-row listing-head">
        <span className="lc">行</span>
        <span className="la">番地</span>
        <span className="lw">機械語</span>
        <span className="lt">ソース</span>
      </div>
      {sm.map((e) => (
        <div
          key={`${e.sourceLine}-${e.address}`}
          className={'listing-row' + (e.sourceLine === currentLine ? ' current' : '')}
        >
          <span className="lc">{e.sourceLine}</span>
          <span className="la mono">{toHex(e.address)}</span>
          <span className="lw mono">{e.words.map((w) => toHex(w).slice(1)).join(' ')}</span>
          <span className="lt mono">{e.text.trim()}</span>
        </div>
      ))}
    </div>
  );
}

export function SourcePane({
  source,
  onSourceChange,
  onAssemble,
  result,
  showListing,
}: {
  source: string;
  onSourceChange: (s: string) => void;
  onAssemble: () => void;
  result: AssembleResult | null;
  showListing: boolean;
}) {
  const m = useMachine();
  useMachineVersion();
  const currentLine = m.getSourceMap() ? m.addressToSourceLine(m.getRegisters().PR) : undefined;

  return (
    <div className="panel source">
      <div className="source-head">
        <h2>CASL2 ソース</h2>
        <button className="primary" onClick={onAssemble}>
          アセンブル＆ロード
        </button>
      </div>
      <Casl2Editor value={source} onChange={onSourceChange} currentLine={currentLine} />
      {result && result.errors.length > 0 && (
        <ul className="diagnostics" aria-label="アセンブル診断">
          {result.errors.map((d, i) => (
            <li key={i} className={d.severity}>
              {d.severity === 'error' ? '✕ ' : '⚠ '}
              {d.line > 0 ? `行 ${d.line}: ` : ''}
              {d.message}
            </li>
          ))}
        </ul>
      )}
      {showListing && result?.ok && <AssemblyListing />}
    </div>
  );
}
