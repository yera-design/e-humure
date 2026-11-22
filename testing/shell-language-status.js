/* testing/shell-language-status.js
   Regression test for the frozen status bar.
   shell-language.js caches each element's first text as its English source and a
   MutationObserver rewrites that cached text after every DOM change. Any element
   whose text is updated later (status bars, loading text, dynamic lists) was
   pinned to the first string it ever showed, so "Saving facility...",
   "Loading audit entries..." and "Submitting your access request..." could never
   be replaced by the success or error message.
   Runs against a minimal DOM stub: no browser or network needed.
   Usage: node testing/shell-language-status.js [path/to/shell-language.js]
*/

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var target = process.argv[2] || path.join(__dirname, "..", "frontend", "js", "shell-language.js");

function makeElement(tag, text, attrs) {
  var listeners = {};
  var el = {
    tagName: tag.toUpperCase(),
    children: [],
    attributes: Object.assign({}, attrs || {}),
    _text: text || "",
    classList: { toggle: function () {}, add: function () {}, remove: function () {} },
    getAttribute: function (name) { return Object.prototype.hasOwnProperty.call(el.attributes, name) ? el.attributes[name] : null; },
    setAttribute: function (name, value) { el.attributes[name] = String(value); },
    hasAttribute: function (name) { return Object.prototype.hasOwnProperty.call(el.attributes, name); },
    addEventListener: function (type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    dispatch: function (type) { (listeners[type] || []).forEach(function (fn) { fn.call(el, {}); }); }
  };
  Object.defineProperty(el, "textContent", {
    get: function () { return el._text; },
    set: function (value) { el._text = String(value); el._doc && el._doc._notify(); }
  });
  return el;
}

function makeDocument(elements) {
  var observers = [];
  var doc = {
    documentElement: { lang: "en" },
    body: {},
    _notify: function () { observers.forEach(function (fn) { fn(); }); },
    querySelectorAll: function (selector) {
      if (selector === "[data-shell-lang]") return elements.filter(function (el) { return el.hasAttribute("data-shell-lang"); });
      if (selector === "input[placeholder]") return elements.filter(function (el) { return el.tagName === "INPUT" && el.hasAttribute("placeholder"); });
      return elements.filter(function (el) { return el.tagName !== "INPUT"; });
    },
    addEventListener: function () {},
    dispatchEvent: function () {}
  };
  elements.forEach(function (el) { el._doc = doc; });
  doc._observers = observers;
  return doc;
}

function load(doc) {
  var store = {};
  var sandbox = {
    document: doc,
    window: {},
    console: console,
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); }
    },
    CustomEvent: function (type, init) { return { type: type, detail: init && init.detail }; },
    MutationObserver: function (callback) {
      var self = this;
      self._active = false;
      self.observe = function () {
        if (self._active) return;
        self._active = true;
        doc._observers.push(self._fn);
      };
      self.disconnect = function () {
        self._active = false;
        var i = doc._observers.indexOf(self._fn);
        if (i >= 0) doc._observers.splice(i, 1);
      };
      self._fn = function () { callback([], self); };
    }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(target, "utf8"), sandbox, { filename: target });
  return sandbox;
}

var failures = [];
function check(name, condition, detail) {
  if (condition) { console.log("  PASS  " + name); return; }
  failures.push(name);
  console.log("  FAIL  " + name + (detail ? " -> " + detail : ""));
}

console.log("shell-language status messages (" + path.relative(process.cwd(), target) + ")");

// 1. A status element must be replaceable after it has shown a first message.
var status = makeElement("p", "", { id: "setup-message" });
var heading = makeElement("h1", "Create the first system administrator", {});
var doc = makeDocument([status, heading]);
load(doc);

status.textContent = "Creating the first system administrator\u2026";
status.textContent = "Administrator created successfully. Sign in with this facility, your username, and your password.";
check("success message replaces the pending message", status.textContent.indexOf("Administrator created") === 0, "got: " + status.textContent);

// 2. Same for an error message, and for a third update in a row.
status.textContent = "Setup failed. Check the details and try again.";
check("error message replaces the success message", status.textContent.indexOf("Setup failed") === 0, "got: " + status.textContent);

// 3. Static text must still translate when the language changes.
var doc2Status = makeElement("p", "", { id: "message" });
var doc2Button = makeElement("button", "Submit request", {});
var doc2 = makeDocument([doc2Status, doc2Button]);
var sandbox2 = load(doc2);
sandbox2.applyShellLanguage("rw");
check("static button still translates to Kinyarwanda", doc2Button.textContent === "Ohereza ubusabe", "got: " + doc2Button.textContent);

// 4. A dynamic status written while Kinyarwanda is active must survive, and be
//    translated when the dictionary has the string.
doc2Status.textContent = "Saving facility\u2026";
check("dynamic status is not reverted under Kinyarwanda", doc2Status.textContent === "Kubika ivuriro\u2026" || doc2Status.textContent === "Saving facility\u2026", "got: " + doc2Status.textContent);
doc2Status.textContent = "Facility and administrator created. Staff can now request access to that facility.";
check("dynamic status can change again under Kinyarwanda", doc2Status.textContent.indexOf("Saving") < 0 && doc2Status.textContent.indexOf("Kubika") < 0, "got: " + doc2Status.textContent);

// 5. Switching back to English restores the English source.
sandbox2.applyShellLanguage("en");
check("switching back to English restores the button label", doc2Button.textContent === "Submit request", "got: " + doc2Button.textContent);

if (failures.length) {
  console.log("\n" + failures.length + " check(s) failed.");
  process.exit(1);
}
console.log("\nAll checks passed.");
