;(function () {
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

  function _createQueueReadyIframe() {
    messagingIframe = document.createElement("iframe");
    messagingIframe.style.display = "none";
    messagingIframe.src = CUSTOM_PROTOCOL_SCHEME + "://" + QUEUE_HAS_MESSAGE;
    document.documentElement.appendChild(messagingIframe);
  }

  function _createQueueReadyIframe4biz() {
    bizMessagingIframe = document.createElement("iframe");
    bizMessagingIframe.style.display = "none";
    document.documentElement.appendChild(bizMessagingIframe);
  }

  function init(messageHandler) {
    if (WebViewJavascriptBridge._messageHandler) {
      throw new Error("WebViewJavascriptBridge.init called twice");
    }
    _createQueueReadyIframe();
    _createQueueReadyIframe4biz();
    WebViewJavascriptBridge._messageHandler = messageHandler;
    const receivedMessages = receiveMessageQueue;
    receiveMessageQueue = null;
    for (let i = 0; i < receivedMessages.length; i++) {
      _dispatchMessageFromNative(receivedMessages[i]);
    }
    WebViewJavascriptBridge.inited = true;
  }

  function send(data, responseCallback) {
    _doSend("send", data, responseCallback);
  }

  function registerHandler(handlerName, handler) {
    messageHandlers[handlerName] = handler;
  }

  function removeHandler(handlerName, handler) {
    delete messageHandlers[handlerName];
  }

  function callHandler(handlerName, data, responseCallback) {
    if (arguments.length == 2 && typeof data == "function") {
      responseCallback = data;
      data = null;
    }
    _doSend(handlerName, data, responseCallback);
  }

  function _doSend(handlerName, message, responseCallback) {
    let callbackId = "";
    if (responseCallback) {
      callbackId =
        typeof responseCallback === "string" ? responseCallback : `cb_${uniqueId++}_${Date.now()}`;

      if (typeof responseCallback === "function") {
        responseCallbacks[callbackId] = responseCallback;
      }
    }

    if (callbackId) {
      message.callbackId = callbackId;
    }

    try {
      const fn = eval("WebViewJavascriptBridge." + handlerName);
      if (typeof fn === "function") {
        const responseData = fn.call(WebViewJavascriptBridge, JSON.stringify(message), callbackId);
        if (responseData && responseCallbacks[callbackId]) {
          responseCallbacks[callbackId](responseData);
          delete responseCallbacks[callbackId];
        }
      }
    } catch (e) {
      console.log(e);
    }
    sendMessageQueue.push(message);
    messagingIframe.src = CUSTOM_PROTOCOL_SCHEME + "://" + QUEUE_HAS_MESSAGE;
  }

  function _fetchQueue() {
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
    bizMessagingIframe.src =
      CUSTOM_PROTOCOL_SCHEME + "://return/_fetchQueue/" + encodeURIComponent(messageQueueString);
  }

  function _dispatchMessageFromNative(messageJSON) {
    setTimeout(function () {
      const message = JSON.parse(messageJSON);
      let responseCallback;
      if (message.responseId) {
        responseCallback = responseCallbacks[message.responseId];
        if (!responseCallback) {
          return;
        }
        responseCallback(message.responseData);
        delete responseCallbacks[message.responseId];
      } else {
        if (message.callbackId) {
          const callbackResponseId = message.callbackId;
          responseCallback = function (responseData) {
            _doSend("response", responseData, callbackResponseId);
          };
        }
        let handler = WebViewJavascriptBridge._messageHandler;
        if (message.handlerName) {
          handler = messageHandlers[message.handlerName];
        }
        try {
          handler(message.data, responseCallback);
        } catch (exception) {
          if (typeof console != "undefined") {
            console.log(
              "WebViewJavascriptBridge: WARNING: javascript handler threw.",
              message,
              exception
            );
          }
        }
      }
    });
  }

  function _handleMessageFromNative(messageJSON) {
    if (receiveMessageQueue) {
      receiveMessageQueue.push(messageJSON);
    } else {
      _dispatchMessageFromNative(messageJSON);
    }
  }

  WebViewJavascriptBridge.init = init;
  WebViewJavascriptBridge.doSend = send;
  WebViewJavascriptBridge.registerHandler = registerHandler;
  WebViewJavascriptBridge.callHandler = callHandler;
  WebViewJavascriptBridge._handleMessageFromNative = _handleMessageFromNative;
  WebViewJavascriptBridge._fetchQueue = _fetchQueue;

  const readyEvent = document.createEvent("Events");
  const jobs = window.WVJBCallbacks || [];

  readyEvent.initEvent("WebViewJavascriptBridgeReady");
  readyEvent.bridge = WebViewJavascriptBridge;

  window.WVJBCallbacks = [];

  jobs.forEach(function (job) {
    job(WebViewJavascriptBridge);
  });

  document.dispatchEvent(readyEvent);
})();
