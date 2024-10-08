import { webview } from '@kit.ArkWeb';
import { util } from '@kit.ArkTS';
import { createLoggerWithOptions, JSBridgeHelper } from '@ding1ding/jsbridge-ohos';
import { JSBridgeInterface } from '../helper/JSBridgeInterface';

const log = createLoggerWithOptions({ tag: "Index" });

@Entry
@Component
struct Index {
  @State controller: webview.WebviewController = new webview.WebviewController();
  jsBridgeHelper: JSBridgeHelper = new JSBridgeHelper(this.controller)
  @State jsBridge: JSBridgeInterface = new JSBridgeInterface(this.jsBridgeHelper);
  @State url: string | Resource = $rawfile('index.html')

  aboutToDisappear(): void {
    this.jsBridgeHelper.reset()
  }

  build() {
    Column() {
      Web({ src: this.url, controller: this.controller })
        .onControllerAttached(() => {
          this.controller.registerJavaScriptProxy(
            this.jsBridge, "WebViewJavascriptBridge",
            ["send", "response", "submitFromWeb", "deviceLoadJavascriptSuccess"]
          );
          this.controller.refresh()
        })
        .zoomAccess(false)
        .onPageEnd(() => {
          const jsBridge = getContext(this).resourceManager.getRawFileContentSync('WebViewJavascriptBridge.min.js')
          const decoder = util.TextDecoder.create('utf-8')
          const content = decoder.decodeToString(jsBridge).trim()
          log.info(`读取到${content}`)
          this.controller.loadUrl(`javascript:${content}`)
        })
        .onConsole((event) => {
          log.info(`[console] ${event?.message.getMessage()}`)
          return true
        })
        .width('100%')
        .height('90%')

      Row() {
        Button('给h5发送消息，有回调').onClick(() => {
          this.jsBridgeHelper.callHandler('functionInJS', '大哥好呀', (data) => {
            log.info(`Button => 点击回调 ${data}`)
          })
        }).fontSize(14)
        Blank().width(10)
        Button('给h5发送消息，无回调').onClick(() => {
          this.jsBridgeHelper.sendToWeb(`hello-${Date.now()}`)
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
