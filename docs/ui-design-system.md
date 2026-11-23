# UI design system

One stylesheet, `frontend/css/style.css`, styles every screen. There is no
build step, no framework and no second sheet for dark mode.

## How it is organised

The file is in 16 numbered sections, in this order:

| # | Section | Holds |
|---|---|---|
| 01 | Design tokens | every colour, radius, shadow and spacing value |
| 02 | Reset and base | box sizing, body, focus ring |
| 03 | Typography | headings, body text, `.eyebrow`, `.muted`, `.small` |
| 04 | Layout primitives | `.page-shell`, `.main`, `.grid`, `.narrow`, `.actions` |
| 05 | Application shell | top bar, wordmark, language switch, role badge, offline banner, footer |
| 06 | Buttons and links | one geometry for every clickable control |
| 07 | Forms | fields, inputs, password reveal, `.mode-switch` |
| 08 | Cards and panels | `.card` and its lattice band |
| 09 | Status and messaging | `.status`, `.error`, `.emergency`, `.risk` |
| 10 | Record lists | `.list-card` and the severity rails |
| 11 | Statistics | `.stat-row`, `.stat`, `.step-number` |
| 12 | Screening flow | questions, options, progress, patient code |
| 13 | Follow-up and appointments | notes editor, rebooking panel |
| 14 | Page compositions | home and sign-in only |
| 15 | Responsive | three breakpoints |
| 16 | Motion and print | reduced motion, print sheet |

**Rule: components never hard-code a colour.** Every colour is `var(--token)`.
If a value is needed twice, it becomes a token in section 01.

## Tokens

Light mode is declared on `:root`. Dark mode redeclares the same names on
`html[data-theme="dark"]`. Nothing else differs, so adding a theme is a token
swap.

| Group | Tokens |
|---|---|
| Surfaces | `--page`, `--surface`, `--surface-2`, `--surface-3` |
| Text | `--ink`, `--ink-strong`, `--muted`, `--on-brand` |
| Lines | `--line`, `--line-strong` |
| Brand | `--brand`, `--brand-dark`, `--brand-soft`, `--accent`, `--link` |
| Clinical signals | `--danger`, `--warn`, `--ok`, each with a `-soft` background |
| Decoration | `--lattice-bg`, `--lattice-ink`, `--lattice-light` |
| Geometry | `--radius-sm`, `--radius`, `--band`, `--shell`, `--gutter`, `--pad`, `--gap` |
| Elevation | `--shadow-sm`, `--shadow`, `--shadow-lg` |
| Focus | `--focus` |

Clinical signal colours are used only for their meaning: `--danger` for an
emergency or a failure, `--warn` for moderate risk or a degraded state, `--ok`
for low risk and success. They are never used decoratively.

## Theme switching

`frontend/js/theme.js` writes `data-theme` onto `<html>` and stores the choice
in `localStorage` under `ehumure_theme`. Every page carries a small inline
script in `<head>` that applies the stored theme **before first paint**, so
there is no white flash on a dark-mode device. With no stored choice, the
system preference wins.

Each page also declares two `theme-color` meta tags, one per colour scheme, so
the browser chrome matches on mobile.

## The lattice

The diamond lattice is the only decoration in the application. It is defined
once, in two places that share the same token set:

- `.lattice` — the full-size artwork behind the home hero and the sign-in
  brand panel.
- `.card::before` — a `--band`-tall strip across the top of every card.

Because the card band is a pseudo-element, it needs no extra markup and cannot
be forgotten on a new card.

## Components in use

- `.card` — every panel on every screen. Carries the lattice band.
- `.list-card` — one row in a list: a pending screening, an alert, an
  appointment, a staff request, an audit entry. Add `.alert-emergency`,
  `.alert-high`, `.alert-moderate`, `.result-low/-moderate/-high` for the
  coloured left rail.
- `.status` — one line of feedback. Add `.error` for failure. An empty
  `.status` hides itself, so a page never shows an empty box.
- `.stat` — a labelled number on the specialist dashboard.
- `.pill` / `.role-badge` — a count or a role name.
- `.mode-switch` — segmented control, used for the sign-in account type.
- `.emergency` — the boxed self-harm warning. High contrast in both themes.

## Responsive

Three breakpoints, named for what changes rather than for a device:

| Width | What happens |
|---|---|
| 1000px | the home hero and the sign-in split collapse to one column |
| 760px | the top bar stacks, the identity moves to its own row, registration fields go single column, card visuals hide |
| 430px | actions become full-width stacked buttons, answer options go one per row, chrome tightens |

The layout is usable from 320px up. Buttons and inputs keep a 44px minimum
target at every size.

## Accessibility

- A visible 3px focus ring on every focusable element, in both themes.
- `prefers-reduced-motion` removes all animation and transition.
- Status regions use `role="status"` and `aria-live="polite"`.
- The language switch and the account-type switch report `aria-pressed`.
- Colour is never the only signal: severity carries a word as well as a rail.

## Adding a screen

1. Copy the `<head>` and top bar from any existing page. Do not vary them.
2. Wrap content in `<main class="page-shell main">`.
3. Use `.card` for each panel, `.list-card` for rows, `.status` for feedback.
4. Add the page and its required element ids to `testing/page-structure.js`.
5. Run `node testing/run-all.js`.

