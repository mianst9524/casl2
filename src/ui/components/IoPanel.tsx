import { useMachine } from '../machine/MachineContext';
import { useMachineVersion } from '../machine/useMachineVersion';

export function IoPanel({
  input,
  onInputChange,
}: {
  input: string;
  onInputChange: (s: string) => void;
}) {
  const m = useMachine();
  useMachineVersion();
  const output = m.getOutput();
  return (
    <div className="panel io">
      <h2>入出力</h2>
      <label className="io-label">入力バッファ（IN が先頭から消費）</label>
      <textarea
        className="io-input mono"
        value={input}
        spellCheck={false}
        onChange={(e) => onInputChange(e.target.value)}
      />
      <label className="io-label">出力（OUT が追記）</label>
      <pre className="io-output mono">{output}</pre>
    </div>
  );
}
