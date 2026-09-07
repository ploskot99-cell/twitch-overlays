# Twitch Overlays

Πλήρες pack overlays για OBS: alerts, goal bar, chat, labels και scene screens.
Όλα είναι απλά HTML/CSS/JS αρχεία — τα φορτώνεις ως **Browser source** στο OBS.

---

## Γρήγορο ξεκίνημα

1. Διπλό κλικ στο **`start.cmd`** (ή `node serve.js`).
   Ανοίγει το **Control Room** στο <http://localhost:8777>.
2. Διάλεξε overlay από τη λίστα, πάτα τα κουμπιά δοκιμής και δες πώς παίζει.
3. **Αντιγραφή** το URL → OBS → *Sources → + → Browser* → επικόλληση στο **URL**.
4. Βάλε το Width/Height που γράφει το «Προτεινόμενο μέγεθος».

> Το Control Room δεν χρειάζεται να τρέχει όσο κάνεις stream. Είναι μόνο για
> να στήσεις και να δοκιμάσεις. Στο OBS μπορείς επίσης να τσεκάρεις
> **Local file** και να διαλέξεις κατευθείαν το `.html`.

---

## Τι υπάρχει μέσα

| Overlay | Αρχείο | Μέγεθος στο OBS | Τι κάνει |
|---|---|---|---|
| **Alerts** | `overlays/alerts.html` | 1920 × 1080 | follow, sub, resub, gift, gift bomb, bits, raid, δωρεά — με ουρά, ήχο και particles |
| **Goal bar** | `overlays/goal.html` | 500 × 160 | στόχος follower/sub, ανεβαίνει μόνος του με τα events |
| **Chat box** | `overlays/chat.html` | 500 × 900 | μηνύματα με emotes, badges, auto-fade |
| **Labels** | `overlays/labels.html` | 320 × 130 | τελευταίο follow / sub / top cheer / δωρεά / uptime (`layout=stack` → 320 × 440) |
| **Scene screens** | `overlays/scene.html` | 1920 × 1080 | Starting soon με countdown, BRB, Τέλος |

Το **Alerts** μπαίνει σε ολόκληρο τον καμβά και τοποθετείται με `?pos=`, ώστε
να μη χρειάζεται να το σέρνεις με το ποντίκι.

---

## Ρυθμίσεις

Όλα τα «κανονικά» πράγματα αλλάζουν σε ένα αρχείο: **`js/config.js`**
(κανάλι, διάρκεια alert, κείμενα, στόχοι, φίλτρα chat).

Ό,τι θες να διαφέρει ανά browser source το βάζεις στο **URL**:

| Παράμετρος | Ισχύει σε | Παράδειγμα |
|---|---|---|
| `pos` | όλα | `?pos=bottom-right` (`top/center/bottom` × `left/center/right`) |
| `theme` | όλα | `?theme=ember` — `ember`, `mint`, `gold`, `ice`, `hot` |
| `variant` | όλα | `?variant=mono` — παραλλαγή χρώματος του skin (το `ninja` έχει `mono`, `crimson`, `frost`, `jade`) |
| `accent` | όλα | `?accent=ff5a5f` — δικό σου χρώμα |
| `scale` | όλα | `?scale=1.3` — μεγαλύτερο ή μικρότερο |
| `panel` | alerts | `?panel=1` — επαναφέρει το πλαίσιο πίσω από το κείμενο (από προεπιλογή δεν υπάρχει) |
| `motion` | όλα | `?motion=system` — να σέβεται τη ρύθμιση «λιγότερη κίνηση» των Windows. Από προεπιλογή **όχι**: το overlay το βλέπουν οι θεατές, όχι το λειτουργικό σου |
| `sources` | όλα | `?sources=chat,streamelements` |
| `duration` | alerts | `?duration=8000` (ms στην οθόνη) |
| `label` `current` `target` | goal | `?label=Sub%20Goal&current=12&target=50` |
| `max` `fade` | chat | `?max=15&fade=60` (0 = δεν σβήνουν ποτέ) |
| `layout=stack` | labels | δείχνει όλα τα stats μαζί αντί για εναλλαγή |
| `mode` `t` | scene | `?mode=starting&t=300` |

---

## Πραγματικά events

Στο `js/config.js`, στο `sources`, βάζεις μία ή περισσότερες πηγές:

### `chat` — το εύκολο, χωρίς κανένα login
Διαβάζει το chat ανώνυμα. Δίνει **και** subs, gift subs, bits και raids,
γιατί το Twitch τα στέλνει μέσα στο chat protocol. Θέλει μόνο:

```js
channel: 'toonomasou',
sources: ['chat']
```

Δεν πιάνει **follows** και **δωρεές** (δεν περνάνε από το chat).

### `streamelements` — για follows και δωρεές
StreamElements → *Account → Show secrets → JWT Token*.

```js
sources: ['chat', 'streamelements'],
streamelements: { jwt: 'το-jwt-σου' }
```

### `eventsub` — απευθείας από το Twitch
Θέλει δικό σου app στο [dev.twitch.tv/console](https://dev.twitch.tv/console)
και user token με scopes:
`moderator:read:followers`, `channel:read:subscriptions`, `bits:read`.

```js
sources: ['eventsub'],
eventsub: { clientId: '...', token: '...', broadcasterId: '' }
```

Το `eventsub` κάνει κλήσεις στο Twitch API, οπότε πρέπει να τρέχει από
`http://localhost:8777` (δηλαδή με το `start.cmd`) και **όχι** από αρχείο.
Το token μπορείς να το περνάς και στο URL μετά από `#`, π.χ.
`alerts.html#token=abcdef`, ώστε να μη μένει γραμμένο στο αρχείο.

### `demo`
Ψεύτικα events κάθε λίγα δευτερόλεπτα, για να στήνεις χωρίς να είσαι live.
Είναι το προεπιλεγμένο.

---

## Ήχοι — ένας ανά κατηγορία

Δύο τρόποι, και μπορείς να τους ανακατέψεις.

**Με φάκελο** (τοπικά): ρίξε mp3 στο `assets/sounds/` με το όνομα του τύπου —
`follow.mp3`, `sub.mp3`, `resub.mp3`, `subgift.mp3`, `subbomb.mp3`,
`cheer.mp3`, `raid.mp3`, `tip.mp3`. Ό,τι λείπει, απλώς δεν παίζει.

**Με URL ανά κατηγορία**: στο `alerts.sounds` βάζεις συγκεκριμένο link για
όποιον τύπο θες. Ό,τι ορίσεις εκεί υπερισχύει του φακέλου, οπότε μπορείς να
έχεις τα περισσότερα από τον φάκελο και έναν ξεχωριστό ήχο για τα raids.

```js
sounds: { raid: 'https://.../raid-horn.mp3', tip: 'https://.../coin.mp3' }
```

**Στο StreamElements** υπάρχει ένα πεδίο ανά κατηγορία στην ομάδα «Ήχος».
Εκεί δεν υπάρχει τοπικός φάκελος, οπότε τα mp3 θέλουν δημόσιο URL.

Ένταση και on/off στο `config.js → alerts`. Στο OBS θέλει τσεκαρισμένο το
**Control audio via OBS** στο browser source για να ακούγεται στο stream.

---

## Custom ανά άτομο

Τρία επίπεδα, από το πιο γρήγορο στο πιο βαθύ. Διάλεξε το μικρότερο που
κάνει τη δουλειά.

### 1. Παράμετροι στο URL — δευτερόλεπτα

Χρώμα, θέση, μέγεθος, κείμενα. `?accent=ff5a5f&pos=top-left&scale=1.2`.
Δεν χρειάζεται να αγγίξεις αρχείο.

### 2. Skin — όταν θέλουν άλλο ύφος

Ένα skin είναι **ένα αρχείο CSS** που φορτώνεται τελευταίο, μετά από όλα τα
άλλα, οπότε μπορεί να ξαναγράψει τα πάντα: σχήματα, περιγράμματα, σκιές,
γραμματοσειρές, ακόμα και τα animations. Ο κώδικας των overlays δεν αλλάζει
καθόλου.

```
skins/
  default/skin.css    το look που ήρθε από το κουτί (κενό — δεν αλλάζει τίποτα)
  anime/skin.css      manga πάνελ: χαρτί, μαύρο περίγραμμα, σκληρές σκιές,
                      speed lines, halftone, αστέρια αντί για σωματίδια
  ninja/skin.css      shinobi: πάπυρος με ξύλα, ατσάλινο shuriken που
                      πετάγεται μπροστά και φύλλα που το ακολουθούν
```

Ένα skin μπορεί να έχει **variants** — ίδια σχήματα και ίδια κίνηση, άλλη
παλέτα. Το `ninja` έχει τέσσερις: `?variant=mono` (χωρίς χρώμα, μόνο μελάνι
και ατσάλι), `crimson`, `frost`, `jade`. Στο StreamElements είναι dropdown
στο πάνελ του widget, οπότε το αλλάζει ο ίδιος ο streamer.

Το `ninja` δείχνει πόσο μακριά φτάνει ένα skin: ο shuriken είναι σχήμα CSS
(`clip-path`), τα φύλλα είναι τα ίδια σωματίδια με άλλο σχήμα και άλλη
τροχιά, και η κάρτα ξετυλίγεται **μετά**, με καθυστέρηση που ορίζει το skin.
Μηδέν αλλαγή σε HTML ή JS.

> Πόσα φύλλα πετάνε δεν το αποφασίζει το skin — είναι το
> `alerts.burst` στο `js/config.js` (ή στο `config` του client).

#### Rank: πόσο μεγάλο είναι το event

Το `alerts.ranks` στο `js/config.js` κρατάει κατώφλια **ανά τύπο**, στη
μονάδα που έχει νόημα για τον καθένα:

| Τύπος | Μετράει | Κατώφλια |
|---|---|---|
| `resub` | μήνες | 1 · 3 · 6 · 12 · 24 · 36 |
| `cheer` | bits | 1 · 300 · 1.000 · 5.000 · 10.000 · 25.000 |
| `tip` | ευρώ | 1 · 5 · 10 · 25 · 50 · 100 |
| `subgift` `subbomb` | subs | 1 · 3 · 5 · 10 · 25 · 50 |
| `raid` | viewers | 1 · 20 · 50 · 200 · 500 · 1.000 |

Και τα έξι σκαλιά βγάζουν το ίδιο `data-rank` (`r1`…`r5`, `legend`), οπότε το
skin τα βάφει **μία φορά** για όλους τους τύπους: χαλκός, ασήμι, χρυσό, μωβ,
και στο τέλος **rainbow**. Έτσι ένα cheer 30.000 bits και ένα sub δύο ετών
δείχνουν εξίσου μεγάλα. Όσο ανεβαίνει το rank, πετάγονται και **περισσότερα
φύλλα** — μέχρι 2,75× στο legend.

Στο χαμηλότερο σκαλί κάθε τύπος κρατάει τη δική του ταυτότητα: bits κεχριμπάρι,
δωρεά πράσινο, raid κόκκινο, follow πορτοκαλί, gift subs νεφρίτης.

Μπαίνει μόνο όταν υπάρχει κάτι να μετρηθεί, οπότε ένα πρώτο sub κρατάει το
χρώμα του Twitch tier του αντί να υποβιβαστεί.

Δοκίμασέ το τώρα: στο Control Room διάλεξε **Skin → anime**, ή βάλε
`?skin=anime` σε οποιοδήποτε overlay.

**Για νέο skin:** αντίγραψε τον φάκελο `skins/default/` σε `skins/<όνομα>/`
και γράψε. Το `skins/default/skin.css` έχει μέσα λίστα με όλα τα class names
που μπορείς να πιάσεις. Τίποτα άλλο — το `skins/skins.json` ξαναγράφεται
μόνο του σε κάθε build, οπότε το νέο skin εμφανίζεται στο dropdown του
Control Room **και** μέσα στο StreamElements.

Δύο πράγματα που αξίζει να ξέρεις:

- Κάθε σελίδα έχει δικό της class στο `<body>` (`page-alerts`, `page-goal`,
  `page-chat`, `page-labels`, `page-scene`). **Μόνο** το `page-scene`
  επιτρέπεται να πάρει background — τα υπόλοιπα πρέπει να μείνουν διάφανα,
  αλλιώς βάφουν πάνω από το gameplay στο OBS.
- Τα animations αλλάζουν ξαναγράφοντας το `@keyframes` με το ίδιο όνομα
  (`cardIn`, `cardOut`, `rise`, `riseIn`, `fly`, `pop`, `lineIn`, `marquee`).

### 3. Νέο widget — όταν θέλουν κάτι που δεν υπάρχει

Αντίγραψε το `overlays/_template.html` σε `overlays/<όνομα>.html`. Παίρνεις
έτοιμα: τα events, τις παραμέτρους URL, το skin, τα κοινά χρώματα. Μένει μόνο
το δικό σου κομμάτι.

---

## Παράδοση: φάκελος ανά άτομο

Κάθε streamer περιγράφεται σε ένα αρχείο στο `clients/`:

```json
{
  "displayName": "Nikos",
  "channel": "nikosplays",
  "skin": "anime",
  "config": { "goal": { "label": "Στόχος: 1000 followers", "target": 1000 } },
  "overlays": [
    { "id": "alerts", "params": "pos=top-center" },
    { "id": "goal",   "params": "pos=bottom-left" }
  ]
}
```

Το `config` είναι patch πάνω στο `js/config.js` — γράφεις μόνο ό,τι αλλάζει.

Μετά:

```bash
node make.js nikos --zip
```

Βγάζει `dist/nikos/` (και `dist/nikos.zip`) με:

- το skin τους ήδη ψημένο μέσα — δεν χρειάζονται `?skin=` πουθενά
- τις ρυθμίσεις τους σε `js/client-config.js`
- Control Room που δείχνει **μόνο** τα δικά τους overlays με τα σωστά URL
- **`ΟΔΗΓΙΕΣ.md`** γραμμένο για αυτούς, με τα βήματα OBS και τα μεγέθη

`node make.js --all --zip` τα χτίζει όλα μαζί.

Ο φάκελος είναι αυτόνομος: τρέχει στο PC τους, δεν εξαρτάται από σένα.
Θέλουν αλλαγή; Αλλάζεις το `clients/<όνομα>.json`, ξανατρέχεις το `make.js`,
στέλνεις καινούριο zip.

---

## Παράδοση 2: μέσα στο StreamElements

Ο άλλος τρόπος: τα overlays γίνονται **Custom Widgets** στο StreamElements.
Ο streamer δεν κατεβάζει τίποτα και δεν τρέχει τίποτα — όλα ζουν στο SE.

```bash
node make-se.js kenji
```

Βγάζει `dist/kenji-se/<widget>/` με τέσσερα αρχεία ανά widget:

| Αρχείο | Πού πάει στο SE |
|---|---|
| `widget.html` | καρτέλα **HTML** |
| `widget.css` | καρτέλα **CSS** |
| `widget.js` | καρτέλα **JS** |
| `fields.json` | καρτέλα **FIELDS** |

Στο SE: *overlay editor → + Add Widget → Custom Widget → Settings → OPEN
EDITOR*, σβήνεις ό,τι έχει και κάνεις επικόλληση τα τέσσερα.

**Τι κερδίζεις:** τα events έρχονται από το ίδιο το StreamElements — χωρίς
token, χωρίς socket, χωρίς να τρέχει τίποτα στον υπολογιστή τους. Και μέσω
του `fields.json` ο streamer αλλάζει μόνος του θέση, διάρκεια, κείμενα και
χρώματα από το πάνελ του SE, χωρίς να πειράξει κώδικα.

**Ονόματα πεδίων:** μη βάλεις ποτέ τελεία σε όνομα field. Το StreamElements
τη διαβάζει ως δική του διαδρομή και **η ρύθμιση δεν αποθηκεύεται**. Γι' αυτό
τα βαθιά πεδία λέγονται `cfg__alerts__minCheer` με διπλή κάτω παύλα — το
bootstrap τα ξεδιπλώνει μόνο του μέσα στο `OverlayConfig`.

**Το στυλ μέσα στο SE:** κάθε widget κουβαλάει **όλα** τα skins και έχει
dropdown **Στυλ**. Ο streamer αλλάζει από Ninja σε Anime μόνος του, χωρίς να
του ξαναστείλεις τίποτα — η μία επικόλληση τα καλύπτει όλα. Το skin του
client είναι απλώς η αρχική τιμή του dropdown.

**Τα χρώματα μέσα στο SE:** κάθε widget έχει dropdown **Χρώμα** με τα
variants του skin (Κανονικό / Χωρίς χρώμα / Κόκκινο / Παγωμένο / Νεφρίτης),
συν **Δικό μου χρώμα** που ενεργοποιεί τον colorpicker από κάτω για ό,τι
απόχρωση θέλει. Στο «Δικό μου χρώμα» τα tiers παύουν να διαφέρουν μεταξύ
τους — είναι το τίμημα του ενός επιλεγμένου χρώματος.

**Τι χάνεις:** οι ήχοι θέλουν δημόσιο URL (δεν υπάρχει τοπικός φάκελος μέσα
στο SE) — το βάζεις στο πεδίο «URL φακέλου με τα mp3», αλλιώς μένει αθόρυβο.

### Δοκιμή πριν την επικόλληση

```bash
node serve.js
```

και άνοιξε <http://localhost:8777/se-preview.html>. Φορτώνει τα built αρχεία
σε iframe και τους στέλνει `onWidgetLoad` και `onEventReceived` **ακριβώς**
όπως το StreamElements. Ό,τι παίζει εκεί, παίζει και στο SE.

> Προσοχή στη διαφορά: το source `streamelements` στο `config.js` είναι για
> **τοπικό** overlay που τραβάει events από το SE με JWT. Το source `se`
> είναι για overlay που **τρέχει μέσα** στο SE. Το `make-se.js` βάζει το
> δεύτερο μόνο του — δεν χρειάζεται να το ρυθμίσεις.

---

## Ρυθμίσεις OBS που αξίζουν

- ✅ **Shutdown source when not visible**
- ✅ **Refresh browser when scene becomes active**
  → κάθε φορά που γυρνάς στη σκηνή, τα alerts ξεκινούν καθαρά.
- Για το Alerts source: μην το κάνεις resize — άσ' το 1920×1080 και άλλαξε `pos`.
- Δεξί κλικ στο source → **Interact** αν θέλεις να δεις τι κάνει.

---

## Δομή

```
index.html              Control Room — preview + κουμπιά δοκιμής + URLs
css/theme.css           χρώματα, γραμματοσειρές, κοινά στοιχεία
js/config.js            οι προεπιλεγμένες ρυθμίσεις
js/core.js              event bus, ουρά, formatting, demo events
js/connect.js           chat / StreamElements / EventSub adapters
overlays/*.html         τα ίδια τα overlays
overlays/_template.html αφετηρία για νέο widget
skins/<όνομα>/skin.css  εναλλακτικά looks
clients/<όνομα>.json    τι θέλει ο κάθε streamer
make.js                 χτίζει το dist/<όνομα>/ και το zip (τοπικός φάκελος)
make-se.js              χτίζει το dist/<όνομα>-se/ (StreamElements widgets)
se-preview.html         δοκιμή των SE widgets πριν την επικόλληση
dist/                   τα έτοιμα πακέτα προς παράδοση
serve.js  start.cmd     τοπικός server για http://localhost:8777
assets/sounds/          βάλε εδώ τα mp3
```
