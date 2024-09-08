export class JSRequest {
  callbackId: string = "";
  data?: string | object | null;
  handlerName: string = "";
}

export class JSResponse {
  responseId: string = "";
  responseData?: string | object | null;
}
