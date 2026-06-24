// C ↔ CASL2 のキュレーション対訳例（自動コンパイラは作らない・grill 決定）。
export interface CorrespondenceRegion {
  id: string;
  label: string;
  /** C 側の行範囲（1 起点・両端含む）。 */
  c: [number, number];
  /** CASL2 側の行範囲（1 起点・両端含む）。 */
  casl: [number, number];
  note?: string;
}

export interface CCorrespondenceExample {
  id: string;
  /** レッスン階段の通し番号（フェーズ2 ＝ 13〜17・ADR-0004）。samples.ts の 1〜12 と連続。 */
  lesson: number;
  phase: 'c';
  title: string;
  description: string;
  /** この C 機能が COMET II 上でどう表れるか（新概念）。 */
  concept: string;
  /** フェーズ1 のどのレッスンで学んだ仕組みを回収するか。 */
  recallsLesson?: number;
  cLines: string[];
  caslLines: string[];
  regions: CorrespondenceRegion[];
  /** この CASL2 をシミュレーターへ読み込めるか（完結したプログラム）。 */
  loadableSource?: string;
  note?: string;
}

export const CCORR_EXAMPLES: CCorrespondenceExample[] = [
  {
    id: 'assign',
    lesson: 13,
    phase: 'c',
    title: '代入',
    concept: 'C の代入＝レジスタへ値を作りメモリへ ST',
    recallsLesson: 2,
    description: '変数への代入は「レジスタへ値を作り、メモリへ格納」になる。',
    cLines: ['int x;', 'x = 5;'],
    caslLines: ['\tSTART', '\tLAD\tGR1,5', '\tST\tGR1,X', '\tRET', 'X\tDS\t1', '\tEND'],
    regions: [
      { id: 'decl', label: '変数 x の領域', c: [1, 1], casl: [5, 5], note: 'int x → 1 語を確保（DS）' },
      { id: 'set', label: 'x に 5 を代入', c: [2, 2], casl: [2, 3], note: 'GR1 に 5 を作り、X へ ST' },
    ],
    loadableSource: '\tSTART\n\tLAD\tGR1,5\n\tST\tGR1,X\n\tRET\nX\tDS\t1\n\tEND\n',
  },
  {
    id: 'if',
    lesson: 14,
    phase: 'c',
    title: 'if 分岐',
    concept: 'C の if＝CPA＋条件ジャンプ',
    recallsLesson: 4,
    description: '条件分岐は「比較（CPA）＋条件ジャンプ」になる。',
    cLines: ['if (x > 0) {', '  y = 1;', '}'],
    caslLines: [
      '\tSTART',
      '\tLD\tGR1,X',
      '\tCPA\tGR1,=0',
      '\tJPL\tTHEN',
      '\tJUMP\tENDIF',
      'THEN\tLAD\tGR2,1',
      '\tST\tGR2,Y',
      'ENDIF\tRET',
      'X\tDC\t3',
      'Y\tDS\t1',
      '\tEND',
    ],
    regions: [
      { id: 'cond', label: '条件 x > 0', c: [1, 1], casl: [2, 5], note: 'CPA で比較し JPL で「正なら THEN」へ' },
      { id: 'body', label: 'then 節 y = 1', c: [2, 2], casl: [6, 7], note: '条件成立時のみ実行' },
    ],
    loadableSource:
      '\tSTART\n\tLD\tGR1,X\n\tCPA\tGR1,=0\n\tJPL\tTHEN\n\tJUMP\tENDIF\nTHEN\tLAD\tGR2,1\n\tST\tGR2,Y\nENDIF\tRET\nX\tDC\t3\nY\tDS\t1\n\tEND\n',
  },
  {
    id: 'while',
    lesson: 15,
    phase: 'c',
    title: 'while ループ',
    concept: 'C の while＝先頭で比較し外れたら脱出',
    recallsLesson: 5,
    description: 'ループは「先頭で比較し、条件を外れたら抜ける」構造になる。',
    cLines: ['i = 1;', 'while (i <= n) {', '  i = i + 1;', '}'],
    caslLines: [
      '\tSTART',
      '\tLAD\tGR1,1',
      'LOOP\tCPA\tGR1,N',
      '\tJPL\tEND',
      '\tLAD\tGR1,1,GR1',
      '\tJUMP\tLOOP',
      'END\tST\tGR1,I',
      '\tRET',
      'N\tDC\t5',
      'I\tDS\t1',
      '\tEND',
    ],
    regions: [
      { id: 'init', label: 'i = 1', c: [1, 1], casl: [2, 2] },
      { id: 'test', label: '条件 i <= n', c: [2, 2], casl: [3, 4], note: 'i > n になったら JPL で脱出' },
      { id: 'inc', label: 'i = i + 1', c: [3, 3], casl: [5, 5], note: 'LAD GR1,1,GR1 で指標修飾の +1' },
      { id: 'loop', label: 'ループ先頭へ戻る', c: [2, 2], casl: [6, 6] },
    ],
    loadableSource:
      '\tSTART\n\tLAD\tGR1,1\nLOOP\tCPA\tGR1,N\n\tJPL\tEND\n\tLAD\tGR1,1,GR1\n\tJUMP\tLOOP\nEND\tST\tGR1,I\n\tRET\nN\tDC\t5\nI\tDS\t1\n\tEND\n',
  },
  {
    id: 'array',
    lesson: 16,
    phase: 'c',
    title: '配列アクセス',
    concept: 'C の配列 a[i]＝基底アドレス＋指標修飾',
    recallsLesson: 6,
    description: '配列 a[i] は「基底アドレス＋指標レジスタ」で表す。連続した語の並びにすぎない。',
    cLines: ['x = a[i];'],
    caslLines: ['\tLD\tGR2,I', '\tLD\tGR1,A,GR2', '\tST\tGR1,X'],
    regions: [
      { id: 'idx', label: '添字 i をレジスタへ', c: [1, 1], casl: [1, 1] },
      { id: 'load', label: 'a[i] を読む', c: [1, 1], casl: [2, 2], note: 'A,GR2 ＝ 基底 A ＋ 添字 GR2（指標修飾）' },
      { id: 'store', label: 'x へ格納', c: [1, 1], casl: [3, 3] },
    ],
  },
  {
    id: 'call',
    lesson: 17,
    phase: 'c',
    title: '関数呼び出し',
    concept: 'C の関数＝CALL／RET、引数はスタック経由',
    recallsLesson: 8,
    description: '関数呼び出しは CALL／RET。戻り番地はスタックに積まれる（ヒープは使わない）。',
    cLines: ['f();', '...', 'void f() {', '  return;', '}'],
    caslLines: ['\tCALL\tF', '\t...', 'F\tNOP', '\tRET'],
    regions: [
      { id: 'call', label: 'f を呼ぶ', c: [1, 1], casl: [1, 1], note: 'CALL が戻り番地を PUSH し F へ' },
      { id: 'def', label: 'f の本体', c: [3, 5], casl: [3, 4], note: 'RET が戻り番地を POP して復帰' },
    ],
    note: 'C のヒープに当たるものは COMET II には無い。動的確保の機構を持たないため。',
  },
  {
    id: 'overflow',
    lesson: 18,
    phase: 'c',
    title: 'バッファオーバーフロー',
    concept: 'C の配列には境界チェックが無い＝あふれが隣を破壊する',
    recallsLesson: 6,
    description:
      '配列より長く書き込むと、メモリには仕切りが無いので隣の語を上書きしてしまう。C の gets()／strcpy() で実際に起きた古典的バグ。',
    cLines: [
      'int  auth = 0;',
      'char name[4];',
      'gets(name);        /* 境界チェック無し */',
      'if (auth)',
      '  puts("OK");      /* 認証突破 */',
      'else',
      '  puts("NG");',
    ],
    caslLines: [
      'MAIN\tSTART',
      '\tIN\tNAME,LEN\t; 名前を入力（NAME は 4 語のつもり）',
      '\tLD\tGR1,AUTH\t; 認証フラグを見る（本来ずっと 0）',
      '\tJZE\tDENY',
      '\tOUT\tOKMSG,MLEN\t; 0 以外なら「許可」',
      '\tRET',
      'DENY\tOUT\tNGMSG,MLEN',
      '\tRET',
      'NAME\tDS\t4\t; 入力バッファ（4 語）',
      'AUTH\tDC\t0\t; NAME の直後。長い入力で破壊される',
      'LEN\tDS\t1',
      "OKMSG\tDC\t'OK'",
      "NGMSG\tDC\t'NG'",
      'MLEN\tDC\t2',
      '\tEND',
    ],
    regions: [
      { id: 'buf', label: '4 語のバッファ name', c: [2, 2], casl: [9, 9], note: 'char name[4] → DS 4' },
      {
        id: 'auth',
        label: '隣の認証フラグ auth',
        c: [1, 1],
        casl: [10, 10],
        note: 'name の直後に置かれる語。仕切りは無い',
      },
      {
        id: 'read',
        label: '境界チェックなしの入力',
        c: [3, 3],
        casl: [2, 2],
        note: 'IN は入力文字数ぶん書き込む。DS 4 を超えても止まらない',
      },
      { id: 'check', label: 'auth で分岐', c: [4, 7], casl: [3, 4], note: 'auth が 0 以外なら認証突破' },
    ],
    loadableSource:
      "MAIN\tSTART\n\tIN\tNAME,LEN\n\tLD\tGR1,AUTH\n\tJZE\tDENY\n\tOUT\tOKMSG,MLEN\n\tRET\nDENY\tOUT\tNGMSG,MLEN\n\tRET\nNAME\tDS\t4\nAUTH\tDC\t0\nLEN\tDS\t1\nOKMSG\tDC\t'OK'\nNGMSG\tDC\t'NG'\nMLEN\tDC\t2\n\tEND\n",
    note: '読み込んだら入力欄に 5 文字以上（例 AAAAX）を入れて実行。4 文字 AAAA なら NG、5 文字目が AUTH を上書きして OK になる。',
  },
];
