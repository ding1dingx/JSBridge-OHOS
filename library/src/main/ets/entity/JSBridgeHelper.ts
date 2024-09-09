import { HashMap } from '@kit.ArkTS';
import { createLogger } from '../utils/Logger';
import webview from '@ohos.web.webview';
import hilog from '@ohos.hilog';

const log = createLogger(0x0000, "JSBridgeHelper");
log.setLogLevel(hilog.LogLevel.INFO);

interface JSRequest {
  callbackId: string;
  data?: string | object | null;
  handlerName: string;
}

interface JSResponse {
  responseId: string;
  responseData?: string | object | null;
}

export class JSBridgeHelper {
  private controller: webview.WebviewController;
  messageMap: HashMap<string, (data: string) => void> = new HashMap();

  constructor(controller: webview.WebviewController) {
    this.controller = controller;
  }

  sendResponse(data: string | object | null, callbackId: string): void {
    const message: JSResponse = {
      responseId: callbackId,
      responseData: data,
    };
    const content = `javascript:WebViewJavascriptBridge._handleMessageFromNative('${JSON.stringify(message)}');`;
    log.info(`handleMessageFromNative ==> ${content}`);
    this.controller.runJavaScript(content);
  }

  callHandler(
    handlerName: string,
    data: string,
    callback?: (event: string) => void
  ): void {
    const callbackId = `arkts_cb_${Date.now()}`;
    const message: JSRequest = {
      data,
      handlerName,
      callbackId: callback ? callbackId : "",
    };
    if (callback) {
      this.messageMap.set(callbackId, callback);
    }
    const content = `javascript:WebViewJavascriptBridge._handleMessageFromNative('${JSON.stringify(message)}');`;
    this.controller.runJavaScript(content);
  }

  sendToWeb(data: string): void {
    this.callHandler("", `${data}-${Date.now()}`);
  }
}
