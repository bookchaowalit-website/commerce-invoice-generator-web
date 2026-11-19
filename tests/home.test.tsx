import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("home page on the App shell", () => {
  it("renders the sample draft, the total up top and in the preview, the limits notice and the hub link", () => {
    const html = renderToString(<Home />);
    expect(html).toContain("Make the paper add up.");
    expect(html).toContain("Consulting");
    expect(html).toContain("Hosting");
    // 5 × 1,500 + 1 × 500 with no VAT or withholding tax, in the summary and on the paper.
    expect(html.match(/฿8,000/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('href="#invoice"');
    expect(html).toContain("they do not make this a Thai tax invoice");
    expect(html).toContain('href="https://bookchaowalit.com/"');
    expect(html).not.toMatch(/on the left|on the right/);
  });
});
