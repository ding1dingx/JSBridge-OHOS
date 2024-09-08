import { webview } from '@kit.ArkWeb';
import { util } from '@kit.ArkTS';
import { createLogger, JSBridgeHelper } from '@ding1ding/jsbridge-ohos';
import { JSBridgeInterface } from '../helper/JSBridgeInterface';
import hilog from '@ohos.hilog';

const log = createLogger(0x1000, 'Index');
log.setLogLevel(hilog.LogLevel.DEBUG);

@Entry
@Component
struct Index {
  @State controller: webview.WebviewController = new webview.WebviewController();
  jsBridgeHelper: JSBridgeHelper = new JSBridgeHelper(this.controller)
  @State jsBridge: JSBridgeInterface = new JSBridgeInterface(this.jsBridgeHelper);
  @State url: string | Resource = $rawfile('index.html')

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
          let jsBridge = getContext(this).resourceManager.getRawFileContentSync('WebViewJavascriptBridge.min.js')
          let decoder = util.TextDecoder.create('utf-8')
          let content = decoder.decodeToString(jsBridge).trim()
          log.info('读取到 ' + content)
          this.controller.loadUrl('javascript:' + content)
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
