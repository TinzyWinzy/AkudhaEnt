import type { LogEntry } from '../hooks/useLogging';

interface TerminalProps {
  logs: LogEntry[];
}

export function Terminal({ logs }: TerminalProps) {
  return (
    <div className="rounded-xl border border-charcoal-200 bg-charcoal-900 text-white p-5 shadow-sm" id="zimbabwe-nodes-terminal">
      <div className="flex items-center justify-between border-b border-charcoal-800 pb-2 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <h3 className="font-display font-semibold text-xs tracking-wider uppercase text-charcoal-100">Live PWA Diagnostics Shell</h3>
        </div>
        <span className="font-mono text-[9px] text-charcoal-200">PORT: 3000 // HOST: LOCALHOST</span>
      </div>
      <div className="font-mono text-[10.5px] space-y-2 max-h-[150px] overflow-y-auto pr-1 flex flex-col-reverse" id="terminal-logs-window">
        {logs.map((log, index) => {
          const textColor = log.type === 'success' ? 'text-emerald-400 font-medium'
            : log.type === 'warn' ? 'text-amber-400'
            : log.type === 'error' ? 'text-rose-400 font-semibold'
            : 'text-zinc-300';
          return (
            <div key={index} className="flex gap-2">
              <span className="text-[9.5px] text-gray-500 shrink-0 select-none">[{log.time}]</span>
              <span className={textColor}>{log.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
