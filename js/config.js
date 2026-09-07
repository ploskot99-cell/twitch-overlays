/* ==========================================================================
   config.js — edit this file, not the overlays.
   Everything a streamer normally wants to change lives here.
   ========================================================================== */

window.OverlayConfig = {

  /* --- who ---------------------------------------------------------------
     Your Twitch channel name, lowercase. Used for reading chat. */
  channel: 'yourchannel',

  /* --- where the events come from ---------------------------------------
     'demo'           fake events on a timer — for building and testing
     'chat'           real chat via tmi.js, anonymous, no login needed
     'streamelements' real follows/subs/tips/cheers/raids (needs jwt below)
     'eventsub'       real events straight from Twitch (needs clientId+token)

     You can list more than one, e.g. ['chat', 'streamelements'].         */
  sources: ['demo', 'chat'],

  /* StreamElements: Account → Show secrets → JWT token.
     Leave empty unless you use the 'streamelements' source. */
  streamelements: { jwt: '' },

  /* Twitch EventSub: needs your own app's Client ID and a user token with
     the scopes listed in README.md. Leave empty unless you use it.
     Tip: pass the token in the URL hash (#token=…) so it is never saved. */
  eventsub: { clientId: '', token: '', broadcasterId: '' },

  /* --- alerts ------------------------------------------------------------ */
  alerts: {
    duration: 6500,        // ms an alert stays on screen
    gap: 600,              // ms between queued alerts
    sound: true,           // play <soundBase><type>.mp3 if present
    volume: 0.6,

    /* Where the mp3s live, when they are named after the event type
       (follow.mp3, raid.mp3 …). A public URL works too, which is what a
       StreamElements widget needs. Empty string = no sound at all. */
    soundBase: '../assets/sounds/',

    /* Or give a category its own file outright. Anything set here wins over
       soundBase, so you can mix: most types from a folder, one special. */
    sounds: {
      follow: '', sub: '', resub: '', subgift: '',
      subbomb: '', cheer: '', raid: '', tip: ''
    },
    minCheer: 100,         // ignore cheers below this many bits
    minTip: 1,             // ignore tips below this amount

    /* How big an event has to be to earn each rank, in that type's own
       units: months for a resub, bits for a cheer, euros for a tip, subs
       for a gift bomb, viewers for a raid. Six steps, and the skin styles
       them once — so a 5000-bit cheer and a two-year sub read as equally
       big without every type needing its own colours. */
    ranks: {
      resub:   [1, 3, 6, 12, 24, 36],
      sub:     [1, 3, 6, 12, 24, 36],
      cheer:   [1, 300, 1000, 5000, 10000, 25000],
      tip:     [1, 5, 10, 25, 50, 100],
      subgift: [1, 3, 5, 10, 25, 50],
      subbomb: [1, 3, 5, 10, 25, 50],
      raid:    [1, 20, 50, 200, 500, 1000]
    },

    /* How many particles fly out per event type. Skins decide what they look
       like; this decides how many. 0 turns them off for that type. */
    burst: {
      follow: 18, sub: 18, resub: 18, subgift: 20,
      subbomb: 30, cheer: 22, raid: 32, tip: 22
    },

    /* {user} {amount} {months} {tier} {viewers} are replaced at runtime. */
    templates: {
      follow:  { eyebrow: 'ΝΕΟ FOLLOW',     line: '{user}',  sub: 'καλώς ήρθες!' },
      sub:     { eyebrow: 'ΝΕΟ SUB',        line: '{user}',  sub: 'Tier {tier}' },
      resub:   { eyebrow: '{months} ΜΗΝΕΣ', line: '{user}',  sub: 'ευχαριστώ για τη στήριξη' },
      subgift: { eyebrow: 'ΔΩΡΟ SUB',       line: '{user}',  sub: 'χάρισε sub στον/στην {target}' },
      subbomb: { eyebrow: '{amount} GIFTED', line: '{user}', sub: 'χάρισε {amount} subs!' },
      cheer:   { eyebrow: '{amount} BITS',  line: '{user}',  sub: 'ευχαριστώ!' },
      raid:    { eyebrow: 'RAID',           line: '{user}',  sub: 'έφερε {viewers} άτομα!' },
      tip:     { eyebrow: 'ΔΩΡΕΑ {amount}', line: '{user}',  sub: 'ευχαριστώ πολύ!' }
    }
  },

  /* --- goal bar ---------------------------------------------------------- */
  goal: {
    label: 'Follower Goal',
    current: 312,
    target: 500,
    /* When a source is connected the bar counts up on its own from here. */
    countEvents: ['follow']
  },

  /* --- chat box ---------------------------------------------------------- */
  chat: {
    max: 12,               // messages kept on screen
    fadeAfter: 90,         // seconds before a message fades out (0 = never)
    hideCommands: true,    // drop messages starting with !
    hideBots: ['nightbot', 'streamelements', 'streamlabs', 'moobot', 'fossabot'],
    showBadges: true,
    showEmotes: true
  },

  /* --- labels (small rotating stat pills) --------------------------------- */
  labels: {
    rotateEvery: 8,        // seconds per pill
    show: ['follower', 'sub', 'cheer', 'tip', 'uptime'],
    titles: {
      follower: 'Τελευταίο follow',
      sub:      'Τελευταίο sub',
      cheer:    'Top cheer',
      tip:      'Τελευταία δωρεά',
      uptime:   'Uptime'
    },
    /* ISO time the stream started, for the uptime pill. Or pass ?since= */
    startedAt: null
  },

  /* --- scene screens (starting soon / brb / ended) ------------------------ */
  scene: {
    starting: { title: 'ΞΕΚΙΝΑΜΕ ΣΕ ΛΙΓΟ', sub: 'κάτσε αναπαυτικά',        seconds: 300 },
    brb:      { title: 'ΕΠΙΣΤΡΕΦΩ ΑΜΕΣΩΣ', sub: 'μη φύγεις',               seconds: 0 },
    ended:    { title: 'ΕΥΧΑΡΙΣΤΩ ΠΟΥ ΗΡΘΕΣ', sub: 'τα λέμε στο επόμενο',  seconds: 0 },
    ticker: [
      'Follow για να μη χάσεις stream',
      'Discord στο πάνελ κάτω',
      '!commands στο chat'
    ]
  }
};
