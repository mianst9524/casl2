import { createContext, useContext, useRef, type ReactNode } from 'react';
import { Machine } from '../../core';

const Ctx = createContext<Machine | null>(null);

export function MachineProvider({ children }: { children: ReactNode }) {
  const ref = useRef<Machine | null>(null);
  if (!ref.current) ref.current = new Machine();
  return <Ctx.Provider value={ref.current}>{children}</Ctx.Provider>;
}

export function useMachine(): Machine {
  const m = useContext(Ctx);
  if (!m) throw new Error('MachineProvider の内側で使ってください');
  return m;
}
