import { useState } from 'react';
import { CCORR_EXAMPLES, type CCorrespondenceExample } from '../data/ccorr';

const PALETTE = ['#50fa7b', '#8be9fd', '#ffb86c', '#bd93f9', '#ff79c6', '#f1fa8c'];

function regionColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

function CodeColumn({
  title,
  lines,
  lineRegion,
  colorOf,
  hovered,
  onHover,
}: {
  title: string;
  lines: string[];
  lineRegion: Map<number, string>;
  colorOf: (regionId: string) => string;
  hovered: string | null;
  onHover: (id: string | null) => void;
}) {
  return (
    <div className="ccorr-col">
      <div className="ccorr-coltitle">{title}</div>
      <pre className="ccorr-code mono">
        {lines.map((ln, i) => {
          const lineNo = i + 1;
          const rid = lineRegion.get(lineNo);
          const isHot = rid && hovered === rid;
          const style = rid
            ? {
                background: isHot ? colorOf(rid) + '55' : colorOf(rid) + '1f',
                borderLeft: `3px solid ${colorOf(rid)}`,
              }
            : { borderLeft: '3px solid transparent' };
          return (
            <div
              key={lineNo}
              className="ccorr-line"
              style={style}
              onMouseEnter={() => rid && onHover(rid)}
              onMouseLeave={() => onHover(null)}
            >
              {ln === '' ? ' ' : ln}
            </div>
          );
        })}
      </pre>
    </div>
  );
}

function Example({
  ex,
  onLoad,
}: {
  ex: CCorrespondenceExample;
  onLoad: (src: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const colorMap = new Map<string, string>();
  ex.regions.forEach((r, i) => colorMap.set(r.id, regionColor(i)));
  const colorOf = (id: string) => colorMap.get(id) ?? '#888';

  const cLineRegion = new Map<number, string>();
  const caslLineRegion = new Map<number, string>();
  for (const r of ex.regions) {
    for (let l = r.c[0]; l <= r.c[1]; l++) if (!cLineRegion.has(l)) cLineRegion.set(l, r.id);
    for (let l = r.casl[0]; l <= r.casl[1]; l++)
      if (!caslLineRegion.has(l)) caslLineRegion.set(l, r.id);
  }

  return (
    <div className="ccorr-example">
      <div className="ccorr-ex-head">
        <h3>{ex.title}</h3>
        <span className="ccorr-desc">{ex.description}</span>
        {ex.loadableSource && (
          <button onClick={() => onLoad(ex.loadableSource!)}>この CASL2 を読み込む</button>
        )}
      </div>
      <div className="ccorr-cols">
        <CodeColumn
          title="C 言語"
          lines={ex.cLines}
          lineRegion={cLineRegion}
          colorOf={colorOf}
          hovered={hovered}
          onHover={setHovered}
        />
        <CodeColumn
          title="CASL2 / COMET II"
          lines={ex.caslLines}
          lineRegion={caslLineRegion}
          colorOf={colorOf}
          hovered={hovered}
          onHover={setHovered}
        />
      </div>
      <ul className="ccorr-regions">
        {ex.regions.map((r) => (
          <li
            key={r.id}
            style={{ borderLeft: `4px solid ${colorOf(r.id)}` }}
            className={hovered === r.id ? 'hot' : undefined}
            onMouseEnter={() => setHovered(r.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <b>{r.label}</b>
            {r.note ? ` — ${r.note}` : ''}
          </li>
        ))}
      </ul>
      {ex.note && <p className="ccorr-note">※ {ex.note}</p>}
    </div>
  );
}

export function CCorrespondencePane({ onLoad }: { onLoad: (src: string) => void }) {
  const [activeId, setActiveId] = useState(CCORR_EXAMPLES[0].id);
  const active = CCORR_EXAMPLES.find((e) => e.id === activeId)!;
  return (
    <div className="panel ccorr">
      <div className="ccorr-head">
        <h2>C 言語との対応</h2>
        <div className="ccorr-tabs">
          {CCORR_EXAMPLES.map((e) => (
            <button
              key={e.id}
              className={e.id === activeId ? 'active' : ''}
              onClick={() => setActiveId(e.id)}
            >
              {e.title}
            </button>
          ))}
        </div>
      </div>
      <Example ex={active} onLoad={onLoad} />
    </div>
  );
}
