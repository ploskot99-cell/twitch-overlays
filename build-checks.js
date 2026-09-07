/* ==========================================================================
   build-checks.js — what both builders refuse to ship.

   Its own module on purpose. These checks are mostly regular expressions, and
   this project's shell eats backslashes out of heredocs, so every attempt to
   generate them from another script arrived with the escapes stripped. A file
   written directly has nothing to lose on the way.
   ========================================================================== */

function fail(label, problem, detail) {
  console.error('');
  console.error('  ✗ ' + label + ' ' + problem);
  if (detail) console.error('    ' + detail);
  console.error('    Nothing was written. Fix it and build again.');
  console.error('');
  process.exit(1);
}

/* A broken script renders nothing at all and explains itself only in a
   console nobody has open in the middle of a stream. */
function assertParses(label, code) {
  try {
    new Function(code);
  } catch (err) {
    fail(label, 'does not parse: ' + err.message);
  }
}

/* Names a page may use without declaring them itself. */
const PROVIDED = new Set([
  'Bus', 'Connect', 'Params', 'Overlay', 'Fmt', 'Sound', 'Queue', 'Demo',
  'OverlayConfig', 'startOverlay',
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame',
  'parseFloat', 'parseInt', 'isNaN', 'encodeURIComponent', 'decodeURIComponent',
  'String', 'Number', 'Boolean', 'Math', 'Object', 'Array', 'Date', 'JSON',
  'Promise', 'Set', 'Map', 'Error', 'RegExp',
  'document', 'window', 'console', 'performance', 'fetch', 'Audio',
  'URL', 'URLSearchParams', 'CustomEvent', 'WebSocket', 'Image',
  /* keywords the call pattern cannot tell apart from a function name */
  'function', 'if', 'for', 'while', 'switch', 'catch', 'return', 'typeof',
  'new', 'delete', 'void', 'do', 'else', 'try', 'throw', 'in', 'of'
]);

/* Strings and comments are full of things that look like calls — rgba(),
   translate(), url() — so they are blanked before anything is counted. */
function stripLiterals(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
}

/* A call to a function that no longer exists is not a syntax error, so the
   parse check sails straight past it — which is how an edit that deleted two
   helpers left a page that loaded and then quietly did nothing at all. */
function assertCallsResolve(label, code) {
  const src = stripLiterals(code);
  const declared = new Set();

  function addAll(text) {
    String(text || '').split(',').forEach(function (name) {
      const clean = name.trim();
      if (clean) declared.add(clean);
    });
  }

  let m;

  const named = /function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g;
  while ((m = named.exec(src))) { declared.add(m[1]); addAll(m[2]); }

  const anon = /function\s*\(([^)]*)\)/g;
  while ((m = anon.exec(src))) addAll(m[1]);

  const bound = /(?:var|let|const)\s+([A-Za-z_$][\w$]*)/g;
  while ((m = bound.exec(src))) declared.add(m[1]);

  const prop = /([A-Za-z_$][\w$]*)\s*:\s*function/g;
  while ((m = prop.exec(src))) declared.add(m[1]);

  const missing = new Set();
  const calls = /(^|[^.\w$])([a-z][\w$]*)\s*\(/g;
  while ((m = calls.exec(src))) {
    const name = m[2];
    if (!declared.has(name) && !PROVIDED.has(name)) missing.add(name);
  }

  if (missing.size) {
    fail(label, 'calls something that is not defined anywhere in it:',
      Array.from(missing).join(', '));
  }
}

function assertPageScripts(label, html) {
  /* split rather than match: one less pattern to get wrong */
  const open = '<script>';
  const close = '</' + 'script>';
  const parts = html.split(open);

  for (let i = 1; i < parts.length; i++) {
    const end = parts[i].indexOf(close);
    if (end === -1) continue;
    const code = parts[i].slice(0, end);
    const where = label + ' (inline block ' + i + ')';
    assertParses(where, code);
    assertCallsResolve(where, code);
  }
}

module.exports = { assertParses, assertCallsResolve, assertPageScripts };
