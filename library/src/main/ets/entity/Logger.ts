export class Logger {
  static d(message: string) {
    console.log(`[DEBUG] ${message}`);
  }

  static w(message: string) {
    console.warn(`[WARN] ${message}`);
  }

  static e(message: string) {
    console.error(`[ERROR] ${message}`);
  }
}
