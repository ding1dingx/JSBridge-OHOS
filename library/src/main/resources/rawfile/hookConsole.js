;(function (console) {
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  function hook(method) {
    return function () {
      const args = Array.prototype.slice.call(arguments);
      const message = args
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg))
        .join(" ");
      window.HarmonyBridge.receiveConsole(`[${method.toUpperCase()}] ${message}`);
      originalConsole[method].apply(console, arguments);
    };
  }

  console.log = hook("log");
  console.info = hook("info");
  console.warn = hook("warn");
  console.error = hook("error");
  console.debug = hook("debug");
})(window.console);
