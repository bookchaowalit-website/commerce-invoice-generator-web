"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AppFoot, AppTop, PlusIcon } from "@/components/app-shell";
import { formatTHB, invoiceText as renderInvoiceText, invoiceTotals, isWhtRate, lineTotal, parseDraft, toAmount, VAT_RATE, WHT_RATES, type Draft, type Line } from "@/lib/invoice";
import { useStoredState } from "@/lib/use-stored-state";

const INITIAL_DRAFT: Draft = {
  number: "INV-001",
  issued: "",
  from: "Bookchaowalit",
  to: "Client Co.",
  lines: [
    { id: "1", desc: "Consulting", qty: 5, price: 1500 },
    { id: "2", desc: "Hosting", qty: 1, price: 500 },
  ],
  vat: false,
  wht: 0,
};

/** Today on the visitor's own calendar, as YYYY-MM-DD (the value a date input takes). */
function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "2026-11-19" → "19 Nov 2026"; anything else is shown as typed. */
function formatIssued(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? iso : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function Home() {
  const [draft, setDraft, ready] = useStoredState("invoice-generator-draft-v2", INITIAL_DRAFT, parseDraft);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [announcement, setAnnouncement] = useState("");
  const [removed, setRemoved] = useState<{ line: Line; index: number } | null>(null);
  const [toastFocused, setToastFocused] = useState(false);
  const undoRef = useRef<HTMLButtonElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const totals = useMemo(() => invoiceTotals(draft), [draft]);
  const invoiceText = useMemo(() => renderInvoiceText(draft), [draft]);

  // A draft without a date starts dated today, once, after the stored draft has loaded (a saved date is
  // kept, and clearing the field later is respected).
  const dated = useRef(false);
  useEffect(() => {
    if (!ready || dated.current) return;
    dated.current = true;
    setDraft((current) => (current.issued ? current : { ...current, issued: todayIso() }));
  }, [ready, setDraft]);
  useEffect(() => {
    if (!removed || toastFocused) return;
    const timer = window.setTimeout(() => setRemoved(null), 6000);
    return () => window.clearTimeout(timer);
  }, [removed, toastFocused]);
  const toastShown = removed !== null;
  useLayoutEffect(() => {
    const toast = toastRef.current;
    if (!toastShown || !toast) return;
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--as-toast-space", `${toast.offsetHeight + 32}px`);
    return () => { rootStyle.removeProperty("--as-toast-space"); };
  }, [toastShown]);

  const set = (update: Partial<Draft>) => setDraft((current) => ({ ...current, ...update }));
  const updateLine = (id: string, update: Partial<Line>) => {
    setDraft((current) => ({ ...current, lines: current.lines.map((line) => (line.id === id ? { ...line, ...update } : line)) }));
  };
  const addLine = () => {
    setDraft((current) => ({ ...current, lines: [...current.lines, { id: createId(), desc: "New line", qty: 1, price: 0 }] }));
    setAnnouncement("Added a line.");
  };
  function removeLine(line: Line, viaKeyboard: boolean) {
    const index = draft.lines.findIndex((item) => item.id === line.id);
    setDraft((current) => ({ ...current, lines: current.lines.filter((item) => item.id !== line.id) }));
    setRemoved({ line, index });
    setAnnouncement(`Removed “${line.desc || "Untitled line"}”. Undo is available for a few seconds.`);
    if (viaKeyboard) window.setTimeout(() => undoRef.current?.focus(), 0);
  }
  function undo() {
    if (!removed) return;
    const { line, index } = removed;
    setDraft((current) => ({ ...current, lines: [...current.lines.slice(0, index), line, ...current.lines.slice(index)] }));
    setRemoved(null);
    setToastFocused(false);
    setAnnouncement(`Restored “${line.desc || "Untitled line"}”.`);
  }
  const copyInvoice = async () => {
    const ok = await copyText(invoiceText);
    setCopyState(ok ? "copied" : "failed");
    setAnnouncement(ok ? "Invoice text copied to the clipboard." : "The browser blocked clipboard access.");
    window.setTimeout(() => setCopyState("idle"), 1800);
  };

  return (
    <div className="as">
      <a className="as-skip" href="#main">Skip to content</a>
      <AppTop name="Ledger" tagline="THB invoice draft" />

      <main id="main" className="iv-page">
        <div className="as-head iv-head">
          <div>
            <h1>Make the paper add up.</h1>
            <p>Fill in the parties and line items; the invoice preview updates as you type. Saved in this browser only.</p>
          </div>
          <a className="iv-summary" href="#invoice">
            <span>Total due</span>
            <strong>{formatTHB(totals.due)}</strong>
            <small>View invoice</small>
          </a>
        </div>

        <div className="iv-layout">
          <div className="iv-form">
            <section className="as-composer" aria-labelledby="parties-title">
              <h2 id="parties-title" className="iv-title">Parties and date</h2>
              <div className="iv-grid">
                <label className="as-field" htmlFor="from">From<input id="from" value={draft.from} autoComplete="organization" onChange={(event) => set({ from: event.target.value })} /></label>
                <label className="as-field" htmlFor="to">Bill to<input id="to" value={draft.to} onChange={(event) => set({ to: event.target.value })} /></label>
                <label className="as-field" htmlFor="number">Invoice no.<input id="number" value={draft.number} onChange={(event) => set({ number: event.target.value })} /></label>
                <label className="as-field" htmlFor="issued">Issue date<input id="issued" type="date" value={draft.issued} onChange={(event) => set({ issued: event.target.value })} /></label>
              </div>
            </section>

            <section className="as-composer" aria-labelledby="lines-title">
              <h2 id="lines-title" className="iv-title">Line items</h2>
              {draft.lines.length ? (
                <ul className="iv-lines">
                  {draft.lines.map((line, index) => (
                    <li key={line.id} className="iv-line">
                      <label className="as-field iv-desc">Item {index + 1}<input value={line.desc} onChange={(event) => updateLine(line.id, { desc: event.target.value })} /></label>
                      <label className="as-field">Qty<input type="number" min="0" step="any" inputMode="decimal" value={line.qty} onChange={(event) => updateLine(line.id, { qty: toAmount(event.target.value) })} /></label>
                      <label className="as-field">Rate (THB)<input type="number" min="0" step="any" inputMode="decimal" value={line.price} onChange={(event) => updateLine(line.id, { price: toAmount(event.target.value) })} /></label>
                      <div className="iv-line-foot">
                        <span>{formatTHB(lineTotal(line))}</span>
                        <button type="button" className="as-plain as-danger" aria-label={`Remove ${line.desc || `item ${index + 1}`}`} onClick={(event) => removeLine(line, event.detail === 0)}>Remove</button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="as-empty iv-empty"><strong>No line items</strong>Press Add line to bill for the first piece of work.</div>
              )}
              <div><button className="as-plain" type="button" onClick={addLine}><PlusIcon />Add line</button></div>
            </section>

            <section className="as-composer iv-tax" role="group" aria-labelledby="tax-title">
              <h2 id="tax-title" className="iv-title">Tax</h2>
              <label className="iv-check"><input type="checkbox" checked={draft.vat} onChange={(event) => set({ vat: event.target.checked })} /> Add VAT {VAT_RATE}%</label>
              <label className="as-field" htmlFor="wht">Withholding tax
                <select id="wht" value={draft.wht} onChange={(event) => { const rate = Number(event.target.value); if (isWhtRate(rate)) set({ wht: rate }); }}>
                  {WHT_RATES.map((rate) => <option key={rate} value={rate}>{rate === 0 ? "None" : `${rate}% of subtotal`}</option>)}
                </select>
              </label>
            </section>

            <div className="iv-actions">
              <button className="as-button" type="button" onClick={copyInvoice}>{copyState === "copied" ? "Copied text" : copyState === "failed" ? "Copy blocked" : "Copy invoice text"}</button>
              <button className="as-plain" type="button" onClick={() => window.print()}>Print or save PDF</button>
            </div>
            <p className="as-note">A local preview, not a tax filing system or shared accounting service. VAT and withholding lines are arithmetic aids; they do not make this a Thai tax invoice.</p>
          </div>

          <aside id="invoice" className="iv-paper" aria-label="Invoice preview" tabIndex={-1}>
            <div className="iv-paper-top">
              <strong>Invoice</strong>
              <span>{draft.number || "Draft"}{draft.issued ? <> · <time dateTime={draft.issued}>{formatIssued(draft.issued)}</time></> : null}</span>
            </div>
            <dl className="iv-parties">
              <div><dt>From</dt><dd>{draft.from || "Unnamed sender"}</dd></div>
              <div><dt>Bill to</dt><dd>{draft.to || "Unnamed client"}</dd></div>
            </dl>
            <ul className="iv-paper-lines">
              {draft.lines.map((line) => <li key={line.id}><span>{line.desc || "Untitled line"} <small>× {line.qty}</small></span><b>{formatTHB(lineTotal(line))}</b></li>)}
              {draft.lines.length === 0 ? <li className="iv-paper-empty">Add a line to begin.</li> : null}
            </ul>
            {draft.vat || draft.wht > 0 ? (
              <dl className="iv-taxes">
                <div><dt>Subtotal</dt><dd>{formatTHB(totals.subtotal)}</dd></div>
                {draft.vat ? <div><dt>VAT {VAT_RATE}%</dt><dd>{formatTHB(totals.vat)}</dd></div> : null}
                {draft.wht > 0 ? <div><dt>Withholding tax {draft.wht}%</dt><dd>−{formatTHB(totals.wht)}</dd></div> : null}
              </dl>
            ) : null}
            <div className="iv-total"><span>Total due</span><strong>{formatTHB(totals.due)}</strong></div>
            <p className="iv-paper-note">Prepared in the browser · not shared</p>
          </aside>
        </div>
      </main>

      <p className="as-sr" role="status" aria-live="polite">{announcement}</p>
      {removed ? (
        <div
          ref={toastRef}
          className="as-toast"
          role="group"
          aria-label="Undo remove"
          onFocus={() => setToastFocused(true)}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setToastFocused(false); }}
          onKeyDown={(event) => { if (event.key === "Escape") { setRemoved(null); setToastFocused(false); } }}
        >
          <span>Removed “{removed.line.desc || "Untitled line"}”</span>
          <button ref={undoRef} type="button" className="as-plain" onClick={undo}>Undo</button>
        </div>
      ) : null}

      <AppFoot source="https://github.com/bookchaowalit-website/commerce-invoice-generator-web" />
    </div>
  );
}
