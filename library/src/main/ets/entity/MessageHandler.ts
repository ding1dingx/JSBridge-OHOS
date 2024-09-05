export interface MessageHandler<Input, Output> {
  handle(data: Input, callback?: (response: Output) => void): void;
}
