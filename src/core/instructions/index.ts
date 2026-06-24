// 全命令定義を集約し、オペコード → InstructionDef の表を作る。
import type { InstructionDef } from '../exec-context';
import { transferDefs } from './transfer';
import { arithmeticDefs } from './arithmetic';
import { logicDefs } from './logic';
import { compareDefs } from './compare';
import { shiftDefs } from './shift';
import { branchDefs } from './branch';
import { stackDefs } from './stack';
import { systemDefs } from './system';

const ALL_DEFS: InstructionDef[] = [
  ...transferDefs,
  ...arithmeticDefs,
  ...logicDefs,
  ...compareDefs,
  ...shiftDefs,
  ...branchDefs,
  ...stackDefs,
  ...systemDefs,
];

export const OPCODE_TABLE: ReadonlyMap<number, InstructionDef> = new Map(
  ALL_DEFS.map((d) => [d.opcode, d]),
);

export { SVC_EXIT, SVC_IN, SVC_OUT, MAX_IN_LEN } from './system';
