// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const $ = <T extends Element = HTMLElement>(selector: string) => host.querySelector(selector) as T | null;
const button = (text: string, scope: ParentNode = host) => [...scope.querySelectorAll("button")].find((b) => b.textContent?.trim().startsWith(text)) as HTMLButtonElement;
const press = (el: Element, detail = 1) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true, detail })); });
const paperLines = () => [...host.querySelectorAll(".iv-paper-lines li span")].map((el) => el.textContent?.split(" ×")[0]);
function type(el: HTMLInputElement | HTMLSelectElement, value: string) {
  act(() => {
    if (el instanceof HTMLSelectElement) {
      const option = [...el.options].find((item) => item.value === value);
      if (option) option.selected = true;
      else {
        // An out-of-range value can only arrive from a tampered DOM: add it so the handler sees it.
        const extra = document.createElement("option");
        extra.value = value;
        el.append(extra);
        extra.selected = true;
      }
    }
    else Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  });
}
const flush = async () => { await act(async () => { await Promise.resolve(); }); };

function mount() {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<Home />));
}
beforeEach(() => { localStorage.clear(); mount(); });
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("draft", () => {
  it("dates a new draft today and shows it on the paper", () => {
    const issued = $<HTMLInputElement>("#issued")!;
    expect(issued.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect($(".iv-paper-top time")!.getAttribute("datetime")).toBe(issued.value);
    type(issued, "2026-01-05");
    expect($(".iv-paper-top")!.textContent).toContain("5 Jan 2026");
    type(issued, "");
    expect($(".iv-paper-top time")).toBeNull();
  });

  it("keeps a saved draft's empty date empty after a reload (only a new draft is dated today)", async () => {
    await flush();
    const saved = JSON.parse(localStorage.getItem("invoice-generator-draft-v2")!);
    act(() => root.unmount());
    host.remove();
    localStorage.setItem("invoice-generator-draft-v2", JSON.stringify({ ...saved, issued: "" }));
    mount();
    await flush();
    expect($<HTMLInputElement>("#issued")!.value).toBe("");
    expect($(".iv-paper-top time")).toBeNull();
    expect(JSON.parse(localStorage.getItem("invoice-generator-draft-v2")!).issued).toBe("");
  });

  it("lets a long invoice number wrap instead of widening the page", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync(`${process.cwd()}/app/globals.css`, "utf8");
    expect(css).toMatch(/\.iv-paper-top span \{[^}]*min-width: 0;[^}]*overflow-wrap: anywhere;/);
    expect(css).not.toMatch(/\.iv-layout \{ grid-template-columns: 1fr; \}/);
  });

  it("edits parties, lines and taxes, and the totals follow", () => {
    type($<HTMLInputElement>("#from")!, "");
    type($<HTMLInputElement>("#to")!, "");
    type($<HTMLInputElement>("#number")!, "");
    expect($(".iv-parties")!.textContent).toContain("Unnamed sender");
    expect($(".iv-parties")!.textContent).toContain("Unnamed client");
    expect($(".iv-paper-top")!.textContent).toContain("Draft");
    const [desc, qty, rate] = [...host.querySelectorAll<HTMLInputElement>(".iv-line")[0].querySelectorAll("input")];
    type(desc, "");
    type(qty, "2");
    type(rate, "1000");
    expect(paperLines()[0]).toBe("Untitled line");
    act(() => { const box = host.querySelector<HTMLInputElement>(".iv-check input")!; box.click(); });
    type($<HTMLSelectElement>("#wht")!, "3");
    type($<HTMLSelectElement>("#wht")!, "4"); // not an allowed rate: ignored
    // 2,000 + 500 = 2,500; VAT 175; WHT 75; due 2,600.
    expect($(".iv-taxes")!.textContent).toContain("Withholding tax 3%");
    expect($(".iv-total")!.textContent).toContain("฿2,600");
  });
});

describe("lines", () => {
  it("adds a line, removes one with Undo, and shows the empty state", () => {
    press(button("Add line"));
    expect(paperLines()).toEqual(["Consulting", "Hosting", "New line"]);
    press($("[aria-label='Remove Hosting']")!);
    expect(paperLines()).toEqual(["Consulting", "New line"]);
    press(button("Undo", $(".as-toast")!));
    expect(paperLines()).toEqual(["Consulting", "Hosting", "New line"]);
    press($("[aria-label='Remove Consulting']")!);
    press($("[aria-label='Remove Hosting']")!);
    press($("[aria-label='Remove New line']")!, 0);
    expect($(".iv-empty")!.textContent).toContain("No line items");
    expect($(".iv-paper-empty")).not.toBeNull();
  });

  it("the toast closes on its own and on Escape", () => {
    vi.useFakeTimers();
    press($("[aria-label='Remove Hosting']")!);
    act(() => { vi.runOnlyPendingTimers(); });
    expect($(".as-toast")).toBeNull();
    press($("[aria-label='Remove Consulting']")!);
    const toast = $(".as-toast")!;
    act(() => { toast.dispatchEvent(new FocusEvent("focusin", { bubbles: true })); });
    act(() => { toast.dispatchEvent(new FocusEvent("focusout", { bubbles: true })); });
    act(() => { toast.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect($(".as-toast")).toBeNull();
  });
});

describe("copy and print", () => {
  it("copies the text, reports a blocked clipboard, and prints", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    press(button("Copy invoice text"));
    await flush();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("INVOICE / THB / INV-001"));
    expect(button("Copied text")).toBeTruthy();
    writeText.mockRejectedValueOnce(new Error("blocked"));
    press(button("Copied text"));
    await flush();
    expect($("[role='status']")!.textContent).toContain("blocked");
    const print = vi.fn();
    Object.defineProperty(window, "print", { value: print, configurable: true });
    press(button("Print or save PDF"));
    expect(print).toHaveBeenCalled();
  });
});

describe("batch Undo", () => {
  // detail 0 = keyboard (Enter/Space) click, 1 = pointer click.
  const lineIds = () => [...host.querySelectorAll<HTMLElement>(".iv-line[data-item]")].map((row) => row.dataset.item);
  const removeButton = (i: number) => host.querySelectorAll<HTMLElement>(".iv-line[data-item]")[i].querySelector<HTMLButtonElement>(".as-danger")!;
  const undoButton = () => $<HTMLButtonElement>(".as-toast button")!;
  const escape = () => act(() => { $(".as-toast")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });

  it("consecutive removes restore together with one Undo", () => {
    vi.useFakeTimers();
    press(button("Add line"));
    const before = lineIds();
    expect(paperLines()).toEqual(["Consulting", "Hosting", "New line"]);
    press(removeButton(1));
    act(() => { vi.advanceTimersByTime(4000); });
    press(removeButton(0));
    expect(paperLines()).toEqual(["New line"]);
    expect($(".as-toast span")!.textContent).toBe("Removed 2 lines");
    expect(undoButton().getAttribute("aria-label")).toBe("Undo remove of 2 lines");
    // The second removal restarted the 6 s window: 4 s later it is still open.
    act(() => { vi.advanceTimersByTime(4000); });
    press(undoButton());
    expect(lineIds()).toEqual(before);
    expect(paperLines()).toEqual(["Consulting", "Hosting", "New line"]);
    expect($(".as-toast")).toBeNull();
    expect($(".as-sr[role=status]")!.textContent).toBe("Restored 2 lines.");
  });

  it("keyboard remove focuses Undo; Undo focuses the restored line, Escape the next one", () => {
    const before = lineIds();
    press(removeButton(0), 0);
    expect(document.activeElement).toBe(undoButton());
    press(undoButton(), 0);
    expect(lineIds()).toEqual(before);
    expect(document.activeElement).toBe(removeButton(0));
    press(removeButton(0), 0);
    escape();
    expect($(".as-toast")).toBeNull();
    expect(document.activeElement).toBe(removeButton(0));
    // No line left to land on: Add line.
    press(removeButton(0), 0);
    escape();
    expect(document.activeElement).toBe(button("Add line"));
  });
});
