import { webview } from '@kit.ArkWeb';
import { HashMap, JSON, util } from '@kit.ArkTS';
import hilog from '@ohos.hilog';

const TAG = "JSBridge"

@Entry
@Component
struct Index {
  @State controller: webview.WebviewController = new webview.WebviewController();
  jsBridgeHelper: JSBridgeHelper = new JSBridgeHelper(this.controller)
  @State jsBridge: MainJavascriptInterface = new MainJavascriptInterface(this.jsBridgeHelper);
  @State url: string | Resource = $rawfile('index.html')

  build() {
    Column() {
      Web({ src: this.url, controller: this.controller })
        .onControllerAttached(() => {
          // 注册 JSBridge 类，h5 中的名字，注册的方法
          this.controller.registerJavaScriptProxy(
            this.jsBridge, "WebViewJavascriptBridge",
            ["send", "response", "submitFromWeb", "deviceLoadJavascriptSuccess"]
          );
          // 这种注册必须调用 refresh
          this.controller.refresh()
        })
        .zoomAccess(false)
        .onPageEnd(() => {
          // 加载 WebViewJavascriptBridge.min.js
          let jsBridge = getContext(this).resourceManager.getRawFileContentSync('WebViewJavascriptBridge.min.js')
          let decoder = util.TextDecoder.create('utf-8')
          let content = decoder.decodeToString(jsBridge).trim()
          hilog.info(0x0000, TAG, '读取到 ' + content)
          this.controller.loadUrl('javascript:' + content)
        })
        .onConsole((event) => {
          // h5 的打印，可以在这里看到
          hilog.info(0x0000, TAG, `[console] ${event?.message.getMessage()}`)
          return true
        })
        .width('100%')
        .height('90%')

      Row() {
        Button('给h5发送消息，有回调').onClick(() => {
          this.jsBridgeHelper.callHandler('functionInJs', '大哥好呀', (data) => {
            hilog.info(0x0000, TAG, `Button => 点击回调 ${data}`)
          })
        }).fontSize(14)
        Blank().width(10)
        Button('给h5发送消息，无回调').onClick(() => {
          this.jsBridgeHelper.sendToWeb('hello')
        }).fontSize(14)
      }.width('100%')
      .justifyContent(FlexAlign.Center)
      .padding({
        left: 16,
        right: 16,
        top: 16,
        bottom: 16
      })
    }
    .height('100%')
    .width('100%')
  }
}


class MainJavascriptInterface {
  private jsBridgeHelper: JSBridgeHelper

  constructor(bridgeHelper: JSBridgeHelper) {
    this.jsBridgeHelper = bridgeHelper;
  }

  // h5 调用 native，native 回调给 h5 的，是通过 runJavaScript
  send(data: string, callbackId: string): string {
    hilog.info(0x0000, TAG, `MainJavascriptInterface: method=send, data=>${data}, callbackId=>${callbackId}`)
    // 这里的返回值其实是没有意义的
    return '[--]'
  }

  // 当 native 发送消息，h5 回调给 native 是用这种方法
  response(data: string, responseId: string): void {
    hilog.info(0x0000, TAG, `MainJavascriptInterface: method=response, data=>${data}, responseId=>${responseId}`)
    if (this.jsBridgeHelper.messageMap.hasKey(responseId)) {
      this.jsBridgeHelper.messageMap.remove(responseId)(data)
    }
  }

  deviceLoadJavascriptSuccess(data: string | object | null, callbackId: string) {
    hilog.info(0x0000, TAG, `MainJavascriptInterface: method=submitFromWeb data=>${data} , responseId=>${callbackId}`)
    const jsonString = '{"result":"HarmonyOS"}';
    this.jsBridgeHelper.sendResponse(JSON.parse(jsonString), callbackId)
  }

  submitFromWeb(data: string | object | null, callbackId: string) {
    hilog.info(0x0000, TAG, `MainJavascriptInterface: method=submitFromWeb data=>${data} , responseId=>${callbackId}`)
    this.jsBridgeHelper.sendResponse('submitFromWeb response', callbackId)
  }
}

class JSRequest {
  callbackId: string = '';
  data?: string | object | null;
  handlerName: string = '';
}

class JSResponse {
  responseId: string = ''
  responseData?: string | object | null
}

class JSBridgeHelper {
  controller: webview.WebviewController;
  messageMap: HashMap<string, (data: string) => void> = new HashMap()

  constructor(controller: webview.WebviewController) {
    this.controller = controller
  }

  sendResponse(data: string | object | null, callbackId: string) {
    let message: JSResponse = new JSResponse()
    message.responseId = callbackId
    message.responseData = data
    let content = `javascript:WebViewJavascriptBridge._handleMessageFromNative('${JSON.stringify(message)}');`
    hilog.info(0x0000, TAG, `json=> ${content}`)
    this.controller.runJavaScript(content)
  }

  callHandler(handlerName: string, data: string, callBack?: (event: string) => void) {
    let callbackId = `arkts_cb_${new Date().getTime()}`
    let message = new JSRequest()
    message.data = data
    if (callBack) {
      this.messageMap.set(callbackId, callBack)
      message.callbackId = callbackId
    }
    message.handlerName = handlerName
    let content = `javascript:WebViewJavascriptBridge._handleMessageFromNative('${JSON.stringify(message)}');`
    this.controller.runJavaScript(content)
  }

  sendToWeb(data: string) {
    this.callHandler('', `${data}-${Date.now()}`)
  }
}
