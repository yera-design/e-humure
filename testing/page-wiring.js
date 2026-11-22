/* testing/page-wiring.js
   Catches the class of bug that made the setup page's button do nothing: a
   page that was truncated during an edit and lost its script tags, or a page
   that points at a script file that is not there.
   Usage: node testing/page-wiring.js
*/

var fs = require("fs");
var path = require("path");

var FRONTEND = path.join(__dirname, "..", "frontend");
var failures = [];

function check(name, condition, detail) {
  if (condition) { console.log("  PASS  " + name); return; }
  failures.push(name);
  console.log("  FAIL  " + name + (detail ? " -> " + detail : ""));
}

var pages = fs.readdirSync(FRONTEND).filter(function (file) { return /\.html$/.test(file); }).sort();
check("frontend has pages to check", pages.length > 0);

pages.forEach(function (page) {
  console.log("\n" + page);
  var html = fs.readFileSync(path.join(FRONTEND, page), "utf8");

  check("  document is closed", /<\/body>/i.test(html) && /<\/html>/i.test(html),
    "missing " + (/<\/body>/i.test(html) ? "</html>" : "</body>"));

  var sources = [];
  var pattern = /<script[^>]+src=["']([^"']+)["']/gi;
  var match;
  while ((match = pattern.exec(html)) !== null) sources.push(match[1]);

  sources.forEach(function (src) {
    if (/^https?:/i.test(src)) return;
    // A path starting with "/" is served from the project root, not from
    // frontend/. The server exposes /backend/scoring.js that way so the nurse
    // page and the server score with exactly the same code.
    var onDisk = src.charAt(0) === "/"
      ? path.join(FRONTEND, "..", src)
      : path.join(FRONTEND, src);
    check("  " + src + " exists", fs.existsSync(onDisk), onDisk);
  });

  // A page with a button that does something needs script behind it.
  var hasAction = /<button[^>]*id=/i.test(html);
  var hasInline = /<script>[\s\S]*?<\/script>/i.test(html);
  if (hasAction) {
    check("  interactive page loads a script", sources.length > 0 || hasInline,
      "buttons with ids but no script at all");
  }

  // Inline blocks must parse, or the whole page's script dies silently.
  var inlinePattern = /<script>([\s\S]*?)<\/script>/gi;
  var index = 0;
  var inline;
  while ((inline = inlinePattern.exec(html)) !== null) {
    index += 1;
    var code = inline[1];
    if (!code.trim()) continue;
    var ok = true;
    var reason = "";
    try { new Function(code); } catch (error) { ok = false; reason = error.message; }
    check("  inline script " + index + " parses", ok, reason);
  }
});

if (failures.length) {
  console.log("\n" + failures.length + " check(s) failed.");
  process.exit(1);
}
console.log("\nAll pages wired correctly.");
