import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { App } from '../../src/App';
import { MachineProvider } from '../../src/ui/machine/MachineContext';

function renderApp() {
  return render(
    <MachineProvider>
      <App />
    </MachineProvider>,
  );
}

function regHex(name: string): string {
  const row = screen.getByText(name, { selector: 'th' }).closest('tr')!;
  return within(row).getAllByText(/^#[0-9A-F]{4}$/)[0].textContent!;
}

describe('App 統合', () => {
  it('アセンブル→実行で総和 15 がレジスタに現れる', () => {
    renderApp();
    // 既定サンプルは「1〜5 の総和」
    fireEvent.click(screen.getByRole('button', { name: 'アセンブル＆ロード' }));
    expect(screen.getByText(/ロード済/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '⏩ 実行' }));

    // GR1 = 15（1〜5 の総和）。16進 #000F で照合。
    const gr1Row = screen.getByText('GR1', { selector: 'th' }).closest('tr')!;
    expect(within(gr1Row).getByText('#000F')).toBeInTheDocument();
  });

  it('逆実行ボタンはステップ後に有効になる', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'アセンブル＆ロード' }));
    const back = screen.getByRole('button', { name: '◀ 逆実行' }) as HTMLButtonElement;
    expect(back.disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '▶ ステップ' }));
    expect(back.disabled).toBe(false);
  });

  it('自己書き換え：書き換えた語が命令として実行される', () => {
    renderApp();
    fireEvent.change(screen.getByLabelText('サンプル：'), {
      target: { value: 'selfmod' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'アセンブル＆ロード' }));
    const step = screen.getByRole('button', { name: '▶ ステップ' });
    for (let i = 0; i < 4; i++) fireEvent.click(step);
    // GR0 = 0x1401（書き換えた LD GR0,GR1 が実行された）
    expect(regHex('GR0')).toBe('#1401');
  });

  it('学習モード「全部見る」で C 対応ペインが現れ、読み込める', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: '全部見る' }));
    expect(screen.getByText('C 言語との対応')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'この CASL2 を読み込む' }));
    expect(screen.getByText(/ロード済/)).toBeInTheDocument();
  });
});
