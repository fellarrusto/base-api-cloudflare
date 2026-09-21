// Structured JSON logs, collected by Workers Logs ([observability] in wrangler.toml).
// Never log secrets: tokens, API keys, passwords.

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVELS;

let threshold: number = LEVELS.info;

/** Set the minimum level from LOG_LEVEL (called at the start of every request and cron run). */
export function configureLogger(level: string | undefined): void {
  threshold = LEVELS[(level ?? '').toLowerCase() as Level] ?? LEVELS.info;
}

function write(level: Level, message: string, data?: Record<string, unknown>): void {
  if (LEVELS[level] < threshold) return;
  const line = JSON.stringify({ level, message, ...data });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, data?: Record<string, unknown>) => write('debug', message, data),
  info: (message: string, data?: Record<string, unknown>) => write('info', message, data),
  warn: (message: string, data?: Record<string, unknown>) => write('warn', message, data),
  error: (message: string, data?: Record<string, unknown>) => write('error', message, data),
};
