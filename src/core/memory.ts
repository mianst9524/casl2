// 主記憶：65536語のフラットな配列（CONTEXT.md「主記憶」）。
import { MEMORY_SIZE, WORD_MASK, type Address, type Word } from './types';

export class Memory {
  readonly words = new Uint16Array(MEMORY_SIZE);

  get(a: Address): Word {
    return this.words[a & WORD_MASK];
  }

  /** 記録を伴わない生の書き込み（ロード・巻き戻し用）。Uint16Array が 16ビットへ丸める。 */
  setRaw(a: Address, v: Word): void {
    this.words[a & WORD_MASK] = v;
  }

  clear(): void {
    this.words.fill(0);
  }
}
