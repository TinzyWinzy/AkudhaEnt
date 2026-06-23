import { useState, useCallback } from 'react';

export interface LogEntry {
  time: string;
  text: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

export function useLogging(initialLogs: LogEntry[] = []) {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);

  const addLog = useCallback((text: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => {
      const entry: LogEntry = {
        time: new Date().toLocaleTimeString(),
        text,
        type,
      };
      return [entry, ...prev].slice(0, 50);
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return { logs, addLog, clearLogs };
}
