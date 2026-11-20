# Design screens

These are the source files of the designed screens, exported from the design
canvas: https://claude.ai/artifact/AHSZcL5YxyVBQj3QqU6NFp (open it to click
through the interactive ones).

Format: each `.dc.html` is HTML with inline styles inside `<x-dc>`, with a
small template syntax (`{{value}}`, `<sc-for>`, `<sc-if>`) and a
`class Component` at the bottom holding state and logic. They won't open as plain
web pages. Use them as the **reference for layout, spacing, copy and behaviour**
when building the React components. The interactive logic in
`AddExpense.dc.html` (split modes, validation, rounding note) and
`Balances.dc.html` (simplify toggle) shows the intended behaviour.

| File | Screen | Size |
|---|---|---|
| Main.dc.html | Home | 390 × 844 |
| Group.dc.html | Group expenses | 390 × 844 |
| AddExpense.dc.html | Add expense (interactive) | 390 × 844 |
| Balances.dc.html | Balances & settle up (interactive) | 390 × 844 |
| RecordPayment.dc.html | Record payment sheet (interactive) | 390 × 844 |
| Activity.dc.html | Activity (live) | 390 × 844 |
| Desktop.dc.html | Desktop group page (fluid) | 1440 wide |
