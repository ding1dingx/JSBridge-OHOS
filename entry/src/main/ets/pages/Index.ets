import { common } from '@kit.AbilityKit';
import webview from '@ohos.web.webview';
import { HarmonyJsBridge } from '@ding1ding/jsbridge-ohos';

@Entry
@Component
struct Index {
  private webController: webview.WebviewController = new webview.WebviewController();
  private jsBridge: HarmonyJsBridge =
    new HarmonyJsBridge(getContext(this) as common.UIAbilityContext, this.webController);
  private indexHtml = $rawfile("index.html")

  aboutToAppear() {
    this.setupBridge();
  }

  setupBridge() {
    this.jsBridge.registerHandler('nativeGreeting', {
      handle: (data: string, callback?: (response: string) => void) => {
        console.log(`从网页接收到: ${data}`);
        if (callback) {
          callback(`来自原生的问候! 你说: ${data}`);
        }
      }
    });
  }

  build() {
    Column() {
      Web({ src: this.indexHtml, controller: this.webController })
        .width('100%')
        .height('80%')
        .onPageEnd(() => {
          this.jsBridge.setWebViewReady();
        })
      Button('调用网页方法')
        .onClick(() => {
          this.jsBridge.callHandler('webGreeting', '来自原生的问候!', {
            onResult: (result: string) => {
              console.log(`从网页接收到: ${result}`);
            }
          });
        })
    }
  }
}
