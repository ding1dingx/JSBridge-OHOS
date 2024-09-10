import hilog from '@ohos.hilog';

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

interface LoggerOptions {
  domain?: number;
  tag?: string;
  logLevel?: LogLevel | hilog.LogLevel;
}

function createLogger<T extends LogLevel | hilog.LogLevel>(options: LoggerOptions = {}): {
  debug: (format: string, ...args: any[]) => void;
  info: (format: string, ...args: any[]) => void;
  warn: (format: string, ...args: any[]) => void;
  error: (format: string, ...args: any[]) => void;
  fatal: (format: string, ...args: any[]) => void;
  setLogLevel: (level: T) => void;
  getLogLevel: () => T;
} {
  let { domain = 0x0000, tag = 'Logger', logLevel = hilog.LogLevel.DEBUG } = options;

  const log = (level: LogLevel, format: string, ...args: any[]) => {
    for (const logLevel of Object.values(LogLevel)) {
      // 将 level 转换为 hilog.LogLevel 类型的值
      if (hilog.LogLevel[logLevel] >= hilog.LogLevel[level]) {
        hilog[logLevel.toLowerCase()](domain, tag, format, ...args);
        break;
      }
    }
  };

  return {
    debug: (format: string, ...args: any[]) => log(LogLevel.DEBUG, format, ...args),
    info: (format: string, ...args: any[]) => log(LogLevel.INFO, format, ...args),
    warn: (format: string, ...args: any[]) => log(LogLevel.WARN, format, ...args),
    error: (format: string, ...args: any[]) => log(LogLevel.ERROR, format, ...args),
    fatal: (format: string, ...args: any[]) => log(LogLevel.FATAL, format, ...args),
    setLogLevel: (level: T) => {
      logLevel = level;
    },
    getLogLevel: () => logLevel as T,
  };
}

export const log = createLogger();
export const createLoggerWithOptions = (options: LoggerOptions) => createLogger(options);
