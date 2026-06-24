import { describe, it, expect } from 'vitest';
import { assemble } from '../../src/core/assembler';
import { Machine } from '../../src/core/machine';

describe('アセンブラ：基本', () => {
  it('two 形式はオペランドでオペコードを選ぶ', () => {
    const rr = assemble('\tLD GR1,GR2');
    expect(rr.ok).toBe(true);
    expect(rr.image!.words[0]).toBe(0x1412);

    const ra = assemble('\tLD GR1,X\nX\tDC 7');
    expect(ra.ok).toBe(true);
    expect(ra.image!.words[0]).toBe(0x1010); // LD r-adr, r1=1, x=0
    expect(ra.image!.words[1]).toBe(2); // X の番地
    expect(ra.image!.words[2]).toBe(7); // DC 7
  });

  it('DC は 10進・#16進・文字列・複数オペランド', () => {
    const r = assemble("\tDC 10,#000A,'AB'");
    expect(r.ok).toBe(true);
    expect(r.image!.words).toEqual([10, 10, 0x41, 0x42]);
  });

  it('DS は語を確保する', () => {
    const r = assemble('\tDS 3');
    expect(r.ok).toBe(true);
    expect(r.image!.words).toEqual([0, 0, 0]);
  });

  it('ラベルの前方参照を解決する', () => {
    const r = assemble('\tJUMP TGT\n\tNOP\nTGT\tNOP');
    expect(r.ok).toBe(true);
    // JUMP(0x64) adr ; NOP ; NOP → JUMP の adr は TGT=3
    expect(r.image!.words[1]).toBe(3);
  });

  it('リテラルは末尾に配置される', () => {
    const r = assemble('\tLD GR1,=5\n\tEND');
    expect(r.ok).toBe(true);
    // LD r-adr (2語) の後ろにリテラル 5
    expect(r.image!.words[0]).toBe(0x1010);
    expect(r.image!.words[1]).toBe(2); // リテラルの番地
    expect(r.image!.words[2]).toBe(5);
  });

  it('指標修飾 LAD GR2,1,GR2', () => {
    const r = assemble('\tLAD GR2,1,GR2');
    expect(r.ok).toBe(true);
    // LAD(0x12), r1=2, x=2 → 0x1222 ; adr=1
    expect(r.image!.words[0]).toBe(0x1222);
    expect(r.image!.words[1]).toBe(1);
  });
});

describe('アセンブラ：エラー', () => {
  it('未定義ラベルを報告', () => {
    const r = assemble('\tLD GR1,NOPE');
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.message.includes('未定義'))).toBe(true);
  });
  it('ラベル多重定義を報告', () => {
    const r = assemble('L\tDC 1\nL\tDC 2');
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.message.includes('多重定義'))).toBe(true);
  });
});

describe('ソースマップ', () => {
  it('行↔番地↔語が整合する', () => {
    const r = assemble('\tLAD GR1,5\n\tRET');
    expect(r.ok).toBe(true);
    const sm = r.sourceMap!;
    expect(sm[0].address).toBe(0);
    expect(sm[0].words).toEqual([0x1210, 5]);
    expect(sm[1].address).toBe(2);
    expect(sm[1].words).toEqual([0x8100]);
  });
});

describe('エンドツーエンド：1〜5 の総和', () => {
  it('結果が 15 になる', () => {
    const src = [
      'SUM\tSTART',
      '\tLAD GR1,0',
      '\tLAD GR2,1',
      'LOOP\tCPA GR2,N',
      '\tJPL DONE',
      '\tADDA GR1,GR2',
      '\tLAD GR2,1,GR2',
      '\tJUMP LOOP',
      'DONE\tST GR1,RESULT',
      '\tRET',
      'N\tDC 5',
      'RESULT\tDS 1',
      '\tEND',
    ].join('\n');
    const m = new Machine();
    const r = m.assembleAndLoad(src);
    expect(r.ok).toBe(true);
    const run = m.run(10000);
    expect(run.halted).toBe(true);
    expect(run.haltReason).toBe('end');
    const result = r.symbols!['RESULT'];
    expect(m.getWord(result)).toBe(15);
  });
});

describe('エンドツーエンド：マクロ IN/OUT', () => {
  it('入力をそのまま出力する', () => {
    const src = [
      '\tSTART',
      '\tIN BUF,LEN',
      '\tOUT BUF,LEN',
      '\tRET',
      'BUF\tDS 8',
      'LEN\tDS 1',
      '\tEND',
    ].join('\n');
    const m = new Machine();
    m.setInput('HELLO\n');
    const r = m.assembleAndLoad(src);
    expect(r.ok).toBe(true);
    m.run(10000);
    expect(m.getOutput()).toBe('HELLO');
  });
});

describe('エンドツーエンド：割り込み（拡張命令の組み立て）', () => {
  it('発火でハンドラが走り RETI で復帰する', () => {
    const src = [
      '\tSTART',
      '\tSIV HANDLER',
      '\tEI',
      '\tLAD GR0,1',
      '\tLAD GR0,2',
      '\tDI',
      '\tRET',
      'HANDLER\tLAD GR1,99',
      '\tRETI',
      '\tEND',
    ].join('\n');
    const m = new Machine();
    const r = m.assembleAndLoad(src);
    expect(r.ok).toBe(true);
    m.step(); // SIV
    m.step(); // EI
    m.fireInterrupt(3);
    const run = m.run(10000);
    expect(run.halted).toBe(true);
    expect(m.getGR(1)).toBe(99); // ハンドラが実行された
  });
});
