import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("home page", () => {
  it("renders the sample draft, its total and the local-only limits notice", () => {
    const html = renderToString(<Home />);
    expect(html).toContain("Make the paper add up.");
    expect(html).toContain("Consulting");
    expect(html).toContain("Hosting");
    // 5 × 1,500 + 1 × 500 with no VAT or withholding tax.
    expect(html).toContain("฿8,000");
    expect(html).toContain("they do not make this a Thai tax invoice");
    expect(html).toContain("state is not shared");
  });
});
