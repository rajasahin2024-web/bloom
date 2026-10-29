import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { Head, Inline } from "./shared";

describe("Inline", () => {
  it("passes plain text through unchanged", () => {
    const { container } = render(<h2><Inline text="Go deeper." /></h2>);
    expect(container.querySelector("h2")!.textContent).toBe("Go deeper.");
    expect(container.querySelectorAll("em")).toHaveLength(0);
  });

  it("maps <em> to a real em element", () => {
    const { container } = render(
      <h2><Inline text="Go <em>deeper</em>." /></h2>,
    );
    const em = container.querySelector("em");
    expect(em).not.toBeNull();
    expect(em!.textContent).toBe("deeper");
    expect(container.querySelector("h2")!.textContent).toBe("Go deeper.");
  });

  it("maps <strong> and <br>, and supports nesting", () => {
    const { container } = render(
      <h2><Inline text="One<strong>two <em>three</em></strong>four<br>five" /></h2>,
    );
    const h2 = container.querySelector("h2")!;
    expect(h2.querySelector("strong")!.textContent).toBe("two three");
    expect(h2.querySelector("strong em")!.textContent).toBe("three");
    expect(h2.querySelectorAll("br")).toHaveLength(1);
    expect(h2.textContent).toBe("Onetwo threefourfive");
  });

  it("renders unknown tags as literal text", () => {
    const { container } = render(
      <h2><Inline text={'a <script>alert("x")</script> b'} /></h2>,
    );
    expect(container.querySelector("h2")!.textContent).toBe(
      'a <script>alert("x")</script> b',
    );
    expect(container.querySelectorAll("script")).toHaveLength(0);
  });

  it("renders an unclosed whitelisted tag as literal text", () => {
    const { container } = render(<h2><Inline text="a <em>b c" /></h2>);
    expect(container.querySelector("h2")!.textContent).toBe("a <em>b c");
    expect(container.querySelectorAll("em")).toHaveLength(0);
  });

  it("renders an unmatched close tag as literal text", () => {
    const { container } = render(<h2><Inline text="a </em> b" /></h2>);
    expect(container.querySelector("h2")!.textContent).toBe("a </em> b");
    expect(container.querySelectorAll("em")).toHaveLength(0);
  });

  it("keeps a completed inner tag when the outer tag is unclosed", () => {
    const { container } = render(
      <h2><Inline text="a <em>b <strong>c</strong> d" /></h2>,
    );
    const h2 = container.querySelector("h2")!;
    expect(h2.querySelector("strong")!.textContent).toBe("c");
    expect(h2.textContent).toBe("a <em>b c d");
    expect(h2.querySelectorAll("em")).toHaveLength(0);
  });

  it("treats self-closed container tags as literal text", () => {
    const { container } = render(<h2><Inline text="a <em/>b" /></h2>);
    expect(container.querySelector("h2")!.textContent).toBe("a <em/>b");
    expect(container.querySelectorAll("em")).toHaveLength(0);
  });

  it("renders the fallback for null-ish input", () => {
    const { container } = render(
      <h2><Inline text={undefined} fallback="Sign in" /></h2>,
    );
    expect(container.querySelector("h2")!.textContent).toBe("Sign in");
    expect(render(<Inline text="" />).container.textContent).toBe("");
  });
});

describe("Head", () => {
  it("renders <em> markup inside the heading", () => {
    const { container } = render(
      <Head eyebrow="Explore" heading="Go <em>deeper</em>." lead="Plain lead" />,
    );
    const em = container.querySelector("h2 em");
    expect(em).not.toBeNull();
    expect(em!.textContent).toBe("deeper");
  });
});
