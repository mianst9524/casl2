import { useMachine } from '../machine/MachineContext';
import { useMachineVersion } from '../machine/useMachineVersion';
import { toHex } from '../lib/radix';

/** スタックの可視化。高位番地が底、SP が現在の先頭。 */
export function StackView() {
  const m = useMachine();
  useMachineVersion();
  const { SP } = m.getRegisters();
  const top = SP;
  const bottom = Math.min(SP + 12, 0xffff);
  const rows: number[] = [];
  for (let a = top; a <= bottom; a++) rows.push(a);

  return (
    <div className="panel stack">
      <h2>スタック</h2>
      <div className="stack-note">SP={toHex(SP)}（高位番地が底、PUSH で下へ伸びる）</div>
      <div className="stack-list">
        {rows.map((a) => (
          <div key={a} className={'stack-row' + (a === SP ? ' sp' : '')}>
            <span className="marker">{a === SP ? 'SP▶' : ''}</span>
            <span className="addr mono">{toHex(a)}</span>
            <span className="word mono">{toHex(m.getWord(a))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
