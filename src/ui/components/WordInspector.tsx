import { useMachine } from '../machine/MachineContext';
import { useMachineVersion } from '../machine/useMachineVersion';
import { radixViews } from '../lib/radix';
import { formatDecoded } from '../lib/format';
import { toHex } from '../lib/radix';

/** 多重解釈ビュー：同じ 16 ビットを複数の顔で同時に見せる（命令＝データの土台）。 */
export function WordInspector({ address }: { address: number }) {
  const m = useMachine();
  useMachineVersion();
  const value = m.getWord(address);
  const decoded = m.decodeAt(address);
  const v = radixViews(value);

  return (
    <div className="panel inspector">
      <h2>語の多重解釈</h2>
      <div className="insp-addr">
        番地 <span className="mono">{toHex(address)}</span> の 1 語を、複数の解釈で表示
      </div>
      <table className="insp-table">
        <tbody>
          <tr>
            <th>命令として</th>
            <td className="mono big">{formatDecoded(decoded)}</td>
          </tr>
          <tr>
            <th>16進</th>
            <td className="mono">{v.hex}</td>
          </tr>
          <tr>
            <th>2進</th>
            <td className="mono">{v.bin}</td>
          </tr>
          <tr>
            <th>符号なし10進</th>
            <td className="mono">{v.unsigned}</td>
          </tr>
          <tr>
            <th>符号あり10進</th>
            <td className="mono">{v.signed}</td>
          </tr>
          <tr>
            <th>文字</th>
            <td className="mono">'{v.char}'</td>
          </tr>
        </tbody>
      </table>
      <p className="insp-note">
        同じ 1 語が、PR に指されれば命令、参照されればデータ。違いはメモリの中には無い。
      </p>
    </div>
  );
}
