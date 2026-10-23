# Invoice Generator — Product truth

> Inferred from the code and copy (no user interview). Checked against the portfolio card claims review
> (`portfolio-site-web/docs/audits/CARD-CLAIMS-REVIEW-2026-10.md`, row `invoice-generator`: "Card already matches
> lib/invoice.ts and app/page.tsx") on 2026-10-23.

## What it is

A client-only THB invoice draft desk with one autosaved draft and a live paper preview.

## Who it is for

A freelancer or small service business that wants to check invoice arithmetic (VAT, withholding) and print a clean
draft, and a portfolio visitor looking at a careful small tool.

## What works today

1. Edit sender, client, invoice number, issue date and any number of line items (at least one stays).
2. Totals round half-up to the satang; negative or non-numeric quantities and rates count as 0.
3. Optional VAT 7% and withholding tax at 1, 2, 3 or 5% of the pre-VAT subtotal; due = subtotal + VAT − withholding.
4. Copy the invoice as plain text (with feedback if the browser blocks the clipboard) or print / save as PDF.
5. One draft autosaves to `localStorage`; on load it is validated and older drafts are upgraded.
6. `/api/mcp` answers JSON-RPC (`initialize`, `ping`, `tools/list`, `tools/call`) with one honest `get_app_info` tool;
   unknown tools and methods return JSON-RPC errors.
7. Front-end and server errors go to Sentry (errors only, personal data stripped) when `NEXT_PUBLIC_SENTRY_DSN` is set.

## What does not work (and must not be claimed)

- Not a Thai tax invoice (no tax ID, branch or receipt fields); VAT and withholding are arithmetic aids.
- One draft only; no invoice history, numbering sequence, due dates or payment terms.
- No account, sharing, sync, e-mail or payment action. Nothing leaves the browser.

## Live URL and deploy state

- Live: https://invoice-generator.bookchaowalit.com (HTTP 200 on 2026-10-23).
- The Vercel project `bookchaowalit-invoice-generator-frontend` is deployed by CLI only. Its Git link names the old
  repository (`bookchaowalit/bookchaowalit-invoice-generator-frontend`), so a push to `main` does not deploy. The last
  production deploy is the CVE patch (2026-10-23 12:06, CLI, commit 62ddaa6); later commits (tests, Sentry, the
  stamp layout fix) stay undeployed until the owner reconnects Vercel Git to this repository (owner action D9).
- `NEXT_PUBLIC_SENTRY_DSN` is set on the Vercel project (Sentry project `commerce-invoice-generator-web`, org
  `personal-yu0`); it takes effect on the next deploy.

## Boundaries

- Browser-only apart from the stateless `/api/mcp` route. No server storage, no personal data collected.
