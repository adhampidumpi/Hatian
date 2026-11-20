# Design system: "ledger"

Warm paper, black ink, amounts set like an accounting book. Restrained on purpose:
one ground, ink, and two semantic colours for money direction.

## Colour tokens

| Token | Hex | Use |
|---|---|---|
| `paper` | `#F5F3EE` | App background |
| `card` | `#FFFFFF` | Cards, inputs |
| `ink` | `#17160F` | Text, primary buttons, active states |
| `ink-2` | `#55524A` | Secondary text, section labels |
| `ink-3` | `#6E6A61` | Meta text (passes 4.5:1 on white and paper) |
| `line` | `#E4E0D7` | Borders, dividers |
| `line-soft` | `#F0EDE6` | Row dividers inside cards, segmented control track |
| `line-strong` | `#D6D1C6` | Secondary button and chip borders |
| `owed` | `#0B6B4C` | "You're owed / you lent" text and bars |
| `owed-bg` | `#DCEBE6` | Live badge, owed tints |
| `owe` | `#B23E0C` | "You owe / you borrowed" text, validation errors |
| `owe-bar` | `#C2581C` | Negative bars in charts |
| `disabled` | `#DAD6CD` | Disabled button fill |

Member avatar pairs (bg / text / chart bar):
You `#DCE6F2/#1E3A5F/#3B5B85` · Ana `#F3E1D3/#7A3E12/#C2703D` ·
Bea `#E3EEDB/#2F5A1E/#5E8C4A` · Carlo `#EDE2F0/#5B2D6E/#8C5A9E` ·
Dan `#F5E9C8/#6B4E00/#B08A12`. In the app, derive pairs from a fixed palette by
member index.

Dark mode (phase 3): invert ground to ink, keep the semantic hues, re-check contrast.

## Type

- UI: **Instrument Sans** 400/500/600/700
- Amounts: **IBM Plex Mono** 400/500/600, tabular figures, `letter-spacing: -0.03em` on large sizes
- Sizes (mobile): page title 26/700, section 17/600, body 15–16, meta 13, labels 12–13;
  hero amount 36 (home) / 28 (group) / 30 (desktop)
- Day headers: 13/600, uppercase, 0.04em tracking, `ink-2`

## Shape and spacing

- Radius: cards 16–20, buttons 12–14, chips 18–20 (pill), icon tiles 11–12, avatars round
- Page padding 20 (mobile), 28–32 (desktop); card padding 14–20
- Dashed `line-strong` divider inside summary cards (ledger feel)

## Components

- **Primary button:** ink fill, paper text, 46–54px tall
- **Secondary button:** paper fill, `line-strong` border
- **Chips:** white, pill, `line-strong` border; dashed border = optional/empty (e.g. Receipt)
- **Segmented control:** `line-soft` track, selected = white with a small shadow; buttons use `aria-pressed`
- **Switch:** `role="switch"` + `aria-checked`, ink track when on
- **Amount pair:** small label ("you borrowed") above the mono amount, same colour
- **Distribution bar:** 8px stacked bar of each person's share in the split editor
- **Diverging bars:** centre axis; owed to the right (`owed`), owe to the left (`owe-bar`)
- **Bottom sheet:** 24px top radius, grab handle, dimmed backdrop that closes it
- **Live badge:** `owed-bg` pill with a dot; presence line in a dashed box
- Icons: lucide (stroke 1.8–2). No emoji.

## Responsive UX rules

- `< lg`: bottom tab bar (Home, Groups, **Add** as a raised black button, Activity, Account)
- `lg+`: sidebar with Add expense button (keyboard shortcut N), nav and groups with balances
- Desktop group page: content + right rail (balance, suggested payments, live activity); rail wraps under on narrow screens
- Drawers (vaul) on touch/mobile, Dialogs on desktop, via a `useMediaQuery` wrapper
- Native inputs with `inputMode="decimal"` for amounts (no custom keypad)
- Wide tables scroll horizontally inside their card
- Touch targets ≥ 44px; visible focus ring (2px ink, 2px offset)
