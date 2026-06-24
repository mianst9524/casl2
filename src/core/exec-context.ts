// 命令実装へ渡す実行コンテキスト。状態の書き込みはすべてここ経由＝MutationSink に集約される
// （ADR-0003）。命令実装は生のメモリ/レジスタ配列に触れない。
import type { Address, Flags, GRIndex, HaltReason, Word } from './types';
import type { DecodedInstruction } from './decoder';

export interface ExecIo {
  /** 入力バッファから1行読む（改行まで）。EOF なら null。カーソル前進を記録する。 */
  readLine(maxLen: number): Word[] | null;
  /** 出力バッファへ語列を追記する（記録する）。 */
  write(words: Word[]): void;
}

export interface ExecContext {
  // 読み取り（副作用なし）
  getGR(i: GRIndex): Word;
  getPR(): Address;
  getSP(): Address;
  getFlags(): Flags;
  getIE(): boolean;
  getIVR(): Address;
  readMem(a: Address): Word;
  /** 実効アドレス = (adr + (xr≠0 ? GR[xr] : 0)) & 0xFFFF */
  effectiveAddress(adr: Word, xr: number): Address;

  // 書き込み（すべて記録される）
  setGR(i: GRIndex, v: Word): void;
  setPR(a: Address): void;
  setSP(a: Address): void;
  setFlags(f: Flags): void;
  setIE(v: boolean): void;
  setIVR(a: Address): void;
  writeMem(a: Address, v: Word): void;

  // スタック補助（記録される）
  push(v: Word): void; // SP←SP-1; mem[SP]←v
  pop(): Word; // v←mem[SP]; SP←SP+1

  io: ExecIo;
  halt(reason: HaltReason): void;
}

export interface InstructionDef {
  opcode: number;
  mnemonic: string;
  exec(ctx: ExecContext, ins: DecodedInstruction): void;
}
