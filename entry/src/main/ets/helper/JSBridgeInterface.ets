import { JSON } from '@kit.ArkTS';
import { createLoggerWithOptions, JSBridgeHelper } from '@ding1ding/jsbridge-ohos';
import hilog from '@ohos.hilog';

const log = createLoggerWithOptions({
  domain: 0x0000,
  tag: "JSBridgeInterface",
  logLevel: hilog.LogLevel.INFO
});

export class JSBridgeInterface {
  private jsBridgeHelper: JSBridgeHelper;

  constructor(bridgeHelper: JSBridgeHelper) {
    this.jsBridgeHelper = bridgeHelper;
  }

  send(data: string, callbackId: string): string {
    log.info(`method=send, data=>${data}, callbackId=>${callbackId}`);
    return "[--]";
  }

  response(data: string, responseId: string): void {
    log.info(`method=response, data=>${data}, responseId=>${responseId}`);
    if (this.jsBridgeHelper.responseCallbacks.hasKey(responseId)) {
      this.jsBridgeHelper.responseCallbacks.remove(responseId)(data);
    }
  }

  deviceLoadJavascriptSuccess(
    data: string | object | null,
    callbackId: string
  ) {
    log.info(`method=deviceLoadJavascriptSuccess data=>${data}, responseId=>${callbackId}`);
    const jsonString = '{"result":"HarmonyOS"}';
    this.jsBridgeHelper.sendResponse(JSON.parse(jsonString), callbackId);
  }

  submitFromWeb(data: string | object | null, callbackId: string) {
    log.info(`method=submitFromWeb data=>${data}, responseId=>${callbackId}`);
    this.jsBridgeHelper.sendResponse("submitFromWeb response", callbackId);
  }
}
