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
npm test             # engine + prayer-time unit tests (33)
npm run typecheck
npm run build

npm run test:contrast   # WCAG contrast across both themes
npm run test:all        # typecheck + lint + unit + contrast

# end-to-end, against a running production build
npm run build && npm start &
npm run test:e2e        # 81 checks: flows, offline, security, a11y
```

Full-bleed on a phone; on a wide screen it renders inside the 390×844 frame from
the design canvas.

### Deploying

Vercel works with no configuration: standard Next.js, no backend, no
environment variables, nothing to provision. Push the repo, import it, done.
The build command and output are the defaults.

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
lib/store/            encrypted local vault and the React store over it
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

### Husband mode

The vault is sealed behind the PIN, so the shared page cannot read it. Mode
Suami publishes a separate, deliberately tiny record holding exactly what the
design promises to share — the token and one bit, haid or suci. Nothing may be
added to that shape without re-reading what the screen tells the user it shares.

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
