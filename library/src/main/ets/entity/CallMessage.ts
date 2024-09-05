export interface CallMessage {
  handlerName: string;
  data: unknown;
  callbackId: string | null;
}
