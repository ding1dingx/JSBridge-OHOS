import hilog from '@ohos.hilog';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

class Logger {
  private domain: number;
  private prefix: string;
  private logLevel: hilog.LogLevel;

  constructor(domain: number = 0x0000, prefix: string = 'Logger') {
    this.domain = domain;
    this.prefix = prefix;
    this.logLevel = hilog.LogLevel.INFO; // 默认日志级别
  }

  private log(level: LogLevel, format: string, ...args: any[]): void {
    const logLevelValue = hilog.LogLevel[level];
    if (logLevelValue >= this.logLevel) {
      hilog[level.toLowerCase()](this.domain, this.prefix, format, ...args);
    }
  }

  debug(format: string, ...args: any[]): void {
    this.log('DEBUG', format, ...args);
  }

  info(format: string, ...args: any[]): void {
    this.log('INFO', format, ...args);
  }

  warn(format: string, ...args: any[]): void {
    this.log('WARN', format, ...args);
  }

  error(format: string, ...args: any[]): void {
    this.log('ERROR', format, ...args);
  }

  fatal(format: string, ...args: any[]): void {
    this.log('FATAL', format, ...args);
  }

  setLogLevel(level: hilog.LogLevel): void {
    this.logLevel = level;
    // 注意：hilog.isLoggable 实际上并不设置日志级别，它只是检查给定的级别是否可记录
    // 因此，我们不需要在这里调用它
  }

  getLogLevel(): hilog.LogLevel {
    return this.logLevel;
  }

  isLoggable(level: hilog.LogLevel): boolean {
    return hilog.isLoggable(this.domain, this.prefix, level);
  }
}

export const log = new Logger();

export const createLogger = (domain: number, prefix: string) => new Logger(domain, prefix);
