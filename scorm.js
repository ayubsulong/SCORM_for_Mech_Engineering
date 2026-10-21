/* Minimal SCORM 1.2 wrapper with localStorage fallback for offline preview */
var SCORM = (function () {
  var api = null, connected = false, startTime = new Date(), finished = false;
  var LS = "nitinol_module_local_";

  function findAPI(win) {
    var tries = 0;
    while (win && !win.API && win.parent && win.parent !== win && tries < 10) { win = win.parent; tries++; }
    return win && win.API ? win.API : null;
  }
  function locateAPI() {
    var a = findAPI(window);
    if (!a && window.opener) { try { a = findAPI(window.opener); } catch (e) {} }
    return a;
  }
  function pad(n, l) { n = String(n); while (n.length < l) n = "0" + n; return n; }
  function sessionTime() {
    var s = Math.floor((new Date() - startTime) / 1000);
    return pad(Math.floor(s / 3600), 4) + ":" + pad(Math.floor((s % 3600) / 60), 2) + ":" + pad(s % 60, 2);
  }

  return {
    init: function () {
      api = locateAPI();
      if (api) {
        connected = String(api.LMSInitialize("")) === "true";
        if (connected && this.get("cmi.core.lesson_status") === "not attempted") {
          this.set("cmi.core.lesson_status", "incomplete");
          this.commit();
        }
      }
      return connected;
    },
    isConnected: function () { return connected; },
    get: function (k) {
      if (connected) return String(api.LMSGetValue(k));
      try { return localStorage.getItem(LS + k) || ""; } catch (e) { return ""; }
    },
    set: function (k, v) {
      if (connected) return String(api.LMSSetValue(k, String(v))) === "true";
      try { localStorage.setItem(LS + k, String(v)); } catch (e) {}
      return true;
    },
    commit: function () { if (connected) api.LMSCommit(""); },
    finish: function () {
      if (finished) return;
      finished = true;
      if (connected) {
        api.LMSSetValue("cmi.core.session_time", sessionTime());
        api.LMSSetValue("cmi.core.exit", "suspend");
        api.LMSCommit("");
        api.LMSFinish("");
        connected = false;
      }
    },
    saveTime: function () { if (connected) api.LMSSetValue("cmi.core.session_time", sessionTime()); }
  };
})();

window.addEventListener("beforeunload", function () { SCORM.finish(); });
window.addEventListener("unload", function () { SCORM.finish(); });
