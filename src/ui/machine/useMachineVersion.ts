import { useSyncExternalStore } from 'react';
import { useMachine } from './MachineContext';

/** コアの version を購読し、状態が変わるたび再描画させる。 */
export function useMachineVersion(): number {
  const m = useMachine();
  return useSyncExternalStore(
    (cb) => m.subscribe(cb),
    () => m.getVersion(),
  );
}
