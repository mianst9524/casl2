import { useMachine } from '../machine/MachineContext';
import { useMachineVersion } from '../machine/useMachineVersion';
import type { MachineStatus, HaltReason } from '../../core';

const STATUS_LABEL: Record<MachineStatus, string> = {
  idle: '未ロード',
  loaded: 'ロード済',
  running: '実行中',
  paused: '停止中',
  halted: '終了',
  error: 'エラー',
};

const HALT_LABEL: Record<HaltReason, string> = {
  end: '正常終了 (RET)',
  'svc-exit': 'SVC 終了',
  'invalid-opcode': '未定義命令を実行（PR がデータ領域へ侵入）',
  'max-steps': 'ステップ上限',
  error: 'エラー',
};

export function ControlBar({ onRestart }: { onRestart: () => void }) {
  const m = useMachine();
  useMachineVersion();
  const status = m.getStatus();
  const halt = m.getHaltReason();
  const canBack = m.canStepBack();
  const runnable = status === 'loaded' || status === 'paused';

  return (
    <div className="controlbar">
      <button
        onClick={() => m.step()}
        disabled={!runnable}
        title="1 命令だけ進める（→ キー）"
        aria-keyshortcuts="ArrowRight"
      >
        ▶ ステップ
      </button>
      <button
        onClick={() => m.stepBack()}
        disabled={!canBack}
        title="1 ステップ戻す（← キー）"
        aria-keyshortcuts="ArrowLeft"
      >
        ◀ 逆実行
      </button>
      <button onClick={() => m.run(200000)} disabled={!runnable} title="停止まで連続実行">
        ⏩ 実行
      </button>
      <button onClick={onRestart} title="先頭から再ロード">
        ⟲ リセット
      </button>
      <button
        className="ext"
        onClick={() => m.fireInterrupt(0)}
        title="ハードウェア割り込みを発火（拡張機能）"
      >
        ⚡ 割り込み発火
      </button>
      <span className="status" aria-live="polite" role="status">
        状態: <b>{STATUS_LABEL[status]}</b>
        {status === 'halted' && halt ? `（${HALT_LABEL[halt]}）` : ''} ／ ステップ数:{' '}
        {m.getStepCount()}
      </span>
    </div>
  );
}
