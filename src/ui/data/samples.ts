// 学習サンプル＝レッスン階段（ADR-0004）。
// 「機能の積み上げ」順に一直線。各レッスンは前段＋新概念1つ。
// フェーズ: basic(1〜9) → interlude(10〜12)。フェーズ2(c・13〜17)は ccorr.ts。
export type SamplePhase = 'basic' | 'interlude';

export interface Sample {
  id: string;
  /** 1 から始まる通し番号（ccorr.ts の 13〜17 と連続する単一の番号空間）。 */
  lesson: number;
  phase: SamplePhase;
  title: string;
  /** このレッスンで初めて出す新概念（前段との差分）。 */
  concept: string;
  /** 「ここを見て」のヒント。可視化で何に注目すれば腹落ちするか。 */
  watch?: string;
  source: string;
  input?: string;
}

export const SAMPLES: Sample[] = [
  {
    id: 'reg',
    lesson: 1,
    phase: 'basic',
    title: 'レジスタに値を置く',
    concept: 'LAD：レジスタに即値を置く',
    watch: '実行後、GR1 が 5 になる。メモリ番地はどこも変わらない。',
    source: `\tSTART
\tLAD\tGR1,5\t; GR1 に 5 を置くだけ（メモリは触らない）
\tRET
\tEND
`,
  },
  {
    id: 'store',
    lesson: 2,
    phase: 'basic',
    title: 'メモリへ格納する',
    concept: 'ST／DS・DC：レジスタの値をメモリへ格納',
    watch: '実行後、X の番地に 5 が書き込まれる。メモリビューで確認。',
    source: `\tSTART
\tLAD\tGR1,5
\tST\tGR1,X\t; GR1 の値をメモリ X へ書き込む
\tRET
X\tDS\t1\t; 1 語ぶんの領域を確保
\tEND
`,
  },
  {
    id: 'calc',
    lesson: 3,
    phase: 'basic',
    title: '計算する',
    concept: 'ADDA／SUBA：加算と減算',
    watch: 'GR1 が 7 → 10 → 8 と変わり、ANS に 8 が入る。',
    source: `\tSTART
\tLAD\tGR1,7
\tLAD\tGR2,3
\tADDA\tGR1,GR2\t; GR1 = 7 + 3 = 10
\tSUBA\tGR1,=2\t; GR1 = 10 - 2 = 8
\tST\tGR1,ANS
\tRET
ANS\tDS\t1
\tEND
`,
  },
  {
    id: 'branch',
    lesson: 4,
    phase: 'basic',
    title: '分岐する',
    concept: 'CPA＋JPL／JZE／JMI：比較して分岐',
    watch: 'X=5 は正なので JPL で POS へ飛び、SIGN に 1 が入る。X の値を変えると通る経路が変わる。',
    source: `\tSTART
\tLD\tGR1,X
\tCPA\tGR1,=0\t; X と 0 を比較
\tJPL\tPOS\t; 正なら POS へ
\tLAD\tGR2,0\t; 0 以下なら符号 0
\tJUMP\tFIN
POS\tLAD\tGR2,1\t; 正なら符号 1
FIN\tST\tGR2,SIGN
\tRET
X\tDC\t5
SIGN\tDS\t1
\tEND
`,
  },
  {
    id: 'sum',
    lesson: 5,
    phase: 'basic',
    title: '繰り返す（1〜5 の総和）',
    concept: 'JUMP で戻り＋指標修飾で i++：繰り返し',
    watch: 'LOOP を 5 周し、RESULT に 1+2+3+4+5=15 が入る。',
    source: `SUM\tSTART
\tLAD\tGR1,0\t; 合計
\tLAD\tGR2,1\t; i
LOOP\tCPA\tGR2,N
\tJPL\tDONE
\tADDA\tGR1,GR2
\tLAD\tGR2,1,GR2\t; i++
\tJUMP\tLOOP
DONE\tST\tGR1,RESULT
\tRET
N\tDC\t5
RESULT\tDS\t1
\tEND
`,
  },
  {
    id: 'array',
    lesson: 6,
    phase: 'basic',
    title: '配列を読む',
    concept: '指標修飾 A,GR2：配列アクセス',
    watch: 'GR2=2 なので a[2]=30 が読まれ、X に 30 が入る。配列はメモリ上の連続した語にすぎない。',
    source: `\tSTART
\tLAD\tGR2,2\t; 添字 i = 2
\tLD\tGR1,A,GR2\t; a[i] を読む（基底 A ＋ 指標 GR2）
\tST\tGR1,X
\tRET
A\tDC\t10,20,30,40\t; 配列 a[0..3]
X\tDS\t1
\tEND
`,
  },
  {
    id: 'call',
    lesson: 7,
    phase: 'basic',
    title: '関数を呼ぶ',
    concept: 'CALL／RET：関数呼び出し（戻り番地はスタックへ）',
    watch: 'CALL でスタックが 1 語伸びる（戻り番地）。RET でそれを取り出して戻る。ANS に 42。',
    source: `MAIN\tSTART
\tLAD\tGR1,21\t; 引数を GR1 に入れて…
\tCALL\tDBL\t; 関数を呼ぶ（戻り番地がスタックに積まれる）
\tST\tGR1,ANS\t; 戻り値も GR1（=42）
\tRET
DBL\tADDA\tGR1,GR1\t; GR1 を 2 倍にする関数
\tRET\t\t; 戻り番地を取り出して復帰
ANS\tDS\t1
\tEND
`,
  },
  {
    id: 'argpass',
    lesson: 8,
    phase: 'basic',
    title: '引数の渡し方',
    concept: 'レジスタ渡し vs スタック渡し（同じ関数を両方式で）',
    watch: 'DBLR（レジスタ渡し）はスタックが戻り番地だけ伸びる。DBLS（スタック渡し）は引数もスタックに乗る。ANS1=10, ANS2=14。C はこの手間をコンパイラが隠している。',
    source: `MAIN\tSTART
\tLAD\tGR1,5
\tCALL\tDBLR\t; レジスタ渡し：引数は GR1 そのもの
\tST\tGR1,ANS1\t; 結果 10
\tLAD\tGR1,7
\tPUSH\t0,GR1\t; スタック渡し：引数をスタックへ積む
\tCALL\tDBLS
\tPOP\tGR1\t; 結果をスタックから受け取る
\tST\tGR1,ANS2\t; 結果 14
\tRET
DBLR\tADDA\tGR1,GR1\t; レジスタ渡しの関数（手軽）
\tRET
DBLS\tPOP\tGR4\t; 戻り番地を退避
\tPOP\tGR5\t; 引数をスタックから取り出す
\tADDA\tGR5,GR5\t; 2 倍
\tPUSH\t0,GR5\t; 結果をスタックへ返す
\tPUSH\t0,GR4\t; 戻り番地を積み直す
\tRET
ANS1\tDS\t1
ANS2\tDS\t1
\tEND
`,
  },
  {
    id: 'echo',
    lesson: 9,
    phase: 'basic',
    title: '入力をそのまま出力する',
    concept: 'IN／OUT マクロ：入出力（SVC へ展開）',
    watch: '入力 HELLO がそのまま出力される。マクロ 1 行が複数の機械命令に展開される。',
    source: `\tSTART
\tIN\tBUF,LEN
\tOUT\tBUF,LEN
\tRET
BUF\tDS\t16
LEN\tDS\t1
\tEND
`,
    input: 'HELLO\n',
  },
  {
    id: 'selfmod',
    lesson: 10,
    phase: 'interlude',
    title: '命令＝データ（自己書き換え）',
    concept: '自己書き換え：命令もデータと同じ 1 語のメモリ',
    watch: 'ST で TARGET の NOP を書き換え、同じ語が実行時には別命令に化ける。命令とデータの境界はメモリの中に無い。',
    source: `\tSTART
\tLAD\tGR1,#1401\t; GR1 = 「LD GR0,GR1」の機械語
\tST\tGR1,TARGET\t; TARGET の NOP を書き換える
\tJUMP\tTARGET
TARGET\tNOP\t\t; 実行時には LD GR0,GR1 に化ける
\tRET
\tEND
`,
  },
  {
    id: 'pr-into-data',
    lesson: 11,
    phase: 'interlude',
    title: 'PR がデータ領域へ侵入（RET 忘れ）',
    concept: 'データが命令として実行される瞬間',
    watch: 'RET が無いため PR が DATA の #FFFF をそのまま機械命令としてデコードする。',
    source: `\tSTART
\tLAD\tGR1,5
\tST\tGR1,DATA
\t; RET を書き忘れ、PR がデータを命令として実行してしまう
DATA\tDC\t#FFFF
\tEND
`,
  },
  {
    id: 'interrupt',
    lesson: 12,
    phase: 'interlude',
    title: 'ハードウェア割り込み（拡張）',
    concept: 'SIV／EI／RETI：非同期な割り込み（CALL との対比）',
    watch: 'LAD GR0,2 のあたりで「割り込み発火」を押すとハンドラへ飛び、RETI で PR・FR・IE を復帰する。CALL と違い外部イベントで非同期に割り込む。',
    source: `\tSTART
\tSIV\tHANDLER\t; 割り込みベクタ設定（拡張）
\tEI\t\t; 割り込み許可（拡張）
\tLAD\tGR0,1
\tLAD\tGR0,2\t; この辺で「割り込み発火」を押す
\tLAD\tGR0,3
\tDI
\tRET
HANDLER\tLAD\tGR1,99\t; 割り込みハンドラ
\tRETI\t\t; 割り込み復帰（拡張・PR と FR を復帰）
\tEND
`,
  },
];
