# CASL2 学習シミュレーター 実装設計書

CASL2 で書いたプログラムをアセンブルし、COMET II 仮想計算機上での実行を可視化する Web 学習ツールの実装設計。`/grill-with-docs` で確定した判断（[`CONTEXT.md`](../CONTEXT.md)、[ADR-0001](./adr/0001-live-memory-execution.md)〜[0003](./adr/0003-step-delta-journal.md)）を技術設計へ翻訳したもの。

## 1. 目的とスコープ

主目的は試験対策ではなく、低レイヤの仕組みを「腹落ち」させること。特に：

1. **ノイマン型** ＝「命令もデータも同じ16ビットのメモリ語でしかない」
2. **C 言語との対応**

| 領域 | 決定 | 根拠 |
|---|---|---|
| 対象 | 仕組み理解重視（JIS X 0205 とは互換） | CONTEXT.md |
| 実行 | 生メモリを毎ステップ解釈。事前 IR なし | ADR-0001 |
| 割り込み | JIS を超えるハードウェア割り込み拡張（標準/拡張を明示） | ADR-0002 |
| 巻き戻し | ステップ差分ジャーナル（全状態スナップショット不採用） | ADR-0003 |
| 命令セット | JIS 標準フルセット＋割り込み拡張 | grill |
| メモリ | フラットな語配列＋役割の色分けラベル。ヒープは設けない | CONTEXT.md |
| I/O | 事前入力バッファ方式 | grill |
| C 対応 | キュレーション対訳例（自動コンパイラは残課題） | grill |

## 2. アーキテクチャ

```
src/core/   純 TypeScript・UI 非依存。アセンブラ＋COMET II＋ジャーナル
src/ui/     React。コアを useSyncExternalStore で購読し描画するだけ
```

**設計の背骨＝「状態の書き込み口を1つに集約する」**（`MutationSink`）。レジスタ・フラグ・メモリ・SP・PR・IE のあらゆる変更はこの単一インターフェースを経由し、自動的に `StepDelta`（旧値→新値）へ記録される。命令実装は生配列に触れない（型で強制）。これにより自己書き換え・PR のデータ侵入・割り込み退避・逆実行・変更ハイライトがすべて一つの仕組みで整合する。

## 3. コアエンジン（src/core）

### 3.1 モジュール構成
```
types.ts  bits.ts  flags.ts  memory.ts  registers.ts
mutation.ts   MutationSink / JournalingSink / NullSink
journal.ts    StepDelta・Journal・巻き戻し
decoder.ts    decode(memory,pr)：副作用なし・キャッシュなし
executor.ts   step：fetch→decode→exec→（命令後）割り込みチェック
instructions/{transfer,arithmetic,logic,compare,shift,branch,stack,system}.ts + index.ts(opcode表)
io.ts         事前入力バッファ・出力バッファ
interrupt.ts  IE・IVR・保留キュー・退避/復帰
assembler/{tokenizer,parser,symbols,macros,codegen,sourcemap,layout,errors,index}.ts
machine.ts    公開ファサード
events.ts     pub/sub（UI 非依存）
index.ts      公開エントリ
```

### 3.2 主要型
- `Word = number`（0..65535 の論理16ビット語）。`Address = number`。`GRIndex = 0..7`。
- メモリは **`Uint16Array(65536)`**。16ビット境界をハードで強制。中間計算は number で行い、格納前に `& 0xFFFF`。OF 判定は丸め前のキャリー/符号で行う（`bits.ts` の `add16`/`sub16` が `{value,carry,overflow}` を返す）。
- `Flags { OF, SF, ZF }`。レジスタ `GR[8], PR, SP, FR, IE, IVR`（IE/IVR は拡張）。
- `Change` = `{kind:'GR',index,old,neu}` | PR | SP | FR | IE | `{kind:'MEM',address,old,neu}` | `{kind:'IN_CURSOR',old,neu}` | `{kind:'OUT_APPEND',words}` | `{kind:'INT_CONSUME',no}`。`neu`（new は予約語回避）。
- `StepDelta { index, prBefore, changes: Change[], kind:'instruction'|'interrupt-entry', decodedMnemonic? }`。
- `ExecContext`: 命令実装へ渡す。読み取り（`getGR/getPR/getSP/getFlags/getIE/readMem/effectiveAddress`）＋書き込み（`setGR/setPR/setSP/setFlags/setIE/setIVR/writeMem`＝すべて MutationSink 経由）＋`io`・`halt`。
- `AssembleResult { ok, errors[], image?{words,origin,entryPoint,spInit}, sourceMap?, symbols? }`。
- `SourceMapEntry { sourceLine, address, words[], label?, text, kind:'instruction'|'macro'|'pseudo-dc'|'pseudo-ds' }`。
- `DecodedInstruction { pr, opcode, mnemonic, r1, r2, wordLength:1|2, adr?, raw }`。

### 3.3 命令セット（オペコード16進）
```
NOP 00 / LD 10(r,adr,x),14(r1,r2) / ST 11 / LAD 12
ADDA 20/24  SUBA 21/25  ADDL 22/26  SUBL 23/27
AND 30/34  OR 31/35  XOR 32/36 / CPA 40/44  CPL 41/45
SLA 50  SRA 51  SLL 52  SRL 53
JMI 61  JNZ 62  JZE 63  JUMP 64  JPL 65  JOV 66
PUSH 70  POP 71  CALL 80  RET 81  SVC F0
拡張: RETI 82  EI 83  DI 84  SIV 85
```
- 同一ニーモニックでもオペランド形（r-adr=2語 / r-r=1語）でオペコードを選ぶ解決表を `instructions/index.ts` に持つ。
- 実効アドレス `EA = (adr + (r2≠0 ? GR[r2] : 0)) & 0xFFFF`。

### 3.4 フラグ規則（`flags.ts` に純関数で集約）
- `ADDA/SUBA`：符号付き。OF＝符号付き桁あふれ。SF＝bit15、ZF＝結果0。
- `ADDL/SUBL`：符号なし。OF＝キャリー/ボロー。SF/ZF は結果ビット。
- `AND/OR/XOR`：OF←0、SF/ZF 設定。
- `CPA`（符号付き）/`CPL`（符号なし）：< で SF=1、= で ZF=1、OF←0。GR 不変。
- `SLA/SRA`（算術）/`SLL/SRL`（論理）：OF＝最後に押し出たビット、SF/ZF 設定。SRA は符号ビット保持、SLA は符号ビット不変で下位をシフト。
- `LD`：SF/ZF 更新・OF←0。`ST`/`LAD`：フラグ不変。

### 3.5 実行ループ（executor.ts）
1. 新 `StepDelta`（`kind:'instruction'`, `prBefore=PR`）を開始し JournalingSink を向ける。
2. `decoded = decode(memory, PR)`（毎回 live メモリから。**デコード結果は保持しない**）。
3. `PR ← PR + wordLength`（setPR 経由）。
4. `def = table[opcode]`。未定義なら `halt('invalid-opcode')`（＝PR データ侵入の教材表現）。
5. `def.exec(ctx, decoded)`。状態変更はすべて ctx 経由 → delta に蓄積。
6. delta を push。`stepCount++`。
7. **命令完了後**に割り込みチェック（§3.7）。発火時は別 `interrupt-entry` delta を push。
- `run()` は `maxSteps`（既定 1e6）と breakpoint で区切り、ブラウザを固めない（rAF 駆動は UI 側）。

### 3.6 ジャーナルと逆実行（ADR-0003）
- `MutationSink`：`recordGR/recordPR/recordSP/recordFR/recordIE/recordMem/...`。`memory.write(a,v,sink)` 等が旧値を読んでから書き、sink に記録。命令実装は ExecContext 経由で呼ぶだけ（記録漏れの余地なし）。
- `stepBack()`：直近 delta の `changes` を**末尾から** `old` で書き戻す（巻き戻し自体は記録しない）。自己書き換え命令語も復元 → 次 step は復元後メモリを再デコードし完全一貫。
- 不変条件：任意状態で `step()→stepBack()` 後、メモリ全語・全レジスタ・FR・IE・SP・PR・I/O カーソル・出力が完全一致。

### 3.7 割り込み拡張（ADR-0002・確定メカニズム）
- 状態：`IE`（1ビット）、`IVR`（ベクタレジスタ）、保留キュー `pending:number[]`。
- 設定命令：`EI`(IE←1) / `DI`(IE←0) / `SIV adr,x`(IVR←EA) / `RETI`(復帰)。
- 発火：`fireInterrupt(n)` は `pending.push(n)` のみ。
- 発生（IE=1・命令後、別 delta）：`SP-1; mem[SP]←packFR(FR)`, `SP-1; mem[SP]←PR`, `IE←0`, `PR←IVR`。消費番号を `INT_CONSUME` で記録。
- `RETI`：`PR←pop; FR←unpackFR(pop); IE←1`。標準 `RET` は PR のみ復帰で不変。
- 退避フォーマット：OF/SF/ZF を 1 語へ（IE は含めない）。多重ネスト非対応。

### 3.8 I/O（事前入力バッファ）
- `setInput(text)` で入力バッファを語列化。`IN` は先頭から消費（カーソル前進を `IN_CURSOR` で記録）、`OUT` は出力バッファへ追記（`OUT_APPEND` で記録）。
- `IN/OUT` はマクロ展開で `SVC` へ落とし、SVC 実行が `io.readInputChars/writeOutputChars` を駆動。「マクロ＝機械命令列がメモリに並ぶ」を保ちつつ I/O をコアに集約。

### 3.9 アセンブラ
- 2パス：パス1＝番地割付・ラベル解決・リテラル収集、パス2＝コード生成＋ソースマップ。
- 疑似命令 `START [entry]`/`END`/`DS n`/`DC`（10進・`#`16進・文字列`'...'`・複数オペランド）。
- マクロ `IN`/`OUT`/`RPUSH`(PUSH GR1..GR7)/`RPOP`(POP GR7..GR1)。リテラル `=`。
- レイアウト：origin=0 から連続配置、`SP_INIT=0xFFFF`、`PR=entryPoint`。エラーは継続収集（最初の1件で止めない）。

### 3.10 公開ファサード（machine.ts）
`assemble / load / assembleAndLoad / reset / step / stepBack / run / pause / fireInterrupt / setInput / getOutput / getState / getLastDelta / getChangedRegisters / getChangedAddresses / getSourceMap / addressToSourceLine / decodeWord / subscribe`。コアは同期・決定的。

## 4. React UI（src/ui）

### 4.1 レイアウト（デスクトップ優先、3帯＋上下バー）
- 上：**ControlBar**（step / stepBack / run / pause / reset / 速度 / 割り込み発火）。
- 左：SourceEditor ＋ AssemblyListing（3列対応）。
- 中央（核心）：**MemoryGrid（仮想化）＋ WordInspector（多重解釈）**。
- 右：RegisterPanel(4基数) ＋ FlagsView ＋ ExtendedStateView(IE/IVR=拡張) ＋ StackView ＋ IoPanel。
- 下ドック（タブ）：CCorrespondencePane / DemoLauncher / Help。
- **学習モードプリセット**（やさしい / ふつう / 全部見る）で初期可視性を制御。狭幅はタブ縮退。

### 4.2 状態管理（コア直結）
- **`useSyncExternalStore` でコアを直接購読**（Zustand 不要＝二重管理回避）。`src/ui/machine/` にアダプタ層（MachineContext / useMachine / `useMachineSelector(selector,isEqual)` / useStepDelta）。
- **番地/レジスタ単位のセレクタ購読**＋コアの `version` 番号で、1語変化時に該当セルのみ再描画。
- 変更ハイライトは最新 `StepDelta` の変化集合から導出、CSS keyframes でフラッシュ（JS タイマー状態を持たない）。色相を「レジスタ/メモリ/PR/拡張」で分け因果を追える。run 中は差分配布を間引き rAF でまとめ描画。

### 4.3 性能・主要部品
- メモリ65536行は **react-window(FixedSizeList)** で仮想化。`MemoryCell` は `React.memo`＋番地単位購読。
- **WordInspector**：選択語を「命令デコード(コアの decodeWord 再利用)/符号付10進/符号なし10進/文字/2進」を同時表示。2進はオペコード/レジスタ/番地フィールドを色分け下線。2語命令は次語も併記。役割ラベルに「人間向け注釈」の注記。
- **RegisterCell**：16進/2進/符号なし10進/符号あり10進を純関数変換（`src/ui/lib/radix.ts`）。
- **AssemblyListing**：ソース行↔機械語(16進)↔番地の連動ハイライト（実行中行/PR/該当語）。
- **SourceEditor**：CodeMirror 6（行番号・CASL2簡易ハイライト=3分類を色分け・アセンブルエラー波線）。
- **CCorrespondencePane**：対訳例スキーマ（C行/CASL2行/領域対応 region{色,行範囲,注釈}）。ホバーで両カラム連動。loadable な例はコアへ load。初期例：代入/算術/if/while/配列(指標修飾)/関数呼び出し(CALL-RET)。各例に「C にあって COMET II に無いもの(ヒープ/型)」注記。
- 拡張要素は色＋「拡張」バッジで二重符号化。日本語UI用語は `src/ui/i18n/ja.ts` に集約（CONTEXT.md 語彙厳守：語/機械命令・COMET II・シミュレーター・領域ラベル）。

## 5. 技術スタック
TypeScript / React 18 / Vite / Vitest / React Testing Library /（要所 Playwright）/ react-window / CodeMirror 6。

## 6. テスト方針（検証）
- **コア（最重要）**：`vitest run`。
  - フラグ規則の境界（`0x7FFF+1`,`0x8000-1`,`0xFFFF+1`,`0-1`、シフト押出ビット、SRA/SLA符号保持）。
  - **逆実行不変条件**：ランダムプログラムを N ステップ→全 stepBack で初期完全一致。各命令カテゴリ単発でも `step→stepBack` 完全復元。
  - 自己書き換え／割り込み（発火→次 step で退避、RETI 復帰、IE=0 中は不発、entry の stepBack で巻き戻り）。
  - アセンブラ（2形式オペコード選択、DC/DS/ラベル前後参照/リテラル/エラー継続、ソースマップ整合）、I/O。
- **UI**：RTL でモックファサードに対し、4基数表示・変更ハイライト・番地単位購読の再描画局所化・仮想化のDOMノード数限定。`jest-axe` で a11y。
- **E2E（Playwright スモーク）**：ソース入力→アセンブル→step→ハイライト→stepBack、自己書き換えデモ、割り込み→RETI。

## 7. 落とし穴
- 符号付き/符号なしの一貫性は `bits.ts` に閉じ込める（混在が最大のバグ源）。
- 未定義オペコード実行（PR データ侵入）は `halt('invalid-opcode')` で番地・語を提示（教材的）。`run` は maxSteps で暴走停止。
- デコードをキャッシュしない（自己書き換えと stepBack の整合のため）。
- 割り込み発火の保留キュー消費は entry delta に番号を持たせ stepBack で戻す。
