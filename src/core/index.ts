// コアの公開エントリ。
export { Machine } from './machine';
export type { RegistersView, LastChanges, MachineEvent } from './machine';
export { Executor } from './executor';
export type { StepResult, RunResult } from './executor';
export { decode } from './decoder';
export type { DecodedInstruction } from './decoder';
export { assemble } from './assembler';
export type { AssembleResult, SourceMapEntry, AssemblyError } from './assembler';
export type { StepDelta, Change } from './journal';
export {
  charToWord,
  wordToChar,
  stringToWords,
  wordsToString,
} from './io';
export {
  OP_META,
  EXTENSION_OPCODES,
  mnemonicOf,
  isKnownOpcode,
} from './opcodes';
export {
  toSigned,
  toUnsigned,
} from './bits';
export type {
  Word,
  Address,
  GRIndex,
  Flags,
  MachineStatus,
  HaltReason,
} from './types';
export {
  WORD_MASK,
  MEMORY_SIZE,
  SP_INIT,
  PROGRAM_ORIGIN,
  HALT_ADDR,
} from './types';
