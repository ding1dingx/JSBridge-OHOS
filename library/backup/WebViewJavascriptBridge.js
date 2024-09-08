;(function () {
  "use strict";
  if (window.WebViewJavascriptBridge && window.WebViewJavascriptBridge.inited) {
    return;
  }

  let receiveMessageQueue = [];
  const messageHandlers = {};
  let sendMessageQueue = [];
  const responseCallbacks = {};
  let uniqueId = 1;
  let lastCallTime = 0;
  let stoId = null;
  let messagingIframe;
  let bizMessagingIframe;

  const FETCH_QUEUE_INTERVAL = 20;
  const CUSTOM_PROTOCOL_SCHEME = "yy";
  const QUEUE_HAS_MESSAGE = "__QUEUE_MESSAGE__";
  const CALLBACK_TIMEOUT = 60000;

  const _createQueueReadyIframe = () => {
    messagingIframe = document.createElement("iframe");
    messagingIframe.style.display = "none";
    messagingIframe.src = `${CUSTOM_PROTOCOL_SCHEME}:${QUEUE_HAS_MESSAGE}`;
    document.documentElement.appendChild(messagingIframe);
  };

  const _createQueueReadyIframe4biz = () => {
    bizMessagingIframe = document.createElement("iframe");
    bizMessagingIframe.style.display = "none";
    document.documentElement.appendChild(bizMessagingIframe);
  };

  const init = (messageHandler) => {
    if (WebViewJavascriptBridge._messageHandler) {
      _cleanup();
    }
    _createQueueReadyIframe();
    _createQueueReadyIframe4biz();
    WebViewJavascriptBridge._messageHandler = messageHandler;
    const receivedMessages = receiveMessageQueue;
    receiveMessageQueue = null;
    receivedMessages.forEach(_dispatchMessageFromNative);
    WebViewJavascriptBridge.inited = true;
    setInterval(_cleanupCallbacks, CALLBACK_TIMEOUT);
  };

  const _cleanup = () => {
    receiveMessageQueue = [];
    Object.keys(messageHandlers).forEach((key) => delete messageHandlers[key]);
    sendMessageQueue = [];
    Object.keys(responseCallbacks).forEach(
      (key) => delete responseCallbacks[key]
    );
    uniqueId = 1;
    lastCallTime = 0;
    if (stoId) {
      clearTimeout(stoId);
      stoId = null;
    }
    if (messagingIframe) {
      document.documentElement.removeChild(messagingIframe);
      messagingIframe = null;
    }
    if (bizMessagingIframe) {
      document.documentElement.removeChild(bizMessagingIframe);
      bizMessagingIframe = null;
    }
  };

  const _cleanupCallbacks = () => {
    const now = Date.now();
    Object.keys(responseCallbacks).forEach((key) => {
      const callback = responseCallbacks[key];
      if (callback.timestamp && now - callback.timestamp > CALLBACK_TIMEOUT) {
        delete responseCallbacks[key];
      }
    });
  };

  const send = (data, responseCallback) => {
    _doSend("send", data, responseCallback);
  };

  const registerHandler = (handlerName, handler) => {
    messageHandlers[handlerName] = handler;
  };

  const removeHandler = (handlerName) => {
    delete messageHandlers[handlerName];
  };

  const callHandler = (handlerName, data, responseCallback) => {
    if (arguments.length === 2 && typeof data === "function") {
      responseCallback = data;
      data = null;
    }
    _doSend(handlerName, data, responseCallback);
  };

  const _doSend = (handlerName, message, responseCallback) => {
    let callbackId = "";
    if (responseCallback) {
      callbackId =
        typeof responseCallback === "string"
          ? responseCallback
          : `cb_${uniqueId++}_${Date.now()}`;
      if (typeof responseCallback === "function") {
        responseCallbacks[callbackId] = {
          callback: responseCallback,
          timestamp: Date.now(),
        };
      }
    }
    const messageObject =
      typeof message === "string" ? { data: message } : message;
    if (callbackId) {
      messageObject.callbackId = callbackId;
    }
    try {
      const fn = WebViewJavascriptBridge[handlerName];
      if (typeof fn === "function") {
        const messageData = JSON.stringify(messageObject);
        const responseData = fn.call(
          WebViewJavascriptBridge,
          messageData,
          callbackId
        );
        if (responseData && responseCallbacks[callbackId]) {
          responseCallbacks[callbackId].callback(responseData);
          delete responseCallbacks[callbackId];
        }
      }
    } catch (e) {
      console.error(`WebViewJavascriptBridge:ERROR in _doSend`, e);
    }
    sendMessageQueue.push(messageObject);
    messagingIframe.src = `${CUSTOM_PROTOCOL_SCHEME}:${QUEUE_HAS_MESSAGE}`;
  };

  const _fetchQueue = () => {
    if (sendMessageQueue.length === 0) {
      return;
    }
    const currentTime = Date.now();
    if (currentTime - lastCallTime < FETCH_QUEUE_INTERVAL) {
      if (!stoId) {
        stoId = setTimeout(_fetchQueue, FETCH_QUEUE_INTERVAL);
      }
      return;
    }
    lastCallTime = currentTime;
    stoId = null;
    const messageQueueString = JSON.stringify(sendMessageQueue);
    sendMessageQueue = [];
    bizMessagingIframe.src = `${CUSTOM_PROTOCOL_SCHEME}:${encodeURIComponent(
      messageQueueString
    )}`;
  };

  const _dispatchMessageFromNative = (messageJSON) => {
    setTimeout(() => {
      let message;
      try {
        message =
          typeof messageJSON === "string"
            ? JSON.parse(messageJSON)
            : messageJSON;
      } catch (e) {
        console.error("WebViewJavascriptBridge: Failed to parse message", e);
        return;
      }
      if (!message || typeof message !== "object") {
        console.error("WebViewJavascriptBridge: Invalid message format");
        return;
      }
      let responseCallback;
      if (message.responseId) {
        const callbackInfo = responseCallbacks[message.responseId];
        if (!callbackInfo) {
          console.warn(
            "WebViewJavascriptBridge: Response callback not found",
            message.responseId
          );
          return;
        }
        responseCallback = callbackInfo.callback;
        responseCallback(message.responseData);
        delete responseCallbacks[message.responseId];
      } else {
        if (message.callbackId) {
          const callbackResponseId = message.callbackId;
          responseCallback = (responseData) =>
          _doSend("response", responseData, callbackResponseId);
        }
        let handler = WebViewJavascriptBridge._messageHandler;
        if (
          message.handlerName &&
            typeof messageHandlers[message.handlerName] === "function"
        ) {
          handler = messageHandlers[message.handlerName];
        }
        try {
          handler(message.data, responseCallback);
        } catch (exception) {
          console.error("WebViewJavascriptBridge: Error in handler", exception);
        }
      }
    });
  };

  const _handleMessageFromNative = (messageJSON) => {
    if (receiveMessageQueue) {
      receiveMessageQueue.push(messageJSON);
    } else {
      _dispatchMessageFromNative(messageJSON);
    }
  };

  WebViewJavascriptBridge.init = init;
  WebViewJavascriptBridge.doSend = send;
  WebViewJavascriptBridge.registerHandler = registerHandler;
  WebViewJavascriptBridge.callHandler = callHandler;
  WebViewJavascriptBridge._handleMessageFromNative = _handleMessageFromNative;
  WebViewJavascriptBridge._fetchQueue = _fetchQueue;

  const readyEvent = new CustomEvent("WebViewJavascriptBridgeReady", {
    detail: { bridge: WebViewJavascriptBridge },
  });
  readyEvent.bridge = WebViewJavascriptBridge;

  const jobs = window.WVJBCallbacks || [];
  window.WVJBCallbacks = [];
  jobs.forEach((job) => job(WebViewJavascriptBridge));
  
  document.dispatchEvent(readyEvent);
})();
