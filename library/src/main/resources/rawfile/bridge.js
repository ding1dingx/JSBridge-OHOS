;(function () {
  if (window.WebViewJavascriptBridge && window.WebViewJavascriptBridge.inited) {
    return;
  }

  var receiveMessageQueue = [];
  var messageHandlers = {};
  var sendMessageQueue = [];
  var responseCallbacks = {};
  var uniqueId = 1;
  var lastCallTime = 0;
  var stoId = null;
  var FETCH_QUEUE_INTERVAL = 20;
  var messagingIframe;
  var CUSTOM_PROTOCOL_SCHEME = "yy";
  var QUEUE_HAS_MESSAGE = "__QUEUE_MESSAGE__";

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
    var receivedMessages = receiveMessageQueue;
    receiveMessageQueue = null;
    for (var i = 0; i < receivedMessages.length; i++) {
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
    var callbackId;
    if (typeof responseCallback === "string") {
      callbackId = responseCallback;
    } else if (responseCallback) {
      callbackId = "cb_" + uniqueId++ + "_" + new Date().getTime();
      responseCallbacks[callbackId] = responseCallback;
      message.callbackId = callbackId;
    } else {
      callbackId = "";
    }
    try {
      var fn = eval("WebViewJavascriptBridge." + handlerName);
    } catch (e) {
      console.log(e);
    }
    if (typeof fn === "function") {
      var responseData = fn.call(WebViewJavascriptBridge, JSON.stringify(message), callbackId);
      if (responseData) {
        responseCallback = responseCallbacks[callbackId];
        if (!responseCallback) {
          return;
        }
        responseCallback(responseData);
        delete responseCallbacks[callbackId];
      }
    }
    sendMessageQueue.push(message);
    messagingIframe.src = CUSTOM_PROTOCOL_SCHEME + "://" + QUEUE_HAS_MESSAGE;
  }

  function _fetchQueue() {
    if (sendMessageQueue.length === 0) {
      return;
    }
    if (new Date().getTime() - lastCallTime < FETCH_QUEUE_INTERVAL) {
      if (!stoId) {
        stoId = setTimeout(_fetchQueue, FETCH_QUEUE_INTERVAL);
      }
      return;
    }
    lastCallTime = new Date().getTime();
    stoId = null;
    var messageQueueString = JSON.stringify(sendMessageQueue);
    sendMessageQueue = [];
    bizMessagingIframe.src =
      CUSTOM_PROTOCOL_SCHEME + "://return/_fetchQueue/" + encodeURIComponent(messageQueueString);
  }

  function _dispatchMessageFromNative(messageJSON) {
    setTimeout(function () {
      var message = JSON.parse(messageJSON);
      var responseCallback;
      if (message.responseId) {
        responseCallback = responseCallbacks[message.responseId];
        if (!responseCallback) {
          return;
        }
        responseCallback(message.responseData);
        delete responseCallbacks[message.responseId];
      } else {
        if (message.callbackId) {
          var callbackResponseId = message.callbackId;
          responseCallback = function (responseData) {
            _doSend("response", responseData, callbackResponseId);
          };
        }
        var handler = WebViewJavascriptBridge._messageHandler;
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
    }
    _dispatchMessageFromNative(messageJSON);
  }

  WebViewJavascriptBridge.init = init;
  WebViewJavascriptBridge.doSend = send;
  WebViewJavascriptBridge.registerHandler = registerHandler;
  WebViewJavascriptBridge.callHandler = callHandler;
  WebViewJavascriptBridge._handleMessageFromNative = _handleMessageFromNative;
  WebViewJavascriptBridge._fetchQueue = _fetchQueue;

  var readyEvent = document.createEvent("Events");
  var jobs = window.WVJBCallbacks || [];

  readyEvent.initEvent("WebViewJavascriptBridgeReady");
  readyEvent.bridge = WebViewJavascriptBridge;

  window.WVJBCallbacks = [];

  jobs.forEach(function (job) {
    job(WebViewJavascriptBridge);
  });

  document.dispatchEvent(readyEvent);
})();
