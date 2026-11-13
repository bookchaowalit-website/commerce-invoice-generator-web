# Ledger — Design direction

## Product surface

Invoice Generator is a local THB invoice drafting tool. It accepts sender, recipient, line items, quantities, and rates, calculates a total, persists a draft in this browser, and exposes a copyable text version. It is not a tax or accounting service.

## Visual world

- **Seed:** \`cf8a725d\`, assigned direction index \`4\` (\`operate\`)
- **World:** a paper ledger desk: the entry side is ruled like an accountant's working sheet, while the preview is a loose invoice paper pulled from the stack.
- **Palette:** rice-paper cream \`#eee7d7\`, ink \`#262725\`, ledger red \`#a94335\`, and desaturated blue \`#344c5c\`.
- **Typography:** Newsreader gives the invoice and main title their printed character; DM Sans handles controls; DM Mono handles currency, labels, and measurements.
- **Composition:** the editable ledger stays flat and inspectable; the invoice preview is the only lifted object and is slightly rotated like a physical draft.
- **Interaction:** edit parties and line items, add/remove rows, watch the total update, and copy a plain-text invoice. Local autosave is named, not implied.
- **Responsive:** the ledger remains first; the paper preview follows and loses its desktop rotation on narrow screens. Line items stack description before numeric fields.


---

## Storybook

Storybook 10 (`@storybook/nextjs-vite`) shows this design system with the app's real CSS, tokens and fonts.

```bash
npm run storybook        # http://localhost:6006
npm run build-storybook  # static build in storybook-static/ (CI: .github/workflows/storybook.yml)
```

- **Foundations/Tokens** reads every CSS custom property the app defines at runtime, so it never drifts from the code.
- **Design/DESIGN.md** renders this file.
- **Components/**, **Sections/** and **Pages/** show the UI with mock data only (no network, analytics off).
- Toolbar: locale, theme (light / dark, when the app has a dark theme), viewports 320 / 375 / 768 / 1440. The a11y panel runs axe (WCAG 2.2 AA).
- Rule: a new shared component or page section ships with a story in `stories/`.
