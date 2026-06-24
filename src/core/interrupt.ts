// ハードウェア割り込み拡張の状態（ADR-0002）。発火は保留キューへ積むだけ。
export class InterruptController {
  /** 保留中の割り込み番号（FIFO）。 */
  pending: number[] = [];

  /** 外部イベント（UI ボタン等）からの発火。実際の退避は次の命令完了後。 */
  fire(no = 0): void {
    this.pending.push(no);
  }

  hasPending(): boolean {
    return this.pending.length > 0;
  }

  reset(): void {
    this.pending = [];
  }
}

/** FR(OF/SF/ZF) を退避用の1語へパック。 */
export const packFR = (fr: { OF: boolean; SF: boolean; ZF: boolean }): number =>
  (fr.OF ? 0b100 : 0) | (fr.SF ? 0b010 : 0) | (fr.ZF ? 0b001 : 0);

/** 退避語から FR を復元。 */
export const unpackFR = (w: number): { OF: boolean; SF: boolean; ZF: boolean } => ({
  OF: (w & 0b100) !== 0,
  SF: (w & 0b010) !== 0,
  ZF: (w & 0b001) !== 0,
});
