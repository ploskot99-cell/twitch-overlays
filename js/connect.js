/* ==========================================================================
   connect.js — turns real platform events into the one event shape every
   overlay in this pack understands.

   Normalised alert object:
     { type, user, amount, months, tier, viewers, target, currency, message }
   Normalised chat object:
     { id, user, color, message, badges[], emotes }

   Four sources, mix and match in config.js:
     demo            fake events on a timer
     chat            tmi.js, anonymous, needs nothing but a channel name
     streamelements  follows/subs/tips/cheers/raids from a JWT
     eventsub        straight from Twitch, needs your own app credentials
   ========================================================================== */

(function (window) {
  'use strict';

  var CDN = {
    tmi: 'https://cdn.jsdelivr.net/npm/tmi.js@1.8.5/dist/tmi.min.js',
    io:  'https://cdn.jsdelivr.net/npm/socket.io-client@4.7.5/dist/socket.io.min.js'
  };

  /* Load a script tag once, resolve when it is ready. */
  var loaded = {};
  function script(url) {
    if (loaded[url]) return loaded[url];
    loaded[url] = new Promise(function (resolve, reject) {
      var el = document.createElement('script');
      el.src = url;
      el.onload = function () { resolve(); };
      el.onerror = function () { reject(new Error('could not load ' + url)); };
      document.head.appendChild(el);
    });
    return loaded[url];
  }

  /* Publish an alert on the bus under both 'alert' and its own type. */
  function fire(ev) {
    window.Bus.emit('alert', ev);
    window.Bus.emit(ev.type, ev);
  }

  /* ======================================================================
     1. chat — tmi.js, anonymous read-only connection
     ====================================================================== */

  function startChat(cfg) {
    var channel = window.Params.get('channel', cfg.channel);
    if (!channel || channel === 'yourchannel') {
      console.warn('[overlay] set your channel name in config.js to read real chat');
      return;
    }

    return script(CDN.tmi).then(function () {
      var client = new window.tmi.Client({
        options: { skipUpdatingEmotesets: true },
        connection: { reconnect: true, secure: true },
        channels: [channel]
      });

      client.on('connected', function () {
        console.log('[overlay] chat connected to #' + channel);
        window.Bus.emit('status', { source: 'chat', ok: true });
      });

      client.on('message', function (chan, tags, message, self) {
        if (self) return;
        window.Bus.emit('chat', {
          id: tags.id || String(Date.now()),
          user: tags['display-name'] || tags.username,
          color: tags.color || null,
          message: message,
          badges: Object.keys(tags.badges || {}),
          emotes: tags.emotes || null
        });
      });

      /* tmi also surfaces subs, gifts, raids and cheers — free alerts
         without any authentication at all. */
      client.on('subscription', function (c, username, methods) {
        fire({ type: 'sub', user: username, tier: tierOf(methods) });
      });
      client.on('resub', function (c, username, months, msg, tags, methods) {
        fire({ type: 'resub', user: username, months: months, tier: tierOf(methods), message: msg });
      });
      client.on('subgift', function (c, username, streak, recipient, methods) {
        fire({ type: 'subgift', user: username, target: recipient, tier: tierOf(methods) });
      });
      client.on('submysterygift', function (c, username, count) {
        fire({ type: 'subbomb', user: username, amount: count });
      });
      client.on('cheer', function (c, tags, message) {
        fire({ type: 'cheer', user: tags['display-name'] || tags.username,
               amount: parseInt(tags.bits, 10) || 0, message: message });
      });
      client.on('raided', function (c, username, viewers) {
        fire({ type: 'raid', user: username, viewers: viewers });
      });

      client.connect().catch(function (err) {
        console.error('[overlay] chat connection failed:', err);
        window.Bus.emit('status', { source: 'chat', ok: false, error: String(err) });
      });

      return client;
    });

    function tierOf(methods) {
      var plan = (methods || {}).plan;
      if (plan === '2000') return '2';
      if (plan === '3000') return '3';
      return '1';
    }
  }

  /* ======================================================================
     2. streamelements — the easy path for follows and tips
     ====================================================================== */

  function startStreamElements(cfg) {
    var jwt = window.Params.get('jwt', (cfg.streamelements || {}).jwt);
    if (!jwt) {
      console.warn('[overlay] streamelements source needs a JWT in config.js');
      return;
    }

    return script(CDN.io).then(function () {
      var socket = window.io('https://realtime.streamelements.com', {
        transports: ['websocket']
      });

      socket.on('connect', function () {
        socket.emit('authenticate', { method: 'jwt', token: jwt });
      });
      socket.on('authenticated', function () {
        console.log('[overlay] streamelements authenticated');
        window.Bus.emit('status', { source: 'streamelements', ok: true });
      });
      socket.on('unauthorized', function (err) {
        console.error('[overlay] streamelements rejected the JWT:', err);
        window.Bus.emit('status', { source: 'streamelements', ok: false });
      });

      /* 'event' is live, 'event:test' is the Test button in the SE panel. */
      socket.on('event', handle);
      socket.on('event:test', function (payload) { handle(payload && payload.event ? payload : payload); });

      function handle(payload) {
        if (!payload) return;
        var ev = normaliseSE(payload.type || (payload.listener || '').replace('-latest', ''),
                             payload.data || payload.event || {});
        if (ev) fire(ev);
      }

      return socket;
    });
  }

  function normaliseSE(type, d) {
    var user = d.displayName || d.username || d.name || 'someone';
    switch (type) {
      case 'follow':
      case 'follower':
        return { type: 'follow', user: user };
      case 'subscriber':
        if (d.bulkGifted) return { type: 'subbomb', user: d.sender || user, amount: d.amount || 1 };
        if (d.gifted)     return { type: 'subgift', user: d.sender || user, target: user, tier: String(d.tier || 1000).charAt(0) };
        if (d.amount > 1) return { type: 'resub', user: user, months: d.amount, tier: String(d.tier || 1000).charAt(0), message: d.message };
        return { type: 'sub', user: user, tier: String(d.tier || 1000).charAt(0) };
      case 'cheer':
        return { type: 'cheer', user: user, amount: d.amount || 0, message: d.message };
      case 'tip':
        return { type: 'tip', user: user, amount: d.amount || 0, currency: d.currency || 'EUR', message: d.message };
      case 'raid':
        return { type: 'raid', user: user, viewers: d.amount || 0 };
      default:
        return null;
    }
  }

  /* ======================================================================
     3. se — running *inside* a StreamElements custom widget

     Nothing to connect to: StreamElements delivers events to the widget
     itself. This just translates them into the same shapes every overlay
     in this pack already understands.
     ====================================================================== */

  function startSEWidget() {
    window.addEventListener('onEventReceived', function (obj) {
      var detail = obj && obj.detail;
      if (!detail) return;

      var listener = String(detail.listener || '');
      var event = detail.event || {};

      if (listener === 'message') {
        window.Bus.emit('chat', normaliseSEChat(event.data || event));
        return;
      }
      if (listener.indexOf('delete-message') === 0) {
        window.Bus.emit('chat:clear', {});
        return;
      }

      /* follower-latest, subscriber-latest, cheer-latest, tip-latest, raid-latest */
      var ev = normaliseSE(listener.replace('-latest', ''), event);
      if (ev) fire(ev);
    });

    console.log('[overlay] listening to StreamElements widget events');
    window.Bus.emit('status', { source: 'se', ok: true });
  }

  /* StreamElements chat has its own shape; the chat overlay wants tmi's. */
  function normaliseSEChat(d) {
    d = d || {};
    var emotes = null;

    if (d.emotes && d.emotes.length) {
      emotes = {};
      for (var i = 0; i < d.emotes.length; i++) {
        var e = d.emotes[i];
        /* only Twitch emotes carry an id the renderer can build a URL from;
           BTTV and FFZ ones fall through and stay as plain text */
        if (!e || !e.id) continue;
        (emotes[e.id] || (emotes[e.id] = [])).push(e.start + '-' + e.end);
      }
      if (!Object.keys(emotes).length) emotes = null;
    }

    return {
      id: d.msgId || d.userId || String(Date.now()),
      user: d.displayName || d.nick || '',
      color: d.displayColor || null,
      message: d.text || '',
      badges: (d.badges || []).map(function (b) { return b && b.type; }).filter(Boolean),
      emotes: emotes
    };
  }

  /* ======================================================================
     4. eventsub — Twitch's own websocket, no third party in the middle
     ====================================================================== */

  function startEventSub(cfg) {
    var es = cfg.eventsub || {};
    var clientId = window.Params.get('clientId', es.clientId);
    var token = window.Params.get('token', es.token);
    var userId = window.Params.get('broadcasterId', es.broadcasterId);

    if (!clientId || !token) {
      console.warn('[overlay] eventsub source needs clientId and token — see README.md');
      return;
    }

    var socket = new WebSocket('wss://eventsub.wss.twitch.tv/ws');

    socket.onmessage = function (raw) {
      var msg;
      try { msg = JSON.parse(raw.data); } catch (err) { return; }
      var meta = msg.metadata || {};

      if (meta.message_type === 'session_welcome') {
        subscribeAll(msg.payload.session.id);
      } else if (meta.message_type === 'notification') {
        var ev = normaliseEventSub(meta.subscription_type, msg.payload.event || {});
        if (ev) fire(ev);
      } else if (meta.message_type === 'session_reconnect') {
        /* Twitch is moving us; the new socket takes over cleanly. */
        var next = new WebSocket(msg.payload.session.reconnect_url);
        next.onmessage = socket.onmessage;
        next.onerror = socket.onerror;
        socket.close();
        socket = next;
      }
    };

    socket.onerror = function (err) {
      console.error('[overlay] eventsub socket error:', err);
      window.Bus.emit('status', { source: 'eventsub', ok: false });
    };

    function subscribeAll(sessionId) {
      if (!userId) {
        /* Resolve the broadcaster id from the token itself. */
        api('https://api.twitch.tv/helix/users').then(function (res) {
          userId = ((res.data || [])[0] || {}).id;
          if (userId) createSubs(sessionId);
        });
      } else {
        createSubs(sessionId);
      }
    }

    function createSubs(sessionId) {
      var transport = { method: 'websocket', session_id: sessionId };
      var subs = [
        ['channel.follow', '2', { broadcaster_user_id: userId, moderator_user_id: userId }],
        ['channel.subscribe', '1', { broadcaster_user_id: userId }],
        ['channel.subscription.message', '1', { broadcaster_user_id: userId }],
        ['channel.subscription.gift', '1', { broadcaster_user_id: userId }],
        ['channel.cheer', '1', { broadcaster_user_id: userId }],
        ['channel.raid', '1', { to_broadcaster_user_id: userId }]
      ];

      subs.forEach(function (s) {
        api('https://api.twitch.tv/helix/eventsub/subscriptions', {
          method: 'POST',
          body: JSON.stringify({ type: s[0], version: s[1], condition: s[2], transport: transport })
        }).then(function () {
          console.log('[overlay] subscribed to ' + s[0]);
        }).catch(function (err) {
          console.warn('[overlay] could not subscribe to ' + s[0] + ':', err.message);
        });
      });

      window.Bus.emit('status', { source: 'eventsub', ok: true });
    }

    function api(url, options) {
      options = options || {};
      options.headers = {
        'Client-Id': clientId,
        'Authorization': 'Bearer ' + token.replace(/^oauth:/, ''),
        'Content-Type': 'application/json'
      };
      return fetch(url, options).then(function (res) {
        if (!res.ok) {
          return res.text().then(function (body) {
            throw new Error(res.status + ' ' + body);
          });
        }
        return res.status === 204 ? {} : res.json();
      });
    }

    return socket;
  }

  function normaliseEventSub(type, e) {
    switch (type) {
      case 'channel.follow':
        return { type: 'follow', user: e.user_name };
      case 'channel.subscribe':
        return e.is_gift ? null   /* the gift event below covers this */
                         : { type: 'sub', user: e.user_name, tier: String(e.tier || '1000').charAt(0) };
      case 'channel.subscription.message':
        return { type: 'resub', user: e.user_name, months: e.cumulative_months,
                 tier: String(e.tier || '1000').charAt(0), message: (e.message || {}).text };
      case 'channel.subscription.gift':
        return e.total > 1
          ? { type: 'subbomb', user: e.is_anonymous ? 'Anonymous' : e.user_name, amount: e.total }
          : { type: 'subgift', user: e.is_anonymous ? 'Anonymous' : e.user_name, target: '', tier: String(e.tier || '1000').charAt(0) };
      case 'channel.cheer':
        return { type: 'cheer', user: e.is_anonymous ? 'Anonymous' : e.user_name,
                 amount: e.bits, message: e.message };
      case 'channel.raid':
        return { type: 'raid', user: e.from_broadcaster_user_name, viewers: e.viewers };
      default:
        return null;
    }
  }

  /* ======================================================================
     entry point
     ====================================================================== */

  var Connect = {
    started: false,

    start: function (overrides) {
      if (Connect.started) return;
      Connect.started = true;

      var cfg = window.OverlayConfig || {};
      var sources = window.Params.list('sources', (overrides && overrides.sources) || cfg.sources || ['demo']);

      sources.forEach(function (name) {
        try {
          if (name === 'none') {
            /* Control-room previews: only the test buttons fire events. */
          } else if (name === 'demo') {
            window.Demo.start(overrides && overrides.demo);
          } else if (name === 'chat') {
            startChat(cfg);
          } else if (name === 'streamelements') {
            startStreamElements(cfg);
          } else if (name === 'se') {
            startSEWidget();
          } else if (name === 'eventsub') {
            startEventSub(cfg);
          } else {
            console.warn('[overlay] unknown source "' + name + '"');
          }
        } catch (err) {
          console.error('[overlay] source "' + name + '" failed to start:', err);
        }
      });
    }
  };

  window.Connect = Connect;

})(window);
