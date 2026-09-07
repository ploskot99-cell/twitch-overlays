/* ==========================================================================
   make-se.js — turn the overlays into StreamElements custom widgets.

     node make-se.js nikos            → dist/nikos-se/<overlay>/
     node make-se.js nikos --all      (same; --all here means every overlay)
     node make-se.js --clients        → every client in clients/

   StreamElements custom widgets are four boxes: HTML, CSS, JS and Fields.
   This flattens a page — theme, overlay styles, skin, config and scripts —
   into exactly those four files, ready to paste.

   The overlays are unchanged: they already know how to wait for widget
   fields (window.SE_DEFER) and how to read StreamElements events
   (the 'se' source in connect.js).
   ========================================================================== */

const fs = require('fs');
const path = require('path');

const root = __dirname;
const NL = String.fromCharCode(10);
const OVERLAYS = ['alerts', 'goal', 'chat', 'labels', 'scene'];

/* --------------------------------------------------------------------------
   Which settings each widget exposes in the StreamElements sidebar.

   A field named after a URL parameter (pos, duration, label …) is picked up
   automatically, because Params.get() reads widget fields first.
   A field named "cfg.<dotted.path>" is written straight into OverlayConfig,
   which is how the deeper settings are reached.
   -------------------------------------------------------------------------- */

const POSITIONS = {
  'top-left': 'Πάνω αριστερά', 'top-center': 'Πάνω κέντρο', 'top-right': 'Πάνω δεξιά',
  'center-left': 'Μέση αριστερά', 'center': 'Κέντρο', 'center-right': 'Μέση δεξιά',
  'bottom-left': 'Κάτω αριστερά', 'bottom-center': 'Κάτω κέντρο', 'bottom-right': 'Κάτω δεξιά'
};

function skinField() {
  const options = {};
  listSkins().forEach(function (name) {
    options[name] = name.charAt(0).toUpperCase() + name.slice(1);
  });
  return { type: 'dropdown', label: 'Στυλ', value: 'default',
           options: options, group: 'Εμφάνιση' };
}

function common(pos) {
  return {
    skin: skinField(),
    pos: { type: 'dropdown', label: 'Θέση', value: pos, options: POSITIONS, group: 'Διάταξη' },
    scale: { type: 'number', label: 'Μέγεθος (1 = κανονικό)', value: 1, step: 0.05, min: 0.5, max: 2.5, group: 'Διάταξη' },
    variant: { type: 'dropdown', label: 'Χρώμα', value: 'default',
               options: { default: 'Κανονικό', mono: 'Χωρίς χρώμα', crimson: 'Κόκκινο',
                          frost: 'Παγωμένο', jade: 'Νεφρίτης', lilac: 'Μωβ',
                          custom: 'Δικό μου χρώμα ↓' },
               group: 'Εμφάνιση' },
    accent: { type: 'colorpicker', label: 'Δικό μου χρώμα (ενεργό στο «Δικό μου χρώμα»)',
              value: '#a855f7', group: 'Εμφάνιση' }
  };
}

const FIELDS = {
  alerts: Object.assign(common('top-center'), {
    duration: { type: 'number', label: 'Πόσο μένει στην οθόνη (ms)', value: 6500, step: 250, min: 2000, max: 20000, group: 'Alert' },
    gap: { type: 'number', label: 'Κενό ανάμεσα σε alerts (ms)', value: 600, step: 100, min: 0, max: 5000, group: 'Alert' },
    panel: { type: 'checkbox', label: 'Πλαίσιο πίσω από το κείμενο', value: false, group: 'Εμφάνιση' },
    width: { type: 'number', label: 'Μέγιστο πλάτος κάρτας (px)', value: 640, step: 20, min: 320, max: 1400, group: 'Διάταξη' },
    'cfg__alerts__minCheer': { type: 'number', label: 'Ελάχιστα bits για alert', value: 100, step: 10, min: 0, group: 'Φίλτρα' },
    'cfg__alerts__minTip': { type: 'number', label: 'Ελάχιστη δωρεά για alert', value: 1, step: 1, min: 0, group: 'Φίλτρα' },
    'cfg__alerts__soundBase': { type: 'text', label: 'URL φακέλου με τα mp3 (κενό = χωρίς ήχο)', value: '', group: 'Ήχος' },
    'cfg__alerts__volume': { type: 'number', label: 'Ένταση (0–1)', value: 0.6, step: 0.05, min: 0, max: 1, group: 'Ήχος' },
    'cfg__alerts__sounds__follow': { type: 'text', label: 'Ήχος — Follow', value: '', group: 'Ήχος' },
    'cfg__alerts__sounds__sub': { type: 'text', label: 'Ήχος — Sub', value: '', group: 'Ήχος' },
    'cfg__alerts__sounds__resub': { type: 'text', label: 'Ήχος — Resub', value: '', group: 'Ήχος' },
    'cfg__alerts__sounds__subgift': { type: 'text', label: 'Ήχος — Gift sub', value: '', group: 'Ήχος' },
    'cfg__alerts__sounds__subbomb': { type: 'text', label: 'Ήχος — Gift bomb', value: '', group: 'Ήχος' },
    'cfg__alerts__sounds__cheer': { type: 'text', label: 'Ήχος — Bits', value: '', group: 'Ήχος' },
    'cfg__alerts__sounds__raid': { type: 'text', label: 'Ήχος — Raid', value: '', group: 'Ήχος' },
    'cfg__alerts__sounds__tip': { type: 'text', label: 'Ήχος — Δωρεά', value: '', group: 'Ήχος' },
    'cfg__alerts__templates__follow__eyebrow': { type: 'text', label: 'Follow — μικρό κείμενο', value: 'ΝΕΟ FOLLOW', group: 'Κείμενα' },
    'cfg__alerts__templates__follow__sub': { type: 'text', label: 'Follow — από κάτω', value: 'καλώς ήρθες!', group: 'Κείμενα' },
    'cfg__alerts__templates__sub__eyebrow': { type: 'text', label: 'Sub — μικρό κείμενο', value: 'ΝΕΟ SUB', group: 'Κείμενα' },
    'cfg__alerts__templates__sub__sub': { type: 'text', label: 'Sub — από κάτω', value: 'Tier {tier}', group: 'Κείμενα' },
    'cfg__alerts__templates__raid__sub': { type: 'text', label: 'Raid — από κάτω', value: 'έφερε {viewers} άτομα!', group: 'Κείμενα' },
    'cfg__alerts__templates__cheer__eyebrow': { type: 'text', label: 'Bits — μικρό κείμενο', value: '{amount} BITS', group: 'Κείμενα' }
  }),

  goal: Object.assign(common('bottom-left'), {
    label: { type: 'text', label: 'Τίτλος', value: 'Follower Goal', group: 'Goal' },
    current: { type: 'number', label: 'Πού είμαστε τώρα', value: 0, step: 1, min: 0, group: 'Goal' },
    target: { type: 'number', label: 'Στόχος', value: 500, step: 1, min: 1, group: 'Goal' },
    count: { type: 'text', label: 'Ποια events μετράνε (χωρισμένα με κόμμα)', value: 'follow', group: 'Goal' }
  }),

  chat: Object.assign(common('bottom-left'), {
    max: { type: 'number', label: 'Πόσα μηνύματα στην οθόνη', value: 12, step: 1, min: 1, max: 40, group: 'Chat' },
    fade: { type: 'number', label: 'Δευτερόλεπτα πριν σβήσει (0 = ποτέ)', value: 90, step: 5, min: 0, group: 'Chat' },
    'cfg__chat__hideCommands': { type: 'checkbox', label: 'Κρύψε μηνύματα που ξεκινούν με !', value: true, group: 'Chat' },
    'cfg__chat__showEmotes': { type: 'checkbox', label: 'Δείξε emotes', value: true, group: 'Chat' },
    'cfg__chat__showBadges': { type: 'checkbox', label: 'Δείξε badges', value: true, group: 'Chat' }
  }),

  labels: Object.assign(common('bottom-right'), {
    layout: { type: 'dropdown', label: 'Εμφάνιση', value: 'rotate',
              options: { rotate: 'Εναλλαγή ένα-ένα', stack: 'Όλα μαζί' }, group: 'Labels' },
    rotate: { type: 'number', label: 'Δευτερόλεπτα ανά stat', value: 8, step: 1, min: 2, max: 60, group: 'Labels' },
    show: { type: 'text', label: 'Ποια stats (χωρισμένα με κόμμα)', value: 'follower,sub,cheer,tip,uptime', group: 'Labels' }
  }),

  scene: Object.assign(common('center'), {
    mode: { type: 'dropdown', label: 'Οθόνη', value: 'starting',
            options: { starting: 'Ξεκινάμε σε λίγο', brb: 'Διάλειμμα', ended: 'Τέλος' }, group: 'Scene' },
    t: { type: 'number', label: 'Αντίστροφη μέτρηση (δευτερόλεπτα, 0 = χωρίς)', value: 300, step: 10, min: 0, group: 'Scene' },
    title: { type: 'text', label: 'Τίτλος', value: '', group: 'Κείμενα' },
    sub: { type: 'text', label: 'Υπότιτλος', value: '', group: 'Κείμενα' },
    ticker: { type: 'text', label: 'Κυλιόμενα μηνύματα (χωρισμένα με κόμμα)', value: '', group: 'Κείμενα' },
    channel: { type: 'text', label: 'Κανάλι (για το twitch.tv/… πάνω αριστερά)', value: '', group: 'Κείμενα' }
  })
};

/* the scene fills the whole canvas, so a position dropdown is noise */
delete FIELDS.scene.pos;

/* StreamElements drops a widget into a box on its own canvas. The overlays
   position themselves against the viewport, which is right in OBS — the page
   is the whole screen — and wrong here: fixed positioning would pin an alert
   to the corner of the entire overlay instead of the box the streamer sized
   and placed. Inside the widget everything lays out against .se-root. */
const SE_LAYOUT = [
  '/* ===== streamelements layout ===== */',
  '.se-root { position: relative; width: 100%; height: 100%; }',
  '.se-root .anchor { position: absolute; }'
].join('\n');

/* Both builders share the same refusals — see build-checks.js. */
const { assertParses, assertCallsResolve, assertPageScripts } = require('./build-checks.js');
/* --- pulling a page apart -------------------------------------------------- */

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

/* CSS @import rules are only honoured at the very top of a stylesheet, so
   they are hoisted out of every part and re-emitted first. */
function mergeCss(parts) {
  const imports = [];
  const body = parts.map(function (part) {
    return part.replace(/^[ \t]*@import.*;[ \t]*$/gm, function (line) {
      const trimmed = line.trim();
      if (imports.indexOf(trimmed) === -1) imports.push(trimmed);
      return '';
    });
  });
  return imports.join('\n') + (imports.length ? '\n\n' : '') + body.join('\n\n');
}

function extract(overlay) {
  const page = read(path.join('overlays', overlay + '.html'));
  assertPageScripts(overlay + '.html', page);

  const style = (page.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];

  const bodyMatch = page.match(/<body[^>]*>([\s\S]*?)<\/body>/);
  const bodyClass = (page.match(/<body class="([^"]*)"/) || [, ''])[1];
  const markup = bodyMatch[1].replace(/<script[\s\S]*?<\/script>/g, '').trim();

  /* the last script block on the page is the overlay's own code */
  const scripts = page.match(/<script>([\s\S]*?)<\/script>/g) || [];
  const code = scripts[scripts.length - 1]
    .replace(/^<script>/, '')
    .replace(/<\/script>$/, '')
    .trim();

  return { style: style, markup: markup, code: code, bodyClass: bodyClass };
}

/* --- the bootstrap that glues us to StreamElements ------------------------- */

function bootstrap(overlay, bodyClass, defaultSkin) {
  return [
    '/* ---------------------------------------------------------------',
    '   StreamElements bridge. Fields arrive with onWidgetLoad, so the',
    '   overlay is held back until they do.',
    '   --------------------------------------------------------------- */',
    'window.SE_DEFER = true;',
    '',
    'window.addEventListener(\'onWidgetLoad\', function (obj) {',
    '  var detail = (obj && obj.detail) || {};',
    '  var fields = detail.fieldData || {};',
    '',
    '  window.SE_FIELDS = fields;',
    '',
    '  /* Every skin travels inside this bundle; the dropdown picks one and',
    '     it is injected last, so it overrides the CSS box exactly the way a',
    '     skin file overrides the stylesheets in the standalone pages. */',
    '  var table = window.OverlaySkins || {};',
    '  var chosen = fields.skin && table[fields.skin] !== undefined',
    '    ? fields.skin : ' + JSON.stringify(defaultSkin) + ';',
    '  /* Which skin was asked for, which one actually went on, and what was',
    '     available to choose from. Read it in the console with',
    '     window.__overlaySkin if a widget ever comes out looking plain. */',
    '  window.__overlaySkin = { asked: fields.skin || null, resolved: chosen,',
    '                           available: Object.keys(table), applied: false };',
    '',
    '  if (table[chosen]) {',
    '    var skinStyle = document.createElement("style");',
    '    skinStyle.setAttribute("data-skin", chosen);',
    '    skinStyle.textContent = table[chosen];',
    '    document.head.appendChild(skinStyle);',
    '    window.__overlaySkin.applied = true;',
    '',
    '    /* and keep it last, in case the widget stylesheet lands later */',
    '    var keepLast = function () {',
    '      if (skinStyle.parentNode === document.head) document.head.appendChild(skinStyle);',
    '    };',
    '    setTimeout(keepLast, 0);',
    '    setTimeout(keepLast, 500);',
    '    setTimeout(keepLast, 2000);',
    '    window.addEventListener("load", keepLast);',
    '  } else {',
    '    console.error("[overlay] skin \\"" + chosen + "\\" is not in this build. Available: " +',
    '      Object.keys(table).join(", ") + ". Re-paste the JS tab.");',
    '  }',
    '',
    '  /* "cfg__a__b__c" fields are written straight into OverlayConfig.',
    '     Dots cannot be used in a field name: StreamElements reads them as',
    '     paths of its own and the setting never saves. */',
    '  Object.keys(fields).forEach(function (key) {',
    '    var parts;',
    '    if (key.indexOf("cfg__") === 0) parts = key.slice(5).split("__");',
    '    else if (key.indexOf("cfg.") === 0) parts = key.slice(4).split(".");',
    '    else return;',
    '    var node = window.OverlayConfig;',
    '    for (var i = 0; i < parts.length - 1; i++) {',
    '      node = node[parts[i]] || (node[parts[i]] = {});',
    '    }',
    '    node[parts[parts.length - 1]] = fields[key];',
    '  });',
    '',
    '  /* events come from the widget itself, not from a socket we open */',
    '  window.OverlayConfig.sources = [\'se\'];',
    '',
    '  /* the widget owns this div, not the page it is dropped into */',
    '  window.OverlayRoot = document.querySelector(".se-root") || document.body;',
    '  window.OverlayRoot.className = "se-root " + ' + JSON.stringify(bodyClass) + ';',
    '  startOverlay();',
    '});'
  ].join('\n');
}

/* Every skin folder, so the streamer can switch between them from the SE
   panel instead of us rebuilding. */
function listSkins() {
  const dir = path.join(root, 'skins');
  return fs.readdirSync(dir).filter(function (name) {
    return fs.existsSync(path.join(dir, name, 'skin.css'));
  }).sort(function (a, b) {
    return a === 'default' ? -1 : b === 'default' ? 1 : a.localeCompare(b);
  });
}

/* --- build ----------------------------------------------------------------- */

function buildOverlay(spec, options) {
  const overlay = spec.id;
  const key = spec.as || overlay;          /* a second instance gets its own folder */
  const part = extract(overlay);
  const skin = options.skin || 'default';
  const out = path.join(root, 'dist', options.name + '-se', key);

  fs.mkdirSync(out, { recursive: true });


  /* every skin travels in the bundle so the dropdown can switch them */
  /* Every skin's @import is pulled out and handed to the CSS box: left
     inside the injected <style> the webfont would only start downloading
     after the widget loaded, and on a slow line it lands mid-animation and
     re-lays the text out. */
  const skins = {};
  const skinImports = [];
  listSkins().forEach(function (name) {
    skins[name] = read(path.join('skins', name, 'skin.css'))
      .replace(/^[ 	]*@import.*;[ 	]*$/gm, function (line) {
        const trimmed = line.trim();
        if (skinImports.indexOf(trimmed) === -1) skinImports.push(trimmed);
        return '';
      });
  });

  /* CSS: shared theme and the overlay's own rules. The skins are NOT in
     here — they ship in the JS so a dropdown can switch between them. */
  const css = mergeCss([
    '/* ===== theme ===== */\n' + read(path.join('css', 'theme.css')),
    '/* ===== ' + overlay + ' ===== */\n' + part.style,
    '/* ===== skin fonts ===== */\n' + skinImports.join(String.fromCharCode(10)),
    SE_LAYOUT
  ]);

  /* JS: settings, engine, then the overlay, then the bridge */
  const js = [
    read(path.join('js', 'config.js')),
    options.configPatch || '',
    read(path.join('js', 'core.js')),
    read(path.join('js', 'connect.js')),
    '/* ===== skins ===== */' + String.fromCharCode(10) +
      'window.OverlaySkins = ' + JSON.stringify(skins, null, 0) + ';',
    bootstrap(overlay, part.bodyClass, skin),
    '/* ===== ' + overlay + ' ===== */',
    part.code
  ].filter(Boolean).join('\n\n');

  /* Wrapped: StreamElements gives a widget a box on a canvas it shares,
     and everything inside lays out against this element, not the page. */
  fs.writeFileSync(path.join(out, 'widget.html'),
    '<div class="se-root">' + NL + part.markup + NL + '</div>' + NL, 'utf8');
  fs.writeFileSync(path.join(out, 'widget.css'), css.trim() + '\n', 'utf8');
  /* refuse to hand over a bundle that will not run */
  assertParses(key + '/widget.js', js);
  fs.writeFileSync(path.join(out, 'widget.js'), js + '\n', 'utf8');
  fs.writeFileSync(path.join(out, 'fields.json'),
    JSON.stringify(fieldsFor(overlay, options, spec.params), null, 2) + '\n', 'utf8');

  return out;
}

/* Fields whose name is not the config path they stand for. */
const CONFIG_SEED = {
  alerts: { duration: 'alerts.duration', gap: 'alerts.gap' },
  goal:   { label: 'goal.label', current: 'goal.current', target: 'goal.target',
            count: 'goal.countEvents' },
  chat:   { max: 'chat.max', fade: 'chat.fadeAfter' },
  labels: { rotate: 'labels.rotateEvery', show: 'labels.show' },
  scene:  { t: 'scene.starting.seconds', title: 'scene.starting.title',
            sub: 'scene.starting.sub', ticker: 'scene.ticker', channel: 'channel' }
};

function dig(obj, dotted) {
  return dotted.split('.').reduce(function (node, key) {
    return node === undefined || node === null ? undefined : node[key];
  }, obj);
}

/* Client settings become the default values of the matching fields, so the
   streamer opens the widget already set up their way rather than seeing the
   pack's defaults contradict their own config. */
function fieldsFor(overlay, options, params) {
  const fields = JSON.parse(JSON.stringify(FIELDS[overlay] || {}));
  const config = options.config || {};

  /* the client's chosen skin is what the dropdown starts on */
  if (fields.skin && options.skin) fields.skin.value = options.skin;
  const seeds = CONFIG_SEED[overlay] || {};

  Object.keys(fields).forEach(function (key) {
    /* "cfg.a.b" names its own path; anything else is looked up in the map */
    const dotted = key.indexOf('cfg__') === 0 ? key.slice(5).split('__').join('.')
                 : key.indexOf('cfg.') === 0 ? key.slice(4)
                 : seeds[key];
    if (!dotted) return;

    const value = dig(config, dotted);
    if (value === undefined) return;

    fields[key].value = Array.isArray(value) ? value.join(',') : value;
  });

  /* the per-overlay URL params are more specific, so they win */
  if (params) {
    const search = new URLSearchParams(params);
    search.forEach(function (value, key) {
      if (!fields[key]) return;
      const type = fields[key].type;
      fields[key].value = type === 'number' ? parseFloat(value)
                        : type === 'checkbox' ? value !== 'false'
                        : value;
    });
  }
  return fields;
}

function buildClient(name) {
  const file = path.join(root, 'clients', name + '.json');
  let client = {};
  if (fs.existsSync(file)) {
    client = JSON.parse(fs.readFileSync(file, 'utf8'));
  } else if (name !== 'base') {
    console.error('  ✗ Δεν βρέθηκε το clients/' + name + '.json');
    process.exit(1);
  }

  const skin = client.skin || 'default';

  /* Each entry is one widget. "as" names a second instance of the same
     overlay — a follower goal and a sub goal from the same goal.html. */
  const specs = (client.overlays || OVERLAYS.map(function (o) { return { id: o }; }))
    .map(function (o) { return typeof o === 'string' ? { id: o } : o; })
    .filter(function (s) { return OVERLAYS.indexOf(s.id) !== -1; });

  /* their config patch rides along as a second script */
  let configPatch = '';
  const patch = Object.assign({}, client.config || {});
  if (client.channel) patch.channel = client.channel;
  if (Object.keys(patch).length) {
    configPatch =
      '/* ===== ' + name + ' ===== */\n' +
      '(function () {\n' +
      '  var patch = ' + JSON.stringify(patch, null, 2).replace(/\n/g, '\n  ') + ';\n' +
      '  function merge(target, source) {\n' +
      '    for (var key in source) {\n' +
      '      if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {\n' +
      '        target[key] = merge(target[key] || {}, source[key]);\n' +
      '      } else { target[key] = source[key]; }\n' +
      '    }\n' +
      '    return target;\n' +
      '  }\n' +
      '  merge(window.OverlayConfig, patch);\n' +
      '})();';
  }

  const opts = { name: name, skin: skin, configPatch: configPatch, config: patch };

  specs.forEach(function (spec) { buildOverlay(spec, opts); });

  /* a manifest so se-preview.html can list this client's actual widgets,
     including any second instance such as a sub goal */
  fs.writeFileSync(path.join(root, 'dist', name + '-se', 'widgets.json'),
    JSON.stringify(specs.map(function (s) {
      const key = s.as || s.id;
      return { key: key, title: s.title || key };
    }), null, 2) + '\n', 'utf8');

  fs.writeFileSync(path.join(root, 'dist', name + '-se', 'ΟΔΗΓΙΕΣ.md'),
    instructions(name, client, skin, specs), 'utf8');

  console.log('  ✓ ' + name + '  →  dist/' + name + '-se');
  console.log('    skin: ' + skin + '   widgets: ' +
    specs.map(function (s) { return s.as || s.id; }).join(', '));
}

function instructions(name, client, skin, specs) {
  const rows = specs.map(function (spec) {
    const key = spec.as || spec.id;
    const title = spec.title || key;
    return '### ' + title + '\n\n' +
      '1. Στο overlay editor: **+ Add Widget → Static/Custom → Custom Widget**\n' +
      '2. Άνοιξε το **Settings → OPEN EDITOR** και σβήσε ό,τι έχει μέσα.\n' +
      '3. Κάνε επικόλληση:\n' +
      '   - `' + key + '/widget.html` → καρτέλα **HTML**\n' +
      '   - `' + key + '/widget.css`  → καρτέλα **CSS**\n' +
      '   - `' + key + '/widget.js`   → καρτέλα **JS**\n' +
      '   - `' + key + '/fields.json` → καρτέλα **FIELDS**\n' +
      '4. **Done** → μεγάλωσε το widget στον καμβά όσο θες να πιάνει.\n';
  }).join('\n');

  return '# StreamElements widgets — ' + (client.displayName || name) + '\n\n' +
    'Skin: **' + skin + '**\n\n' +
    '---\n\n' +
    '## Πώς μπαίνουν\n\n' + rows + '\n' +
    '---\n\n' +
    '## Καλό να ξέρεις\n\n' +
    '- Τα events έρχονται από το ίδιο το StreamElements. Δεν χρειάζεται\n' +
    '  token, ούτε να τρέχει τίποτα στον υπολογιστή σου.\n' +
    '- Οι ρυθμίσεις (θέση, διάρκεια, κείμενα, χρώματα) είναι στο δεξί\n' +
    '  πάνελ του widget, από την καρτέλα **FIELDS** που επικόλλησες.\n' +
    '- Για δοκιμή χωρίς να είσαι live: το κουμπί **Test** του\n' +
    '  StreamElements δουλεύει κανονικά (follower, subscriber, cheer, tip, raid).\n' +
    '- **Ήχοι:** μέσα στο StreamElements τα mp3 πρέπει να είναι σε δημόσιο\n' +
    '  URL. Βάλε το στο πεδίο «URL φακέλου με τα mp3». Άδειο = χωρίς ήχο.\n' +
    '- Το widget είναι διάφανο· ό,τι φαίνεται γύρω του είναι το stream σου.\n';
}

/* --- entry point ----------------------------------------------------------- */

const args = process.argv.slice(2);
const names = args.filter(function (a) { return a.charAt(0) !== '-'; });

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });

/* keep skins/skins.json in step with the folders, so the control room
   lists whatever skins actually exist */
fs.writeFileSync(path.join(root, 'skins', 'skins.json'),
  JSON.stringify(listSkins(), null, 2) + '\n', 'utf8');

if (args.includes('--clients')) {
  const dir = path.join(root, 'clients');
  const all = fs.readdirSync(dir)
    .filter(function (f) { return f.endsWith('.json') && f.charAt(0) !== '_'; });
  console.log('');
  all.forEach(function (f) { buildClient(path.basename(f, '.json')); });
  console.log('');
} else if (names.length) {
  console.log('');
  names.forEach(function (n) { buildClient(n); });
  console.log('');
} else {
  console.log('\n  node make-se.js <όνομα-client>   |   node make-se.js --clients');
  console.log('  node make-se.js base             (χωρίς client, σκέτα τα widgets)\n');
}
