import { HashMap } from '@kit.ArkTS';
import { createLoggerWithOptions } from '../utils/Logger';
import webview from '@ohos.web.webview';
import hilog from '@ohos.hilog';

const log = createLoggerWithOptions({
  domain: 0x0000,
  prefix: "JSBridgeHelper",
  logLevel: hilog.LogLevel.INFO
});

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
  responseCallbacks: HashMap<string, (data: string) => void> = new HashMap();

  constructor(controller: webview.WebviewController) {
    this.controller = controller;
  }

  private dispatchMessage(message: string) {
    const script = `javascript:WebViewJavascriptBridge._handleMessageFromNative('${message}');`;
    log.info(`dispatchMessage ==> ${script}`);
    this.controller.runJavaScript(script);
  }

  sendResponse(data: string | object | null, callbackId: string) {
    const response: JSResponse = {
      responseId: callbackId,
      responseData: data,
    };
    this.dispatchMessage(JSON.stringify(response))
  }

  callHandler(
    handlerName: string,
    data: string,
    callback?: (event: string) => void
  ) {
    const request: JSRequest = {
      data,
      handlerName,
      callbackId: `native_cb_${Date.now()}`,
    };
    if (callback) {
      this.responseCallbacks.set(request.callbackId, callback);
    }
    this.dispatchMessage(JSON.stringify(request))
  }

  sendToWeb(data: string) {
    this.callHandler("", data);
  }
}
