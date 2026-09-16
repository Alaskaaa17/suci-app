# Suci

Pelacak siklus haid berbasis fiqih thaharah empat mazhab, dengan jadwal ibadah
harian.

Implementation of the Claude Design handoff in `project/Suci.dc.html` — 24
screens across four flows — as a working Next.js app.

## ⚠️ The fiqh rules need review

Every ruling this app produces comes from one file: **`lib/fiqh/madhhab.ts`**.
Its numbers were transcribed from the design brief and the standard summaries
each school is usually given in introductory thaharah texts. **They have not
been verified against the cited works.** The citations name where each position
is conventionally traced to — they are pointers for a reviewer, not evidence
that checking has happened.

Nothing outside that file hardcodes a limit, so correcting a number there
corrects every screen, calculation and citation at once.

What the engine deliberately does **not** model: tamyiz (distinguishing strong
from weak blood), the full mubtada'ah / mu'tadah / mutahayyirah classifications,
Hanafi rules for blood spanning a habit boundary, and 'iddah. Where it runs past
what it models it says so and points the user to a person, rather than guessing.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # engine, prayer times, crypto, storage, share API (100)
npm run typecheck
npm run build

npm run test:contrast   # WCAG contrast across both themes
npm run test:all        # typecheck + lint + unit + contrast

# end-to-end, against a running production build
npm run build && npm start &
npm run test:e2e        # 101 checks: flows, offline, security, a11y
```

Full-bleed on a phone; on a wide screen it renders inside the 390×844 frame from
the design canvas.

### Deploying

Vercel works with no configuration: standard Next.js, defaults for the build
command and output. Push the repo, import it, done.

**Except Mode Suami.** It is the one feature with server state, and it needs
somewhere to keep it. Without one the app falls back to an in-process map, and
on serverless the request that writes a status and the request that reads it
land in different instances, so a freshly created link resolves to nothing.

Two backends are supported; `lib/server/store.ts` picks whichever the
environment provides, and neither needs a code change.

| | env vars | cost | notes |
|---|---|---|---|
| **Upstash Redis** (recommended) | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, or the `KV_REST_API_*` pair Vercel KV injects | free tier at [console.upstash.com](https://console.upstash.com); the Vercel Marketplace listing is paid | real TTLs, real atomic counters, and a token that reaches one database |
| **Vercel Edge Config** | `EDGE_CONFIG` (injected on connect) + `VERCEL_API_TOKEN` (made by hand), plus `VERCEL_TEAM_ID` if the project is under a team | free on Hobby | see the caveats below |

Edge Config is a config store being used as a database. It works, and the
compromises are real:

- **`VERCEL_API_TOKEN` is not scoped to the Edge Config.** Vercel tokens reach
  an account or a team, so the secret guarding one status is worth far more
  than the status. This is the strongest argument for Upstash, and it is a deployment
  decision rather than a code one.
- **No TTL.** Expiry rides inside each value and is enforced on read; expired
  keys are swept on the next write. The promise that a stale "suci" cannot
  linger is kept by our code, not by the platform.
- **8 KB total on Hobby**, and writes are rate limited. Fine for a household.
- **The request rate limiter falls back to per-instance memory**, because a
  counter written on every read would exhaust the write budget in minutes. What
  protects a status is the write secret, not the limiter.
- **Reads are eventually consistent**, so a status change can take a moment to
  reach the reader.

Because of the write budget, the client only publishes when the bit actually
changed, when the link is new, or when the record is more than half-way to
expiry. It used to publish on every render of a new verdict — every app open,
every edited entry — which was invisible against Redis and fatal here.

With no backend at all, the app used to fail silently and blame the wrong
person: the reader was
told "tautan ini tidak berlaku — mungkin sudah dimatikan oleh pemiliknya" for a
link created a minute earlier. Now the server reports `503 storage_unavailable`
instead of `404` when it has nowhere durable to look, Mode Suami warns on the
screen where the link is handed over, and the reader page says the service is
not ready rather than accusing the owner. `GET /api/share` reports which store
is live.

Two things are handled in `next.config.ts` rather than left to the platform:

- **`/sw.js` must always revalidate.** A CDN holding an old service worker
  would pin every installed user to a stale app with no way to update — the
  worst failure mode a PWA has.
- **`/s/` share pages are `no-store` and `noindex`.** They are the only pages
  anyone else opens, and nothing should sit between the user and the reader.

Note that the share link embeds whatever origin it was generated on, so a link
made on a preview deployment points at that preview.

### Installing it

Suci is a PWA. Open it on a phone and use "Add to Home Screen" — it then runs
without browser chrome, in the phone frame the design assumes, and works with
no signal at all.

## How it is put together

```
app/                  one route per screen, grouped by the design's four flows
components/           the design system: primitives, icons, phone shell
lib/fiqh/             the domain — rules, cycle engine, verdicts, prayer times
lib/store/            encrypted local vault, share crypto, the React store
lib/share/            what may travel inside a share link, and what it cannot hide
lib/server/           the blind relay — storage adapter and the share row
lib/content/          glossary, FAQ, substitute deeds
public/sw.js          service worker — offline shell and asset caching
tests/e2e.mjs         end-to-end checks against a production build
scripts/make-icons.mjs  regenerates the PWA icons from the app mark
project/              the original design handoff, unmodified
```

### The cycle engine

`lib/fiqh/cycle.ts` turns daily logs into a per-day ruling using only the rule
table:

1. decide which logged days count as bleeding for this school (colour rules
   differ — sufrah and kudrah are haid for some, not others)
2. group them into runs of consecutive days
3. merge runs whose gap is shorter than the minimum tuhr, where the school
   bridges, so a two-day pause does not fake a second period
4. rule each episode — too short → istihadhah; otherwise haid up to the
   maximum, with the overflow as istihadhah
5. fill in suci, and ask for confirmation only where an unlogged gap would
   actually change the ruling

Life phases (pregnancy, nifas, menopause) short-circuit step 4.

`lib/fiqh/verdict.ts` returns the ruling and the argument for it as one object,
so there is no way to render a conclusion without its reasoning trail and
citation attached. That is the promise onboarding makes.

### Security

The threat this is built for is a shared or borrowed phone, not a forensics
lab. What that means in practice:

- **The vault auto-locks.** Unlocking once and staying open until a reload does
  not keep the promise onboarding makes, so the app re-locks after two minutes
  out of sight. Only when hidden, never mid-entry, so no draft is ever lost.
- **Failed PINs are throttled.** PBKDF2 alone costs about a quarter second a
  guess, which leaves six digits reachable in days by someone holding the
  phone. Five free attempts, then escalating lockouts to a 15-minute cap, which
  puts exhaustion past 25 years. The counter is stored in the clear on purpose:
  it holds no secret, and it has to survive the reload an attacker would reach
  for.
- **`connect-src 'self'`.** With no backend, every outbound request is an
  exfiltration attempt. This is the header that matters here; a compromised
  dependency is the realistic threat for an app with no server and no
  user-generated HTML. `script-src` keeps `'unsafe-inline'` because every page
  is statically rendered — the reasoning and the conditions for revisiting it
  are in `next.config.ts`.
- **The share token is drawn uniformly.** `byte % 31` would push the first
  eight letters about 3% high; it is the only thing between a guessed URL and
  someone's cycle status, so it uses rejection sampling. Asserted in
  `lib/store/crypto.test.ts`.

Known and accepted: `npm audit` reports a postcss advisory reachable only
through Next's own build pipeline, on CSS we author ourselves. Clearing it
needs Next 16. It does not ship to the browser.

### Motion

The design's voice is calm — "dengan tenang", "pelan-pelan saja" — so nothing
bounces or overshoots. Movement is a few pixels of rise with a fade, eased out,
and its job is to show where something came from rather than to be noticed. The
ring on Beranda draws from empty and the day number counts up, because the
screen did compute something and saying so is honest.

Everything is defined in `globals.css` and switched off entirely under
`prefers-reduced-motion`, including the transforms that actually cause trouble
for vestibular sensitivity. The count-up checks the media query itself, since
CSS cannot stop a JavaScript-driven number. The e2e suite asserts both that
animation runs and that reduced motion kills it.

### Accessibility

Audited against WCAG 2.2 Level AA. `npm run test:contrast` measures every
text/background pair the design uses, in both themes, reading the tokens
straight out of `globals.css` so it cannot drift from what ships.

All text passes AA in both themes on the designer's palette. Two things changed:

- **Form controls got their own border token.** `--hair` sits at 1.25:1 against
  the page — fine for a decorative divider, but it left text fields with no
  visible box, and there the border is the whole affordance. `--field-b` meets
  3:1 and is used only on inputs, selects and the date fields, so the rest of
  the design keeps its lightness.
- **Targets reach 24×24.** Back links were 20px tall and the ± steppers 15×15,
  both under 2.5.8. Negative margins absorb the added padding, so nothing moved.

The pastel card borders sit below 3:1 and are left alone. They are reported,
not failed: each surrounds its own distinct fill, beside a glyph, beside a text
label, so no border is ever the only thing carrying meaning — which is the
design's own rule, and what 1.4.11 actually asks about.

Beranda also gained an `h1` (the greeting), and the PIN pad takes physical
keyboard input — a keypad that only answers to taps is unusable with a keyboard
or a switch device.

### Storage and the PIN

Onboarding says two things: notes live on this phone, and the PIN cannot be
recovered because it is never sent anywhere. `lib/store/crypto.ts` makes both
true — the PIN is stretched with PBKDF2-SHA-256 (310k iterations) into an
AES-GCM key, and only ciphertext, salt and IV are written. There is no recovery
path, by design. Choosing "Nanti saja" stores the vault in the clear and the UI
says so rather than implying protection that is not there.

Threat model: a shared or borrowed phone. Browser storage has no secure enclave,
so this does not defend against code execution on an unlocked device.

### Husband mode: a relay that cannot read

This is the only reason Suci has a server at all, and **the server cannot read
what it stores.** Each share session is one row of AES-256-GCM ciphertext plus
its IV. The key is generated on the sender's device and travels in the URL
fragment, which no browser transmits — not in the request line, not in
`Referer`, not on a `fetch`. The relay is handed something it has no way to
open, whatever it is later tempted or compelled to do with what it holds.

```
https://domain/s/<shareId>#k=<shareKey>
                 └── path: the server sees this
                              └── fragment: it never leaves the device
```

Two keys, and the separation is the design:

| | `lib/store/crypto.ts` | derived from | lives in |
|---|---|---|---|
| **vault key** | PBKDF2-SHA-256, 310k, non-extractable | her PIN | memory, while unlocked |
| **share key** | `generateShareKey()`, fresh CSPRNG, extractable | **nothing** | the vault, and the link fragment |

`generateShareKey` takes no arguments, which is asserted in the tests, because
a key derived from the master key would make handing someone a link a foothold
into everything else she owns. It is not one.

`lib/server/share.ts` is responsible for four properties:

- **Nothing legible may be in the row.** Not the state, not a label, not a
  "type" field that happens to say `haid`. The moment one plaintext field is
  convenient the guarantee is gone and every screen claiming it becomes a lie.
  The e2e suite reads the stored row back and greps it.
- **Holding the link does not let you write.** The shareId travels in a URL and
  will be forwarded and screenshotted — and the key rides beside it, so a
  reader could otherwise encrypt a valid-looking status and overwrite hers, or
  just delete the row. Writing needs a third secret that never enters the link,
  stored only as a hash.
- **A status cannot linger.** Rows expire after a fortnight.
- **Revocation is immediate.** Turning Mode Suami off, or rotating the link,
  deletes the row. Rotating also mints a new key, so the old one is useless
  against the new ciphertext rather than merely pointing somewhere else.

#### What encryption does not hide

Stated on the Mode Suami screen too, because a claim of encryption that quietly
omits this is worse than no claim:

- **Write timing.** The row carries when it was written, and the operator sees
  every request. For a cycle tracker the rhythm of writes *is* the sensitive
  fact — a status that flips every few weeks draws the cycle in timestamps with
  every byte of content opaque. Encryption does nothing about this. It is the
  reason the client publishes only on a real change or past half the TTL: a
  chatty client draws a more detailed picture than a quiet one.
- **Ciphertext size.** Visible. The payload is fixed-shape and both states
  encode to the same length, asserted in `lib/store/crypto.test.ts`, so it
  leaks nothing — which is a reason to keep it fixed-shape.
- **Who asked.** The reader's IP and user agent reach the server like any
  request.
- **Anyone holding the full link can read it**, including whoever it gets
  forwarded to. Security rests on the secrecy of the link, not on accounts.
- **The reader's device remembers the key**, so a bookmark still works. That
  is a decryption key in their localStorage; the reader's page says so and
  offers a button to clear it.

The payload itself is guarded in `lib/share/payload.ts`. Encryption protects it
from the operator, not from the person holding the link — so "the server cannot
see it" is not an argument for putting more in it.

The rest of the app is untouched: entries, rulings and the vault never cross
the network at all.

#### Provisioning

Pick a backend from the table under [Deploying](#deploying), then:

**Upstash Redis.** Create a database at [console.upstash.com](https://console.upstash.com),
copy the REST URL and REST token from its **REST API** panel, and add them in
Vercel → Settings → Environment Variables as `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN`. Redeploy. (Provisioning through the Vercel
Marketplace instead injects the `KV_REST_API_*` names, which are also read.)

**Vercel Edge Config.** Storage → Create → Edge Config, connect it to the
project — that injects `EDGE_CONFIG`. Writes additionally need a token from
Vercel → Account Settings → Tokens, added as `VERCEL_API_TOKEN`, plus
`VERCEL_TEAM_ID` if the project lives under a team. Redeploy.

Either way, `GET /api/share` reports which backend is live. Without one the app falls back to an in-process map so local development and
the test suite work with nothing provisioned. That fallback is per-instance —
fine for `npm run dev`, and **not merely unreliable but non-functional on
serverless**, where consecutive requests hit different instances. An earlier
version of this note said it "disappears on restart", which undersold it badly
enough to be wrong in practice.

So `storageKind()` is not just introspection, it changes what the API says. A
missing record means "revoked or expired" only when there was a durable place to
look; under the fallback it means nothing at all, and the endpoint answers `503
storage_unavailable` rather than `404`. Every screen that could otherwise
present a deployment problem as a user's decision reads that signal: Mode Suami
warns before the link is shared, and the reader page separates "not ready" from
"taken down".

### Offline

The app talks to no server, so offline is its normal condition rather than a
degraded one — the only thing that ever needs fetching is the shell. The
service worker precaches every route on install, along with the JS chunks it
finds referenced in that HTML, so a cold start with no signal behaves like a
warm one.

It also caches the RSC payload for each route. Without that, an offline tab tap
falls back to a full browser navigation, which remounts the app and re-prompts
for the PIN — unusable in exactly the condition the app is built for.

Two things it must never cache, both asserted in the e2e suite:

- **`/s/` share pages.** A cached copy would outlive the token that authorised
  it and could show a stale status to someone the user has already cut off.
- **Anything carrying the vault.** User data lives only in localStorage and
  never crosses the network, so it cannot reach the Cache API — but a future
  sync feature could break that silently, so the test checks.

Bump `CACHE_VERSION` in `public/sw.js` when changing it; old caches are dropped
on activate.

### Prayer times

Real solar calculation (`lib/fiqh/prayer-times.ts`), within a minute or two of
published Kemenag schedules; see `prayer-times.test.ts`. The schedule follows
the city chosen in Pengaturan, not the device clock.

## Where it departs from the design, and why

- **Name field in onboarding.** The canvas greets "Aisyah" on Beranda but never
  asks for a name. Step 2 now has an optional name field; without one the
  greeting simply omits it.
- **Fixed 844px frames.** A canvas artefact. Screens scroll, so content is
  allowed to be taller than the viewport.
- **Status bar.** Shown only in the desktop frame, with the real time rather
  than the mockup's 9:41. On a phone the OS draws it.
- **Counts are derived.** The canvas says "42 istilah" and "18 pertanyaan"; the
  UI reads the array lengths instead, so it cannot promise entries that do not
  exist.
- **Focus states.** The canvas has none. A PIN keypad that cannot be driven from
  a keyboard is not shippable, so every interactive element has a visible focus
  ring.

## Not built

- **Sign in with Google and cloud sync.** There is no backend in scope. The
  onboarding button is omitted rather than shown dead, and Pengaturan says
  plainly that sync is unavailable and what to do instead.
- **Cross-device sharing.** Follows from the above: the share link resolves on
  the device that created it. Mode Suami states this.
- **The staged istihadhah calculator**, which the design's own footer lists as
  outstanding. Separating haid from istihadhah in a long bleed needs tamyiz,
  which the engine does not model — the app flags those cases instead.
- **Empty states per tab and drill-in transitions**, also from that footer.
- **Push notifications** for prayer times. Would need a service the app
  deliberately does not have; a local scheduled notification is possible and
  has not been built.
