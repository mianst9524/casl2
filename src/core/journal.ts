// ステップ差分の記録（ADR-0003）。逆実行と変更ハイライトの土台。
import type { Address, Flags, GRIndex, Word } from './types';

export type Change =
  | { kind: 'GR'; index: GRIndex; old: Word; neu: Word }
  | { kind: 'PR'; old: Address; neu: Address }
  | { kind: 'SP'; old: Address; neu: Address }
  | { kind: 'FR'; old: Flags; neu: Flags }
  | { kind: 'IE'; old: boolean; neu: boolean }
  | { kind: 'IVR'; old: Address; neu: Address }
  | { kind: 'MEM'; address: Address; old: Word; neu: Word }
  | { kind: 'IN_CURSOR'; old: number; neu: number }
  | { kind: 'OUT_APPEND'; words: Word[] }
  | { kind: 'INT_CONSUME'; no: number };

export type StepKind = 'instruction' | 'interrupt-entry';

export interface StepDelta {
  /** 0 起点のステップ番号。 */
  index: number;
  /** このステップ開始時の PR（表示用）。 */
  prBefore: Address;
  kind: StepKind;
  /** 起きた順に並ぶ変更。巻き戻しは末尾から old を適用する。 */
  changes: Change[];
  /** 表示用ニーモニック（割り込み entry では undefined）。 */
  decodedMnemonic?: string;
}

/** ステップ差分の履歴。直近からの巻き戻しを支える。 */
export class Journal {
  private deltas: StepDelta[] = [];
  private limit = Infinity;

  push(delta: StepDelta): void {
    this.deltas.push(delta);
    if (this.deltas.length > this.limit) {
      this.deltas.shift();
    }
  }

  /** 直近の差分を取り出して履歴から除く（stepBack 用）。 */
  popLast(): StepDelta | undefined {
    return this.deltas.pop();
  }

  /** 直近の差分を覗く（変更ハイライト用。除去しない）。 */
  last(): StepDelta | undefined {
    return this.deltas[this.deltas.length - 1];
  }

  size(): number {
    return this.deltas.length;
  }

  canStepBack(): boolean {
    return this.deltas.length > 0;
  }

  clear(): void {
    this.deltas = [];
  }

  setLimit(n: number): void {
    this.limit = n;
  }
}
