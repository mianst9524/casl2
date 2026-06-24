export interface Sample {
  id: string;
  title: string;
  source: string;
  input?: string;
}

export const SAMPLES: Sample[] = [
  {
    id: 'sum',
    title: '1〜5 の総和（ループ）',
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
    id: 'echo',
    title: '入力をそのまま出力（IN/OUT マクロ）',
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
    title: '自己書き換えコード（命令＝データ）',
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
    title: 'PR がデータ領域へ侵入（RET 忘れ）',
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
    title: 'ハードウェア割り込み（拡張）',
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
