import { useCallback, useEffect, useState } from 'react';
import { useMachine } from './ui/machine/MachineContext';
import { ControlBar } from './ui/components/ControlBar';
import { SourcePane } from './ui/components/SourcePane';
import { MemoryView } from './ui/components/MemoryView';
import { WordInspector } from './ui/components/WordInspector';
import { RegisterPanel } from './ui/components/RegisterPanel';
import { StackView } from './ui/components/StackView';
import { IoPanel } from './ui/components/IoPanel';
import { CCorrespondencePane } from './ui/components/CCorrespondencePane';
import { SAMPLES, type SamplePhase } from './ui/data/samples';
import type { AssembleResult } from './core';

type Level = 'easy' | 'normal' | 'all';

const LEVELS: { id: Level; label: string }[] = [
  { id: 'easy', label: 'やさしい' },
  { id: 'normal', label: 'ふつう' },
  { id: 'all', label: '全部見る' },
];

// ドロップダウンをフェーズごとに optgroup でまとめる。
const PHASE_LABELS: Record<SamplePhase, string> = {
  basic: 'フェーズ1：基礎（純粋な CASL2）',
  interlude: '幕間：COMET II の本質',
};
const PHASE_ORDER: SamplePhase[] = ['basic', 'interlude'];

export function App() {
  const m = useMachine();
  const [source, setSource] = useState(SAMPLES[0].source);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<AssembleResult | null>(null);
  const [selected, setSelected] = useState(0);
  const [level, setLevel] = useState<Level>('normal');
  const [sampleId, setSampleId] = useState(SAMPLES[0].id);

  const currentSample = SAMPLES.find((s) => s.id === sampleId) ?? SAMPLES[0];

  const showListing = level !== 'easy';
  const showStack = level !== 'easy';
  const showDock = level === 'all';

  const assembleAndLoad = useCallback(() => {
    const res = m.assembleAndLoad(source);
    m.setInput(input);
    setResult(res);
    if (res.ok && res.image) setSelected(res.image.entryPoint);
  }, [m, source, input]);

  const setInputAndApply = useCallback(
    (s: string) => {
      setInput(s);
      m.setInput(s);
    },
    [m],
  );

  const loadSample = useCallback((id: string) => {
    const s = SAMPLES.find((x) => x.id === id);
    if (!s) return;
    setSampleId(id);
    setSource(s.source);
    setInput(s.input ?? '');
    setResult(null);
  }, []);

  const loadCaslSource = useCallback(
    (src: string) => {
      setSource(src);
      const res = m.assembleAndLoad(src);
      m.setInput(input);
      setResult(res);
      if (res.ok && res.image) setSelected(res.image.entryPoint);
    },
    [m, input],
  );

  // キーボード操作（エディタ／入力欄にフォーカスがある時は無効）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable ||
          t.closest('.cm-editor'))
      ) {
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        m.step();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        m.stepBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [m]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>CASL2 学習シミュレーター</h1>
        <div className="sample-select">
          <label htmlFor="sample">レッスン：</label>
          <select id="sample" onChange={(e) => loadSample(e.target.value)} value={sampleId}>
            {PHASE_ORDER.map((phase) => (
              <optgroup key={phase} label={PHASE_LABELS[phase]}>
                {SAMPLES.filter((s) => s.phase === phase).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.lesson}. {s.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="sample-meta">
            <span className="sample-concept">新概念：{currentSample.concept}</span>
            {currentSample.watch && (
              <span className="sample-watch">見どころ：{currentSample.watch}</span>
            )}
          </p>
        </div>
        <div className="level-select" role="group" aria-label="表示モード">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              className={level === l.id ? 'active' : ''}
              aria-pressed={level === l.id}
              onClick={() => setLevel(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </header>

      <ControlBar onRestart={assembleAndLoad} />

      <main className="layout">
        <section className="col col-left">
          <SourcePane
            source={source}
            onSourceChange={setSource}
            onAssemble={assembleAndLoad}
            result={result}
            showListing={showListing}
          />
        </section>

        <section className="col col-center">
          <MemoryView selected={selected} onSelect={setSelected} />
          <WordInspector address={selected} />
        </section>

        <section className="col col-right">
          <RegisterPanel />
          {showStack && <StackView />}
          <IoPanel input={input} onInputChange={setInputAndApply} />
        </section>
      </main>

      {showDock && (
        <section className="dock">
          <CCorrespondencePane onLoad={loadCaslSource} />
        </section>
      )}
    </div>
  );
}
