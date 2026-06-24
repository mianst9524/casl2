// COMET II の基本型と定数。他のコアモジュールはここに依存する（このファイルは何にも依存しない）。

/** 16ビットの論理語。実体は number だが 0..65535 の範囲を保持する。 */
export type Word = number;
/** 主記憶の番地（0..65535）。 */
export type Address = number;
/** 汎用レジスタの番号（GR0〜GR7）。 */
export type GRIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const WORD_MASK = 0xffff;
/** 最上位ビット（符号ビット）。 */
export const MSB = 0x8000;
/** 主記憶の語数（65536）。 */
export const MEMORY_SIZE = 0x10000;
export const GR_COUNT = 8;
/** スタックポインタの初期値（高位番地）。PUSH で下方向へ伸びる。 */
export const SP_INIT = 0xffff;
/** プログラムのロード起点（低位番地）。 */
export const PROGRAM_ORIGIN = 0x0000;
/** 連続実行時の暴走を止める既定ステップ上限。 */
export const DEFAULT_MAX_STEPS = 1_000_000;
/**
 * 主プログラムの最終 RET が戻る番兵番地。ロード時にこの番地をスタックへ積み、
 * RET でここへ戻ったら正常終了とみなす。
 */
export const HALT_ADDR = 0xffff;

/** フラグレジスタ FR の3ビット。 */
export interface Flags {
  /** オーバーフロー */
  OF: boolean;
  /** サイン（結果の bit15） */
  SF: boolean;
  /** ゼロ */
  ZF: boolean;
}

export type MachineStatus =
  | 'idle'
  | 'loaded'
  | 'running'
  | 'paused'
  | 'halted'
  | 'error';

export type HaltReason =
  | 'end' // 主プログラムが正常終了（番兵へ RET）
  | 'svc-exit' // SVC による終了
  | 'invalid-opcode' // 未定義オペコードを実行（PR のデータ侵入など）
  | 'max-steps' // ステップ上限に到達
  | 'error';
