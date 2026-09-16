# Suci — working notes

Pelacak siklus haid berbasis fiqih thaharah empat mazhab. Next.js 15 App Router,
React 19, TypeScript, Tailwind v4. No database for user data: everything lives
in an encrypted vault in the browser.

UI copy is **Indonesian**. Code, comments and commits are **English**. Keep both.

## Commands

```bash
npm run dev             # http://localhost:3000
npm test                # unit (vitest)
npm run test:all        # typecheck + lint + unit + contrast — run before committing
npm run build
npm start               # needed for e2e
npm run test:e2e        # 102 checks against a running production build
```

`npm run test:all` is the gate. `test:e2e` needs `npm run build && npm start`
running in another terminal.

## The rules that are not obvious

These are load-bearing. Each one is a mistake that was already made and fixed;
breaking them again is invisible in review but visible to a user.

**1. Fiqh numbers live in exactly one file.**
`lib/fiqh/madhhab.ts` is the only place a day-count, a threshold or a citation
may be written down. Every screen, calculation and citation reads from it, so
correcting a number there corrects the whole app. Never inline `15` or `60` or
"Syafi'i says…" anywhere else.

⚠️ **Those numbers have not been verified against the cited works.** They were
transcribed from the design brief and standard summaries. The citations are
pointers for a reviewer, not evidence of review. This is the single biggest
open risk in the project and it needs a qualified person, not another commit.

**2. A ruling is never rendered without its reasoning.**
`lib/fiqh/verdict.ts` returns the ruling, the reasoning trail and the citation
as one object, so there is no way to show a conclusion without its argument.
That is a promise onboarding makes. Do not add a path that returns a bare
classification.

**3. The share server must stay blind.**
`lib/server/share.ts` stores ciphertext, an IV and a timestamp. Nothing
readable may be added — not a state, not a label, not a `type` field that
happens to say `haid`. The key travels in the URL fragment, which browsers
never transmit; nothing may move it into a path, a query or a request body.
`lib/share/payload.ts` says what may go inside the envelope and why "the server
cannot read it" is not an argument for putting more in.

**4. Encryption does not hide write timing, and the UI says so.**
For a cycle tracker the rhythm of writes *is* the sensitive fact. That is why
the client publishes only on a real state change or past half the TTL, and why
Mode Suami carries a "Yang tetap tidak tersembunyi" section. Do not make the
client chattier, and do not soften that copy.

**5. Failures must not blame the user.**
A missing share record means "not found" only when there was somewhere durable
to look; with the in-process fallback the API answers 503, and the reader page
distinguishes revoked / not-ready / offline / no-key / wrong-key / unknown
version. Only "revoked" mentions the owner. This whole category exists because
the app once told a reader a freshly created link had been "dimatikan oleh
pemiliknya".

**6. CSS resets go in `@layer base`.**
An unlayered `button { color: inherit }` once beat every Tailwind colour
utility in the app. `app/globals.css` keeps resets layered, and e2e asserts
computed colours so it cannot come back.

**7. Hooks before early returns.**
Several screens return `null` while the vault is opening. Anything using a hook
must be derived above that return.

**8. `update()` is async.**
It returns a Promise and serialises writes. Await it before showing "Tersimpan"
— the label once flipped before the encrypted write had landed.

## Layout

```
app/                 one route per screen, grouped by the design's four flows
components/          design system: primitives, icons, phone shell, motion
lib/fiqh/            rules, cycle engine, verdicts, prayer times
lib/store/           encrypted vault, share crypto, the React store
lib/share/           what may travel in a share link, and what it cannot hide
lib/server/          the blind relay: storage adapter and the share row
public/sw.js         service worker — offline shell and asset caching
tests/e2e.mjs        end-to-end checks against a production build
project/             the original Claude Design handoff, unmodified
```

## Deployment

Vercel, auto-deploys from `main`. Everything works with no configuration
**except Mode Suami**, which needs a store — see `.env.example` and the
Deploying section of `README.md`. Without one, `/api/share` reports
`{"storage":"memory","durable":false}` and the app warns rather than handing
out a link that will not work.

## Style

- Comments explain *why*, especially where the reason is a mistake already
  made. Do not narrate what the code plainly does.
- Match the surrounding file's comment density and naming.
- Accessibility is checked, not assumed: `npm run test:contrast` reads the
  tokens straight out of `globals.css`, and e2e asserts structure, focus and
  reduced motion. Target size is 44px minimum.
- Motion is calm — a few pixels of rise with a fade, nothing bouncing — and
  fully disabled under `prefers-reduced-motion`.
