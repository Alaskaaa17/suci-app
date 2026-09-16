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
npm run dev        # http://localhost:3000
npm test           # engine + prayer-time unit tests
npm run typecheck
npm run build
```

Full-bleed on a phone; on a wide screen it renders inside the 390×844 frame from
the design canvas.

## How it is put together

```
app/                  one route per screen, grouped by the design's four flows
components/           the design system: primitives, icons, phone shell
lib/fiqh/             the domain — rules, cycle engine, verdicts, prayer times
lib/store/            encrypted local vault and the React store over it
lib/content/          glossary, FAQ, substitute deeds
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
