export interface AssemblyError {
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

export class ErrorCollector {
  readonly errors: AssemblyError[] = [];
  error(line: number, message: string): void {
    this.errors.push({ line, message, severity: 'error' });
  }
  warn(line: number, message: string): void {
    this.errors.push({ line, message, severity: 'warning' });
  }
  get hasError(): boolean {
    return this.errors.some((e) => e.severity === 'error');
  }
}
