export interface ResponseMessage {
  responseId: string | null;
  responseData: unknown;
  callbackId: string | null;
  handlerName: string | null;
  data: unknown;
}
