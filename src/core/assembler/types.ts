import type { Address, Word } from '../types';
import type { AssemblyError } from './errors';

export interface SourceMapEntry {
  sourceLine: number;
  address: Address;
  words: Word[];
  label?: string;
  text: string;
  kind: 'instruction' | 'macro' | 'pseudo-dc' | 'pseudo-ds';
}

export interface AssembledImage {
  /** origin から連続する機械語イメージ。 */
  words: Word[];
  origin: Address;
  /** 実行開始番地。 */
  entryPoint: Address;
  /** スタックポインタ初期値。 */
  spInit: Address;
}

export interface AssembleResult {
  ok: boolean;
  errors: AssemblyError[];
  image?: AssembledImage;
  sourceMap?: SourceMapEntry[];
  symbols?: Record<string, Address>;
}
