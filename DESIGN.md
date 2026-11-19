# Invoice Generator — Ledger

Since 2026-11-19 the desk uses the shared **App shell** (`app/app-shell.css`, `components/app-shell.tsx`,
see `APP-SHELL.md`): Geist via next/font, the `--as-*` light/dark tokens, the shell top bar, buttons, fields,
Undo toast and footer (with the link back to bookchaowalit.com). Ledger-only pieces (`.iv-*`) live in
`app/globals.css` and use the shell tokens only.

- Head: title, one sentence that holds at every width, and a Total due card that links to the preview
  (`#invoice`), so the total shows in the first screen on phones and desktops.
- Form cards: parties and date (a new draft is dated today), line items (each with its total and a 44px
  Remove, undoable for 6 seconds), tax (VAT, withholding tax), then Copy invoice text and Print.
- Preview: sticky beside the form from 900px, under it on narrower screens; the date shows as "19 Nov 2026".
- Print keeps only the invoice.

The arithmetic lives in `lib/invoice.ts`. VAT and withholding lines are arithmetic aids, not a Thai tax invoice.
