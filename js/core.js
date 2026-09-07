/* ==========================================================================
   core.js — shared plumbing for every overlay.
   Classic script on purpose: OBS loads these from file://, where ES modules
   and fetch() are blocked by CORS. Everything hangs off window.
   ========================================================================== */

(function (window, document) {
  'use strict';

  /* --- URL parameters ---------------------------------------------------
     Every overlay is configurable by URL so one file can serve several
     browser sources: goal.html?target=1000&label=Sub%20Goal            */

  var query = new URLSearchParams(window.location.search);
  var hash = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));

  var Params = {
    get: function (key, fallback) {
      /* Inside a StreamElements widget there is no URL to read — the same
         settings arrive as widget fields, so those win when present. */
      var fields = window.SE_FIELDS;
      if (fields && fields[key] !== undefined && fields[key] !== null && fields[key] !== '') {
        return fields[key];
      }
      var v = query.get(key);
      if (v === null) v = hash.get(key);
      return v === null || v === '' ? fallback : v;
    },
    num: function (key, fallback) {
      var v = parseFloat(Params.get(key, NaN));
      return isNaN(v) ? fallback : v;
    },
    bool: function (key, fallback) {
      var v = Params.get(key, null);
      if (v === null) return fallback;
      /* widget checkboxes hand over a real boolean; URLs hand over text */
      if (typeof v === 'boolean') return v;
      return v !== '0' && v !== 'false' && v !== 'no';
    },
    list: function (key, fallback) {
      var v = Params.get(key, null);
      if (v === null) return fallback;
      /* a widget field may already be an array */
      if (Object.prototype.toString.call(v) === '[object Array]') return v;
      return String(v).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }
  };

  /* --- event bus ---------------------------------------------------------
     Overlays subscribe; connectors and the control room publish.        */

  var handlers = {};

  var Bus = {
    on: function (type, fn) {
      (handlers[type] || (handlers[type] = [])).push(fn);
      return Bus;
    },
    emit: function (type, data) {
      var list = (handlers[type] || []).concat(handlers['*'] || []);
      for (var i = 0; i < list.length; i++) {
        try {
          list[i](data, type);
        } catch (err) {
          console.error('[overlay] handler for "' + type + '" failed:', err);
        }
      }
      return Bus;
    }
  };

  /* The control room previews overlays in iframes and fires test events
     into them with postMessage. Ignore anything that is not ours. */
  window.addEventListener('message', function (ev) {
    var msg = ev.data;
    if (!msg || msg.__overlay !== true || !msg.type) return;
    Bus.emit(msg.type, msg.data || {});
  });

  /* --- a queue that shows one thing at a time ---------------------------
     Alerts must never overlap, however fast events arrive.              */

  function Queue(options) {
    this.items = [];
    this.busy = false;
    this.show = options.show;              // function(item, done)
    this.gap = options.gap || 400;
  }

  Queue.prototype.push = function (item) {
    this.items.push(item);
    this.pump();
  };

  Queue.prototype.pump = function () {
    var self = this;
    if (this.busy || !this.items.length) return;
    this.busy = true;
    var item = this.items.shift();
    this.show(item, function () {
      setTimeout(function () {
        self.busy = false;
        self.pump();
      }, self.gap);
    });
  };

  /* --- formatting -------------------------------------------------------- */

  var Fmt = {
    /* Fill {user}, {amount}, … from an event object. */
    template: function (str, data) {
      return String(str || '').replace(/\{(\w+)\}/g, function (whole, key) {
        var v = data[key];
        return v === undefined || v === null ? '' : String(v);
      });
    },

    number: function (n) {
      return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    },

    money: function (n, currency) {
      var symbol = { EUR: '€', USD: '$', GBP: '£' }[currency] || '';
      var value = (Math.round((n || 0) * 100) / 100).toFixed(2).replace(/\.00$/, '');
      return symbol ? symbol + value : value + ' ' + (currency || '');
    },

    clock: function (totalSeconds) {
      var s = Math.max(0, Math.floor(totalSeconds));
      var h = Math.floor(s / 3600);
      var m = Math.floor((s % 3600) / 60);
      var sec = s % 60;
      var pad = function (v) { return v < 10 ? '0' + v : String(v); };
      return h > 0 ? h + ':' + pad(m) + ':' + pad(sec) : pad(m) + ':' + pad(sec);
    },

    /* Chat and usernames come from strangers — never build HTML from them
       without escaping first. */
    escape: function (str) {
      return String(str === undefined || str === null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  };

  /* --- sound -------------------------------------------------------------
     Drop mp3s in assets/sounds/ named after the alert type (follow.mp3,
     raid.mp3, …). Missing files fail silently — no console noise.       */

  var Sound = {
    cache: {},
    play: function (name, volume) {
      var cfg = (window.OverlayConfig || {}).alerts || {};
      if (cfg.sound === false) return;
      /* A per-category URL wins; otherwise fall back to the folder plus the
         type name. A relative folder is meaningless inside a StreamElements
         widget, so both are configurable and either may be empty. */
      var explicit = (cfg.sounds || {})[name];
      var base = cfg.soundBase === undefined ? '../assets/sounds/' : cfg.soundBase;
      var url = explicit || (base ? base + name + '.mp3' : '');
      if (!url) return;

      try {
        var audio = Sound.cache[url];
        if (!audio) {
          audio = new Audio(url);
          Sound.cache[url] = audio;
        }
        audio.volume = volume === undefined ? (cfg.volume || 0.6) : volume;
        audio.currentTime = 0;
        var p = audio.play();
        if (p && p.catch) p.catch(function () { /* no file, or autoplay blocked */ });
      } catch (err) { /* ignore */ }
    }
  };

  /* --- setup applied by every overlay ------------------------------------ */

  var Overlay = {
    /* Apply ?theme= and ?pos= and return the resolved settings. */
    init: function (defaults) {
      var theme = Params.get('theme', null);
      if (theme) document.body.classList.add('theme-' + theme);

      /* The overlay is rendered on the streamer's machine but watched by
         other people, so Windows' "reduce motion" would otherwise flatten
         the animation for an audience that never asked for it. Full motion
         wins unless ?motion=system says otherwise. */
      if (Params.get('motion', 'full') !== 'system') {
        document.body.classList.add('motion-full');
      }

      /* No card behind the text unless it is asked for: ?panel=1 */
      document.body.classList.add(Params.bool('panel', false) ? 'panel-on' : 'no-panel');

      /* A skin can offer colourways of itself — ?variant=mono and so on. */
      var variant = Params.get('variant', null);
      if (variant) document.body.classList.add('variant-' + String(variant).replace(/[^\w-]/g, ''));

      var scale = Params.num('scale', 1);
      if (scale !== 1) {
        document.documentElement.style.fontSize = (16 * scale) + 'px';
      }

      var accent = Params.get('accent', null);
      if (accent) document.documentElement.style.setProperty('--accent', '#' + accent.replace('#', ''));

      var d = defaults || {};
      d.pos = Params.get('pos', d.pos || 'top-center');
      return d;
    },

    /* Attach the anchor classes for ?pos= to a container element. */
    place: function (el, pos) {
      el.classList.add('anchor', 'pos-' + pos);
    }
  };

  /* --- demo events -------------------------------------------------------
     Used by the 'demo' source and by the control room's test buttons, so
     what you preview is exactly what will fire live.                    */

  var NAMES = ['nikos_gr', 'AthenaPlays', 'kostas__', 'MariaTV', 'yiannis99',
               'ElenaStreams', 'panos_dev', 'SofiaRaids', 'dimitris_k', 'ZoePlays'];
  var MESSAGES = ['πάμε δυνατά!', 'first!', 'σε παρακολουθώ κάθε μέρα',
                  'τι παίζεις μετά;', 'gg', 'καλησπέρα από Κύπρο', 'ΤΟΠ stream',
                  'μπράβο ρε!', 'lets goooo', 'πόση ώρα είσαι live;'];

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  var Demo = {
    pick: pick,
    name: function () { return pick(NAMES); },

    /* Build a realistic event object of the given type. */
    event: function (type) {
      var user = pick(NAMES);
      switch (type) {
        case 'follow':  return { type: 'follow',  user: user };
        case 'sub':     return { type: 'sub',     user: user, tier: pick(['1', '2', '3']) };
        case 'resub':   return { type: 'resub',   user: user, tier: '1', months: pick([3, 6, 12, 24]) };
        case 'subgift': return { type: 'subgift', user: user, target: pick(NAMES), tier: '1' };
        case 'subbomb': return { type: 'subbomb', user: user, amount: pick([5, 10, 20, 50]) };
        case 'cheer':   return { type: 'cheer',   user: user, amount: pick([100, 500, 1000, 5000]) };
        case 'raid':    return { type: 'raid',    user: user, viewers: pick([12, 45, 130, 620]) };
        case 'tip':     return { type: 'tip',     user: user, amount: pick([5, 10, 25, 50]), currency: 'EUR' };
        default:        return { type: type, user: user };
      }
    },

    chat: function () {
      return {
        user: pick(NAMES),
        color: pick(['#a855f7', '#22d3ee', '#fbbf24', '#34d399', '#fb7185', '#60a5fa']),
        message: pick(MESSAGES),
        badges: Math.random() > 0.6 ? [pick(['mod', 'sub', 'vip'])] : [],
        emotes: null,
        id: 'demo-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)
      };
    },

    /* Fire random events forever. Returns a stop() function. */
    start: function (opts) {
      opts = opts || {};
      var types = opts.types || ['follow', 'sub', 'resub', 'subgift', 'subbomb', 'cheer', 'raid', 'tip'];
      var timers = [];

      if (opts.alerts !== false) {
        timers.push(setInterval(function () {
          var ev = Demo.event(pick(types));
          Bus.emit('alert', ev);
          Bus.emit(ev.type, ev);
        }, opts.alertEvery || 9000));
      }

      if (opts.chat !== false) {
        timers.push(setInterval(function () {
          Bus.emit('chat', Demo.chat());
        }, opts.chatEvery || 2600));
      }

      return function stop() {
        timers.forEach(clearInterval);
      };
    }
  };

  /* --- export ------------------------------------------------------------ */

  window.Params = Params;
  window.Bus = Bus;
  window.Queue = Queue;
  window.Fmt = Fmt;
  window.Sound = Sound;
  window.Overlay = Overlay;
  window.Demo = Demo;

})(window, document);
