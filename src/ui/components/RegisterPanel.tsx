import { useMachine } from '../machine/MachineContext';
import { useMachineVersion } from '../machine/useMachineVersion';
import { toHex, toBinGrouped, toUnsignedStr, toSignedStr } from '../lib/radix';
import type { Word } from '../../core';

function RegisterRow({
  name,
  value,
  changed,
}: {
  name: string;
  value: Word;
  changed: boolean;
}) {
  return (
    <tr className={changed ? 'changed' : undefined}>
      <th>{name}</th>
      <td className="mono">{toHex(value)}</td>
      <td className="mono bin">{toBinGrouped(value)}</td>
      <td className="mono num">{toUnsignedStr(value)}</td>
      <td className="mono num">{toSignedStr(value)}</td>
    </tr>
  );
}

export function RegisterPanel() {
  const m = useMachine();
  useMachineVersion();
  const r = m.getRegisters();
  const ch = m.getLastChanges();

  return (
    <div className="panel">
      <h2>レジスタ</h2>
      <table className="regtable">
        <thead>
          <tr>
            <th>名前</th>
            <th>16進</th>
            <th>2進</th>
            <th>符号なし</th>
            <th>符号あり</th>
          </tr>
        </thead>
        <tbody>
          {r.GR.map((v, i) => (
            <RegisterRow key={i} name={`GR${i}`} value={v} changed={ch.gr.has(i)} />
          ))}
          <RegisterRow name="PR" value={r.PR} changed={ch.pr} />
          <RegisterRow name="SP" value={r.SP} changed={ch.sp} />
        </tbody>
      </table>

      <div className={'flags' + (ch.fr ? ' changed' : '')}>
        <span>FR:</span>
        <span className={'flag' + (r.FR.OF ? ' on' : '')}>OF={r.FR.OF ? 1 : 0}</span>
        <span className={'flag' + (r.FR.SF ? ' on' : '')}>SF={r.FR.SF ? 1 : 0}</span>
        <span className={'flag' + (r.FR.ZF ? ' on' : '')}>ZF={r.FR.ZF ? 1 : 0}</span>
      </div>

      <div className="ext-state">
        <span className="ext-badge">拡張</span>
        <span className={ch.ie ? 'changed' : undefined}>IE={r.IE ? 1 : 0}</span>
        <span className={'mono ' + (ch.ivr ? 'changed' : '')}>IVR={toHex(r.IVR)}</span>
      </div>
    </div>
  );
}
