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
    press($("[aria-label='Remove Hosting']")!, 0);
    act(() => { vi.runOnlyPendingTimers(); });
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
