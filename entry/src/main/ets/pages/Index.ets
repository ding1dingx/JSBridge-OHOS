import { webview } from '@kit.ArkWeb';
import { HashMap, util } from '@kit.ArkTS';
import { Logger } from '@nzy/logger';

const TAG = "JsBridge";

@Entry
@Component
struct Index {
  @State url: string | Resource = $rawfile('index.html');
  @State controller: webview.WebviewController = new webview.WebviewController();
  jsBridgeHelper: JsBridgeHelper = new JsBridgeHelper(this.controller);
  @State jsBridge: MainJavascriptInterface = new MainJavascriptInterface(this.jsBridgeHelper);

  build() {
    Column() {
      Web({ src: this.url, controller: this.controller })
        .onControllerAttached(() => {
          this.controller.registerJavaScriptProxy(this.jsBridge, "HarmonyBridge", ["postMessage"]);
          this.controller.refresh();
        })
        .zoomAccess(false)
        .onPageEnd(() => {
          this.loadJsBridge();
        })
        .onConsole((event) => {
          Logger.info(TAG, `H5控制台: ${event?.message.getMessage()}`);
          return true;
        })
        .width('100%')
        .height('90%')

      Column() {
        Row() {
          Button('发送消息到H5(带回调)')
            .onClick(() => {
              this.jsBridgeHelper.callHandler('functionInJs', 'ArkTS发来的消息', (data) => {
                Logger.info(TAG, `按钮回调: ${data}`);
              });
            }).fontSize(14)
          Blank().width(10)
          Button('发送消息到H5(无回调)')
            .onClick(() => {
              this.jsBridgeHelper.sendToWeb('ArkTS发来的消息');
            }).fontSize(14)
        }
        .width('100%')
        .justifyContent(FlexAlign.Center)
        .padding({
          left: 16,
          right: 16,
          top: 16,
          bottom: 16
        })
      }
      .backgroundColor('#F1F3F5')
    }
    .width('100%')
    .height('100%')
  }

  private loadJsBridge() {
    try {
      let jsBridge = getContext(this).resourceManager.getRawFileContentSync('bridge.min.js');
      let decoder = util.TextDecoder.create('utf-8');
      let content = decoder.decodeToString(jsBridge).trim();
      this.controller.runJavaScript(content);
    } catch (error) {
      Logger.error(TAG, `加载 bridge.min.js 失败: ${error}`);
    }
  }
}

interface BridgeMessage {
  handlerName?: string;
  data?: string;
  callbackId?: string;
  responseId?: string;
  responseData?: string;
}

class MainJavascriptInterface {
  jsBridgeHelper: JsBridgeHelper;

  constructor(jsBridgeHelper: JsBridgeHelper) {
    this.jsBridgeHelper = jsBridgeHelper;
  }

  postMessage(messageJSON: string): void {
    Logger.info(TAG, `收到来自JS的消息: ${messageJSON}`);
    try {
      const message: BridgeMessage = JSON.parse(messageJSON);
      this.jsBridgeHelper.handleMessageFromJS(message);
    } catch (error) {
      Logger.error(TAG, `解析消息失败: ${error}`);
    }
  }
}

class JsBridgeHelper {
  controller: webview.WebviewController;
  messageHandlers: HashMap<string, (data: string,
    responseCallback?: (responseData: string) => void) => void> = new HashMap();
  responseCallbacks: HashMap<string, (data: string) => void> = new HashMap();
  uniqueId: number = 1;

  constructor(controller: webview.WebviewController) {
    this.controller = controller;
  }

  registerHandler(handlerName: string,
    handler: (data: string, responseCallback?: (responseData: string) => void) => void) {
    this.messageHandlers.set(handlerName, handler);
  }

  callHandler(handlerName: string, data: string,
    responseCallback?: (responseData: string) => void) {
    const message: BridgeMessage = { handlerName, data };
    if (responseCallback) {
      const callbackId = `cb_${this.uniqueId++}_${Date.now()}`;
      this.responseCallbacks.set(callbackId, responseCallback);
      message.callbackId = callbackId;
    }
    this.sendMessageToJS(message);
  }

  handleMessageFromJS(message: BridgeMessage) {
    if (message.responseId) {
      const responseCallback = this.responseCallbacks.get(message.responseId);
      if (responseCallback && message.responseData) {
        responseCallback(message.responseData);
        this.responseCallbacks.remove(message.responseId);
      }
    } else if (message.handlerName) {
      const handler = this.messageHandlers.get(message.handlerName);
      if (handler) {
        handler(message.data || '', message.callbackId ? (responseData: string) => {
          this.sendMessageToJS({
            responseId: message.callbackId,
            responseData: responseData
          });
        } : undefined);
      } else {
        Logger.warn(TAG, `没有找到处理程序来处理JS消息: ${JSON.stringify(message)}`);
      }
    }
  }

  sendMessageToJS(message: BridgeMessage) {
    const messageJSON = JSON.stringify(message);
    this.controller.runJavaScript(`WebViewJavascriptBridge.handleMessageFromNative('${messageJSON}');`);
  }

  sendToWeb(data: string) {
    this.callHandler('', data);
  }
}
