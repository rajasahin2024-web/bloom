import { describe, expect, it } from "vitest";
import { fireEvent, render } from "@testing-library/react";

import { BandTableSection } from "./BandTableSection";
import { FaqSection } from "./FaqSection";
import { CourseGridSection } from "./CourseGridSection";
import { UniFilterSection } from "./UniFilterSection";
import { DataTableSection } from "./DataTableSection";
import { MomentsSection } from "./MomentsSection";
import { MapBlockSection } from "./MapBlockSection";
import { JobListSection } from "./JobListSection";
import { JobFormSection } from "./JobFormSection";
import { BlogGridSection, BLOG_FILTER_EVENT } from "./BlogGridSection";
import { BlogFilterSection } from "./BlogFilterSection";
import { AuthPageSection } from "./AuthPageSection";

const base = { eyebrow: "Eyebrow", heading: "Heading", lead: "Lead" };

describe("BandTableSection", () => {
  it("renders bandscale rows with score badges", () => {
    const { container } = render(
      <BandTableSection
        props={{
          ...base,
          rows: [
            { score: "9", bg: "#1f5230", color: "#fff", title: "Expert user", body: "Full command", usage: "Rarely required" },
            { score: "7", bg: "#458a4d", color: "#fff", title: "Good user", body: "Operational", usage: "Russell Group" },
          ],
          footnotes: [{ label: "Validity", text: "two years" }],
        }}
      />,
    );
    expect(container.querySelectorAll(".bandscale .brow")).toHaveLength(2);
    expect(container.querySelector(".brow .n")?.textContent).toBe("9");
    expect(container.querySelector(".brow .u")?.textContent).toBe("Rarely required");
  });
});

describe("FaqSection", () => {
  it("renders details/summary items, open flag honoured", () => {
    const { container } = render(
      <FaqSection
        props={{
          ...base,
          items: [
            { question: "Q1?", answer: "A1", open: true },
            { question: "Q2?", answer: "A2", open: false },
          ],
        }}
      />,
    );
    const items = container.querySelectorAll(".faq details.q");
    expect(items).toHaveLength(2);
    expect(items[0].hasAttribute("open")).toBe(true);
    expect(items[1].hasAttribute("open")).toBe(false);
    expect(container.querySelector("summary")?.textContent).toBe("Q1?");
  });
});

describe("CourseGridSection", () => {
  it("renders feature cards with tags and price", () => {
    const { container } = render(
      <CourseGridSection
        props={{
          ...base,
          courses: [
            { icon: "book-open", name: "IELTS Academic", blurb: "b", level: "B2+", weeks: "12", tier: "Core", price: "£190" },
          ],
        }}
      />,
    );
    expect(container.querySelectorAll(".grid.g3 .feat")).toHaveLength(1);
    expect(container.textContent).toContain("IELTS Academic");
    expect(container.querySelector(".tag.leaf")?.textContent).toBe("B2+");
    expect(container.querySelector(".tag.amb")?.textContent).toBe("Core");
    expect(container.textContent).toContain("£190");
  });
});

describe("UniFilterSection", () => {
  const unis = [
    { name: "UCL", country: "United Kingdom", flag: "GB", course: "MA", city: "London", tuition: "£28k", intake: "Sep", per_skill: "6.5 each", ielts: "7.0", toefl: "100", rank: "9", note: "n", photo_url: "" },
    { name: "UNSW", country: "Australia", flag: "AU", course: "MEng", city: "Sydney", tuition: "A$44k", intake: "Feb", per_skill: "", ielts: "6.5", toefl: "", rank: "", note: "", photo_url: "" },
  ];

  it("renders filter buttons per country plus All", () => {
    const { container } = render(
      <UniFilterSection props={{ ...base, universities: unis }} />,
    );
    const buttons = container.querySelectorAll(".unifilt button");
    expect(buttons).toHaveLength(3);
    expect(container.querySelectorAll(".unidir .unic")).toHaveLength(2);
  });

  it("filters cards when a country button is clicked", () => {
    const { container } = render(
      <UniFilterSection props={{ ...base, universities: unis }} />,
    );
    const buttons = container.querySelectorAll(".unifilt button");
    fireEvent.click(buttons[2]);
    const cards = container.querySelectorAll(".unidir .unic");
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain("UNSW");
    expect(buttons[2].className).toBe("on");
  });
});

describe("DataTableSection", () => {
  it("renders columns, rows, mono and bold cells", () => {
    const { container } = render(
      <DataTableSection
        props={{
          ...base,
          columns: [{ label: "Regulator" }, { label: "OET" }],
          rows: [
            {
              cells: [
                { text: "GMC", sub: "Doctors", bold: true, mono: false },
                { text: "B each", sub: "", bold: false, mono: true },
              ],
            },
          ],
          footnote: "Requirements change.",
        }}
      />,
    );
    expect(container.querySelectorAll("th")).toHaveLength(2);
    expect(container.querySelector("td b")?.textContent).toBe("GMC");
    expect(container.querySelector("td.mono")?.textContent).toContain("B each");
    expect(container.textContent).toContain("Requirements change.");
  });
});

describe("MomentsSection", () => {
  it("renders mo tiles with cap captions", () => {
    const { container } = render(
      <MomentsSection
        props={{
          ...base,
          items: [{ size: "a", media_url: "", caption: "Results day", sub: "July 2026" }],
          footnote: "Drag photos",
        }}
      />,
    );
    const mo = container.querySelector(".mo.a");
    expect(mo).toBeTruthy();
    expect(mo?.querySelector("cap")?.textContent).toContain("Results day");
    expect(mo?.querySelector("cap small")?.textContent).toBe("July 2026");
  });
});

describe("MapBlockSection", () => {
  it("renders mapwrap with dots and marker label", () => {
    const { container } = render(
      <MapBlockSection
        props={{
          ...base,
          min_height: "340",
          dots: [
            { x: "22%", y: "27%", size: "12px", delay: "0s", color: "var(--amber)" },
            { x: "63%", y: "47%", size: "10px", delay: ".4s", color: "" },
          ],
          marker: { x: "22%", y: "27%", label: "MANCHESTER · HQ" },
        }}
      />,
    );
    expect(container.querySelectorAll(".mapwrap .dot")).toHaveLength(2);
    expect(container.textContent).toContain("MANCHESTER · HQ");
  });
});

describe("JobListSection", () => {
  it("renders job cards with tags", () => {
    const { container } = render(
      <JobListSection
        props={{
          ...base,
          jobs: [
            {
              icon: "briefcase",
              title: "Writing Examiner",
              department: "Assessment",
              office: "Bengaluru",
              contract: "Full-time",
              ctc: "₹9L",
              summary: "Mark Task 2.",
              posted: "2 days ago",
              band: "7+",
              apply_label: "Apply",
              apply_href: "#apply",
            },
          ],
          empty_heading: "",
          empty_body: "",
          empty_cta_label: "",
          empty_cta_href: "",
        }}
      />,
    );
    expect(container.textContent).toContain("Writing Examiner");
    expect(container.querySelector(".tag.leaf")?.textContent).toBe("Assessment");
    expect(container.querySelector("a.btn.btn-p")?.getAttribute("href")).toBe("#apply");
  });

  it("renders empty state when no jobs", () => {
    const { container } = render(
      <JobListSection
        props={{
          ...base,
          jobs: [],
          empty_heading: "No roles open right now",
          empty_body: "Send a speculative application.",
          empty_cta_label: "Apply",
          empty_cta_href: "#apply",
        }}
      />,
    );
    expect(container.textContent).toContain("No roles open right now");
  });
});

describe("JobFormSection", () => {
  const formProps = {
    ...base,
    tips_title: "What helps",
    tips: [{ title: "Name the exam part", body: "Be specific." }],
    aside_note: "Speculative welcome.",
    roles: [{ label: "Writing Examiner" }],
    countries: [{ label: "India" }, { label: "Pakistan" }],
    offices: [{ label: "Bengaluru" }],
    examiner_statuses: [{ label: "Never been an examiner" }],
    submit_label: "Submit application",
    footnote: "We reply either way.",
    whatsapp: "+919008041720",
  };

  it("renders the application form with selects", () => {
    const { container } = render(<JobFormSection props={formProps} />);
    expect(container.querySelectorAll("select")).toHaveLength(4);
    expect(container.textContent).toContain("Speculative — no specific role");
    expect(container.textContent).toContain("Name the exam part");
  });

  it("shows the done panel with a reference after submit", () => {
    const { container } = render(<JobFormSection props={formProps} />);
    fireEvent.submit(container.querySelector("form")!);
    expect(container.textContent).toContain("Application received");
    expect(container.textContent).toMatch(/BL-APP-\d+/);
    expect(container.querySelector("form")).toBeNull();
  });
});

describe("BlogGridSection", () => {
  const posts = [
    { cat: "Strategy", title: "Featured post", excerpt: "e", author: "A", date: "1 Jan", read: "6", featured: true, hero_url: "", href: "/blog/a" },
    { cat: "Strategy", title: "Second post", excerpt: "e", author: "B", date: "2 Jan", read: "4", featured: false, hero_url: "", href: "/blog/b" },
    { cat: "News", title: "News post", excerpt: "e", author: "C", date: "3 Jan", read: "3", featured: false, hero_url: "", href: "/blog/c" },
  ];

  it("renders featured card plus grid of the rest", () => {
    const { container } = render(<BlogGridSection props={{ ...base, posts }} />);
    expect(container.querySelector("a.card")?.textContent).toContain("Featured post");
    expect(container.querySelectorAll(".grid.g3 a.tcard")).toHaveLength(2);
  });

  it("filters on the shared blog-filter event", () => {
    const { container } = render(<BlogGridSection props={{ ...base, posts }} />);
    fireEvent(window, new CustomEvent(BLOG_FILTER_EVENT, { detail: { category: "News" } }));
    expect(container.querySelectorAll("a.tcard")).toHaveLength(1);
    expect(container.textContent).toContain("News post");
    expect(container.textContent).not.toContain("Second post");
  });
});

describe("BlogFilterSection", () => {
  it("renders pills and dispatches the filter event", () => {
    const seen: string[] = [];
    window.addEventListener(BLOG_FILTER_EVENT, (e) =>
      seen.push((e as CustomEvent).detail.category),
    );
    const { container } = render(
      <BlogFilterSection
        props={{
          categories: [
            { name: "Strategy", count: "4" },
            { name: "News", count: "2" },
          ],
        }}
      />,
    );
    const pills = container.querySelectorAll(".pill");
    expect(pills).toHaveLength(3);
    expect(pills[0].textContent).toContain("All");
    fireEvent.click(pills[1]);
    expect(seen).toContain("Strategy");
    expect(pills[1].className).toContain("on");
  });
});

describe("AuthPageSection", () => {
  const authProps = {
    brand_name: "Bloom",
    brand_tagline: "IELTS Academy",
    logo_url: "",
    home_href: "/",
    ...base,
    features: [{ icon: "fire", title: "Streak", body: "Twenty minutes" }],
    quote: "Eleven weeks to 7.5.",
    quote_author: "Priya Sharma",
    roles: [
      { key: "student", name: "Student", icon: "user-graduate", sub: "Study" },
      { key: "teacher", name: "Teacher", icon: "chalkboard-user", sub: "Teach" },
      { key: "admin", name: "Admin", icon: "shield-halved", sub: "Run" },
    ],
    countries: [{ label: "India" }],
    languages: [{ label: "Hindi" }],
    exams: [{ value: "ielts-a", label: "IELTS Academic" }],
    plans: [{ value: "PLUS", label: "Plus — £340 / month" }],
    notice: "Preview only.",
  };

  it("renders the login mode with role buttons", () => {
    const { container } = render(<AuthPageSection props={authProps} />);
    expect(container.querySelector(".auth")).toBeTruthy();
    expect(container.querySelectorAll(".rolebtn")).toHaveLength(3);
    expect(container.textContent).toContain("Sign in");
    expect(container.querySelector(".aside")?.textContent).toContain("Streak");
  });

  it("switches between login, signup and forgot modes", () => {
    const { container, getByText } = render(<AuthPageSection props={authProps} />);
    fireEvent.click(getByText("Take the free placement test"));
    expect(container.textContent).toContain("Create your account");
    fireEvent.click(getByText("Sign in"));
    expect(container.textContent).toContain("Choose how you are signing in");
    fireEvent.click(getByText("Forgot password?"));
    expect(container.textContent).toContain("Reset your password");
  });

  it("shows the notice in the error slot on submit", () => {
    const { container } = render(<AuthPageSection props={authProps} />);
    fireEvent.submit(container.querySelector("form")!);
    expect(container.querySelector(".err")?.textContent).toContain("Preview only.");
  });
});
