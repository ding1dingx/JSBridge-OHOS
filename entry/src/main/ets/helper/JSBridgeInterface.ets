import { JSON } from '@kit.ArkTS';
import { createLogger, JSBridgeHelper } from '@ding1ding/jsbridge-ohos';
import hilog from '@ohos.hilog';

const log = createLogger(0x1000, 'JSBridgeInterface');
log.setLogLevel(hilog.LogLevel.INFO);

export class JSBridgeInterface {
  private jsBridgeHelper: JSBridgeHelper;

  constructor(bridgeHelper: JSBridgeHelper) {
    this.jsBridgeHelper = bridgeHelper;
  }

  send(data: string, callbackId: string): string {
    log.info(`MainJavascriptInterface: method=send, data=>${data}, callbackId=>${callbackId}`);
    return "[--]";
  }

  response(data: string, responseId: string): void {
    log.info(`MainJavascriptInterface: method=response, data=>${data}, responseId=>${responseId}`);
    if (this.jsBridgeHelper.messageMap.hasKey(responseId)) {
      this.jsBridgeHelper.messageMap.remove(responseId)(data);
    }
  }

  deviceLoadJavascriptSuccess(
    data: string | object | null,
    callbackId: string
  ) {
    log.info(`MainJavascriptInterface: method=deviceLoadJavascriptSuccess data=>${data}, responseId=>${callbackId}`);
    const jsonString = '{"result":"HarmonyOS"}';
    this.jsBridgeHelper.sendResponse(JSON.parse(jsonString), callbackId);
  }

  submitFromWeb(data: string | object | null, callbackId: string) {
    log.info(`MainJavascriptInterface: method=submitFromWeb data=>${data}, responseId=>${callbackId}`);
    this.jsBridgeHelper.sendResponse("submitFromWeb response", callbackId);
  }
}
