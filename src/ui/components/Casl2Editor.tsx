import { useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';
import { casl2Extensions, setExecLine } from '../lib/casl2-lang';

export function Casl2Editor({
  value,
  onChange,
  currentLine,
}: {
  value: string;
  onChange: (s: string) => void;
  currentLine?: number;
}) {
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: setExecLine.of(currentLine ?? null) });
  }, [currentLine]);

  return (
    <CodeMirror
      value={value}
      height="220px"
      theme={oneDark}
      extensions={casl2Extensions}
      onChange={onChange}
      onCreateEditor={(view) => {
        viewRef.current = view;
      }}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        foldGutter: false,
        autocompletion: false,
      }}
      aria-label="CASL2 ソースコード入力"
    />
  );
}
