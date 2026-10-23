# Invoice Generator

A browser-only THB invoice draft desk: edit sender, client, invoice number, issue date and line items, and the paper
preview beside the form shows live totals with optional 7% VAT and withholding tax. One draft is autosaved in
`localStorage`. It is not a Thai tax invoice and has no account, sharing or payment.

Live: https://invoice-generator.bookchaowalit.com (deployed by Vercel CLI; it can lag `main`, see `PRODUCT.md`).

## What it does

- Line items with quantity and rate; negative or non-numeric input counts as 0; amounts round half-up to the satang.
- Optional VAT 7% and withholding tax (1/2/3/5% of the pre-VAT subtotal); due = subtotal + VAT − withholding.
- Copy the invoice as plain text, or print / save as PDF (the print view shows only the invoice paper).
- The stored draft is validated on load (bad JSON, missing fields or duplicate line ids are dropped or repaired).

## What it does not do

- No tax-invoice format, no multiple drafts, no account, no sync, no payment action.

## Run

```bash
npm ci
npm run dev
```

## Checks

```bash
npm test           # Vitest: invoice maths, MCP handler + route, site/robots/sitemap, home render, Sentry scrubbing
npm run lint
npm run typecheck
npm run build
```

CI (`.github/workflows/ci.yml`) runs the shared Node workflow (with a line-coverage gate) and the shared security
scan on every push and PR to `main`.

## Configuration

- `NEXT_PUBLIC_SITE_URL` (optional): canonical origin for metadata, `/sitemap.xml`, `/robots.txt` and the MCP app
  info. Defaults to `https://invoice-generator.bookchaowalit.com`; must be an absolute http(s) URL.
- `NEXT_PUBLIC_SENTRY_DSN` (optional): turns on error reporting; unset means Sentry is off.

## Code map

- `lib/invoice.ts`: totals, rounding, VAT/withholding, text export and stored-draft parsing (used by the page).
- `lib/use-stored-state.ts`: state mirrored to `localStorage`, read after mount.
- `lib/mcp.ts` + `app/api/mcp/route.ts`: JSON-RPC endpoint with one `get_app_info` tool (static app descriptor; the
  drafts live only in the visitor's browser, so there is nothing else to serve).
- `lib/site.ts`: canonical URL, robots and sitemap.
- `lib/sentry.ts` + `instrumentation*.ts`: error reporting to Sentry, errors only, personal data stripped.
- `lib/related-projects.ts` + `app/more-projects/page.tsx`: portfolio link page (copied per repository, not a package).
