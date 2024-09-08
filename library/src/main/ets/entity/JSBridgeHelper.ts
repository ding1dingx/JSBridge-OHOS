import { webview } from '@kit.ArkWeb';
import { HashMap, JSON } from '@kit.ArkTS';
import { JSRequest, JSResponse } from './JSTypes';
import { createLogger } from '../utils/Logger';
import hilog from '@ohos.hilog';

const log = createLogger(0x1000, 'JSBridgeHelper');
log.setLogLevel(hilog.LogLevel.INFO);

export class JSBridgeHelper {
  controller: webview.WebviewController;
  messageMap: HashMap<string, (data: string) => void> = new HashMap();

  constructor(controller: webview.WebviewController) {
    this.controller = controller;
  }

  sendResponse(data: string | object | null, callbackId: string) {
    let message: JSResponse = new JSResponse();
    message.responseId = callbackId;
    message.responseData = data;
    let content = `javascript:WebViewJavascriptBridge._handleMessageFromNative('${JSON.stringify(
      message
    )}');`;
    log.info(`json=> ${content}`);
    this.controller.runJavaScript(content);
  }

  callHandler(
    handlerName: string,
    data: string,
    callBack?: (event: string) => void
  ) {
    let callbackId = `arkts_cb_${new Date().getTime()}`;
    let message = new JSRequest();
    message.data = data;
    if (callBack) {
      this.messageMap.set(callbackId, callBack);
      message.callbackId = callbackId;
    }
    message.handlerName = handlerName;
    let content = `javascript:WebViewJavascriptBridge._handleMessageFromNative('${JSON.stringify(
      message
    )}');`;
    this.controller.runJavaScript(content);
  }

  sendToWeb(data: string) {
    this.callHandler("", `${data}-${Date.now()}`);
  }
}
