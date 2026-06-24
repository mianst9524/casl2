// レジスタ群：GR0〜GR7 / PR / SP / FR、および拡張の IE / IVR。
import {
  GR_COUNT,
  WORD_MASK,
  type Address,
  type Flags,
  type GRIndex,
  type Word,
} from './types';

export class RegisterFile {
  readonly GR: Word[] = new Array<Word>(GR_COUNT).fill(0);
  PR: Address = 0;
  SP: Address = 0;
  FR: Flags = { OF: false, SF: false, ZF: false };
  /** 割り込み許可フラグ（拡張・ADR-0002）。 */
  IE = false;
  /** 割り込みベクタレジスタ（拡張・ADR-0002）。 */
  IVR: Address = 0;

  getGR(i: GRIndex): Word {
    return this.GR[i];
  }

  setGRRaw(i: GRIndex, v: Word): void {
    this.GR[i] = v & WORD_MASK;
  }

  reset(): void {
    this.GR.fill(0);
    this.PR = 0;
    this.SP = 0;
    this.FR = { OF: false, SF: false, ZF: false };
    this.IE = false;
    this.IVR = 0;
  }

  snapshot(): {
    GR: Word[];
    PR: Address;
    SP: Address;
    FR: Flags;
    IE: boolean;
    IVR: Address;
  } {
    return {
      GR: [...this.GR],
      PR: this.PR,
      SP: this.SP,
      FR: { ...this.FR },
      IE: this.IE,
      IVR: this.IVR,
    };
  }
}
