import webview from '@ohos.web.webview';
import common from '@ohos.app.ability.common';
import resourceManager from '@ohos.resourceManager';
import { MessageHandler } from './MessageHandler';
import { Callback } from './Callback';
import { CallMessage } from './CallMessage';
import { ResponseMessage } from './ResponseMessage';
import { MessageSerializer } from './MessageSerializer';
import { Logger } from './Logger';

export class HarmonyJsBridge {
  private context: common.UIAbilityContext;
  private controller: webview.WebviewController;
  private messageHandlers: Map<string, MessageHandler<unknown, unknown>> = new Map();
  private responseCallbacks: Map<string, Callback<unknown>> = new Map();
  private uniqueId: number = 0;
  private isInjected: boolean = false;

  constructor(context: common.UIAbilityContext, controller: webview.WebviewController) {
    this.context = context;
    this.controller = controller;
  }

  async injectJavaScript() {
    const bridgeScript = await this.loadAsset('bridge.js');
    const consoleHookScript = await this.loadAsset('hookConsole.js');
    await this.controller.runJavaScript(bridgeScript);
    await this.controller.runJavaScript(consoleHookScript);
    await this.controller.runJavaScript(`
      window.HarmonyBridge = {
        postMessage: function(message) {
          HarmonyBridge_postMessage(JSON.stringify(message));
        }
      };
    `);
    this.isInjected = true;
  }

  setWebViewReady() {
    this.injectJavaScript();
  }

  private handleMessage(messageString: string) {
    try {
      const message = JSON.parse(messageString);
      if (message.responseId) {
        this.handleResponse(message);
      } else {
        this.handleRequest(message);
      }
    } catch (e) {
      Logger.e(`Error processing message: ${e}`);
    }
  }

  private handleResponse(responseMessage: ResponseMessage) {
    const callback = this.responseCallbacks.get(responseMessage.responseId);
    if (callback) {
      callback.onResult(responseMessage.responseData);
      this.responseCallbacks.delete(responseMessage.responseId);
    }
  }

  private handleRequest(message: CallMessage) {
    const handler = this.messageHandlers.get(message.handlerName);
    if (handler) {
      const responseCallback = message.callbackId
        ? (responseData: unknown) => this.sendResponse(message.callbackId, responseData)
        : undefined;
      (handler as MessageHandler<unknown, unknown>).handle(message.data, responseCallback);
    } else {
      Logger.w(`No handler for message from JavaScript: ${message.handlerName}`);
    }
  }

  private sendResponse(callbackId: string, responseData: unknown) {
    const message: ResponseMessage = {
      responseId: callbackId,
      responseData: responseData,
      callbackId: null,
      handlerName: null,
      data: null
    };
    this.dispatchMessage(MessageSerializer.serializeResponseMessage(message));
  }

  private async dispatchMessage(messageString: string) {
    const script = `WebViewJavascriptBridge.handleMessageFromNative('${messageString}');`;
    await this.controller.runJavaScript(script);
  }

  registerHandler<Input, Output>(handlerName: string, handler: MessageHandler<Input, Output>) {
    this.messageHandlers.set(handlerName, handler as MessageHandler<unknown, unknown>);
  }

  callHandler<T>(handlerName: string, data?: unknown, callback?: Callback<T>) {
    const callbackId = callback ? `harmony_cb_${++this.uniqueId}` : null;
    if (callbackId) {
      this.responseCallbacks.set(callbackId, callback as Callback<unknown>);
    }
    const message: CallMessage = { handlerName, data, callbackId };
    this.dispatchMessage(MessageSerializer.serializeCallMessage(message));
  }

  private async loadAsset(fileName: string): Promise<string> {
    try {
      const rawFile = await this.context.resourceManager.getRawFileContent(fileName);
      return String.fromCharCode.apply(null, new Uint8Array(rawFile.buffer));
    } catch (error) {
      Logger.e(`Error loading asset ${fileName}: ${error}`);
      return '';
    }
  }

  onWebMessage(data: string) {
    this.handleMessage(data);
  }
}
