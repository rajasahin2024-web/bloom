import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

import { apiFetch } from "@/lib/api";

import { BandTableSection } from "./BandTableSection";
import { FaqSection } from "./FaqSection";
import { CourseGridSection } from "./CourseGridSection";
import { UniFilterSection } from "./UniFilterSection";
import { DataTableSection } from "./DataTableSection";
import { MomentsSection } from "./MomentsSection";
import { MapBlockSection } from "./MapBlockSection";
import { JobListSection } from "./JobListSection";
import { JobFormSection } from "./JobFormSection";
import {
  BlogGridSection,
  BLOG_FILTER_EVENT,
  BLOG_POSTS_EVENT,
} from "./BlogGridSection";
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
            { q: "Q1?", a: "A1", open: true },
            { q: "Q2?", a: "A2", open: false },
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
  it("renders priced plan cards with feature lists and CTAs", () => {
    const { container } = render(
      <CourseGridSection
        props={{
          ...base,
          courses: [
            {
              icon: "seedling",
              icon_tone: "sky",
              name: "Core",
              price: "£190",
              period: "month",
              blurb: "Self-study",
              features: [
                { text: "Group classes", included: true },
                { text: "1-on-1 tutoring", included: false },
              ],
              cta_label: "Choose Core",
              cta_href: "/login?plan=CORE",
              highlighted: false,
              ribbon: "",
            },
            {
              icon: "star",
              icon_tone: "leaf",
              name: "Plus",
              price: "£340",
              period: "month",
              blurb: "Full method",
              features: [{ text: "Everything in Core", included: true }],
              cta_label: "Choose Plus",
              cta_href: "/login?plan=PLUS",
              highlighted: true,
              ribbon: "Most popular",
            },
          ],
          footnote: "Deposit of 25%",
        }}
      />,
    );
    const plans = container.querySelectorAll(".plans .plan");
    expect(plans).toHaveLength(2);
    expect(container.querySelector(".plan.pop .rib")?.textContent).toBe("Most popular");
    expect(plans[0].querySelector(".pr b")?.textContent).toBe("£190");
    expect(plans[0].querySelector("li.no")?.textContent).toContain("1-on-1 tutoring");
    expect(plans[0].querySelector("a.btn-ghost")?.textContent).toContain("Choose Core");
    expect(plans[1].querySelector("a.btn-p")?.textContent).toContain("Choose Plus");
    expect(container.textContent).toContain("Deposit of 25%");
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
          map: {
            dots: [
              { left: "22%", top: "27%", size: 12, delay: 0, color: "amber" },
              { left: "63%", top: "47%", size: 10, delay: 0.4, color: "" },
            ],
            label: { text: "MANCHESTER · HQ", left: "22%", top: "27%" },
          },
          countries: [],
          stats: [],
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
              id: "v1",
              dept_icon: "briefcase",
              title: "Writing Examiner",
              dept: "Assessment",
              office: "Bengaluru",
              office_flag: "🇮🇳",
              contract: "Full-time",
              ctc: "₹9L",
              need: "Mark Task 2.",
              posted: "2 days ago",
              band: "7+",
            },
          ],
          empty: { heading: "", body: "", cta_label: "", cta_href: "" },
        }}
      />,
    );
    expect(container.textContent).toContain("Writing Examiner");
    expect(container.querySelector(".tag.leaf")?.textContent).toBe("Assessment");
    expect(container.querySelector("button.btn.btn-p")?.textContent).toContain("Apply");
  });

  it("renders empty state when no jobs", () => {
    const { container } = render(
      <JobListSection
        props={{
          ...base,
          jobs: [],
          empty: {
            heading: "No roles open right now",
            body: "Send a speculative application.",
            cta_label: "Apply",
            cta_href: "#apply",
          },
        }}
      />,
    );
    expect(container.textContent).toContain("No roles open right now");
    expect(container.querySelector("a.btn.btn-p")?.getAttribute("href")).toBe("#apply");
  });
});

describe("JobFormSection", () => {
  const formProps = {
    ...base,
    tips_heading: "What helps",
    tips: [{ title: "Name the exam part", body: "Be specific." }],
    note: "Speculative welcome.",
    roles: [
      { id: "v1", title: "Writing Examiner" },
      { id: "spec", title: "Speculative — no specific role" },
    ],
    countries: ["India", "Pakistan"],
    offices: [{ id: "blr", label: "Bengaluru" }],
    examiner_options: ["Never been an examiner"],
    submit_label: "Submit application",
    footnote: "We reply either way.",
    success: {
      title: "Application received",
      body: "Your application is in our hiring pipeline at the Applied stage. We will be in touch within two working days.",
      cta_label: "Message HR directly",
    },
    whatsapp: "+919008041720",
  };

  it("renders the application form with selects", () => {
    const { container } = render(<JobFormSection props={formProps} />);
    expect(container.querySelectorAll("select")).toHaveLength(4);
    expect(container.textContent).toContain("Speculative — no specific role");
    expect(container.textContent).toContain("Name the exam part");
  });

  it("POSTs the application and shows the done panel with the stored ref", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      status: 201,
      data: { application: { ref: "BL-APP-10042" }, alert: "sent" },
    });
    const { container } = render(<JobFormSection props={formProps} />);
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() =>
      expect(container.textContent).toContain("Application received"),
    );
    expect(container.textContent).toContain("BL-APP-10042");
    expect(container.querySelector("form")).toBeNull();
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/applications",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({ source: "careers page" }),
      }),
    );
  });

  it("still confirms when intake fails — the prototype's can't-fail UX", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("API down"));
    const { container } = render(<JobFormSection props={formProps} />);
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() =>
      expect(container.textContent).toContain("Application received"),
    );
    expect(container.textContent).toMatch(/BL-APP-\d+/);
    expect(container.querySelector("form")).toBeNull();
  });
});

describe("BlogGridSection", () => {
  const posts = [
    { slug: "a", title: "Featured post", excerpt: "e", category: "Strategy", author: "A", date: "2026-08-28", read_minutes: 6, featured: true, hero_url: "" },
    { slug: "b", title: "Second post", excerpt: "e", category: "Strategy", author: "B", date: "2026-08-21", read_minutes: 4, featured: false, hero_url: "" },
    { slug: "c", title: "News post", excerpt: "e", category: "News", author: "C", date: "2026-08-14", read_minutes: 3, featured: false, hero_url: "" },
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

  it("broadcasts the post list for filter-pill counts", () => {
    let seen: number | null = null;
    const onPosts = (e: Event) => {
      seen = ((e as CustomEvent).detail.posts ?? []).length;
    };
    window.addEventListener(BLOG_POSTS_EVENT, onPosts);
    render(<BlogGridSection props={{ ...base, posts }} />);
    expect(seen).toBe(3);
    window.removeEventListener(BLOG_POSTS_EVENT, onPosts);
  });
});

describe("BlogFilterSection", () => {
  it("renders pills with live counts and dispatches the filter event", () => {
    const seen: string[] = [];
    window.addEventListener(BLOG_FILTER_EVENT, (e) =>
      seen.push((e as CustomEvent).detail.category),
    );
    const { container } = render(
      <BlogFilterSection
        props={{
          eyebrow: "Blog & guides",
          heading: "Written by markers.",
          categories: ["Strategy", "News"],
        }}
      />,
    );
    fireEvent(
      window,
      new CustomEvent(BLOG_POSTS_EVENT, {
        detail: {
          posts: [{ category: "Strategy" }, { category: "Strategy" }, { category: "News" }],
        },
      }),
    );
    const pills = container.querySelectorAll(".pill");
    expect(pills).toHaveLength(3);
    expect(pills[0].textContent).toContain("All");
    expect(pills[0].textContent).toContain("3");
    expect(pills[1].textContent).toContain("2");
    fireEvent.click(pills[1]);
    expect(seen).toContain("Strategy");
    expect(pills[1].className).toContain("on");
  });
});

describe("AuthPageSection", () => {
  const authProps = {
    brand: { name: "Bloom", tagline: "IELTS Academy", logo_url: "", href: "/" },
    back_link: { label: "Back to site", href: "/" },
    aside: {
      eyebrow: "Welcome back",
      heading: "Your band, your plan.",
      lead: "Pick up where you left off.",
      features: [{ icon: "fire", title: "Streak", body: "Twenty minutes" }],
      quote: { text: "Eleven weeks to 7.5.", author: "Priya Sharma" },
    },
    roles: [
      { key: "student", name: "Student", icon: "user-graduate", sub: "Study" },
      { key: "teacher", name: "Teacher", icon: "chalkboard-user", sub: "Teach" },
      { key: "admin", name: "Admin", icon: "shield-halved", sub: "Run" },
    ],
    signin: {
      heading: "Sign in",
      lead: "Choose how you are signing in",
      sso: [{ provider: "Google", icon: "google" }],
      demo_note: "Demo access — password bloom2026. student@bloomielts.com",
      footer_text: "New to Bloom?",
      footer_link: { label: "Take the free placement test", mode: "signup" },
    },
    signup: {
      heading: "Create your account",
      lead: "The placement test is free.",
      countries: ["India"],
      languages: ["Hindi"],
      exams: [{ value: "ielts-a", label: "IELTS Academic" }],
      plans: [{ value: "PLUS", label: "Plus — £340 / month" }],
      terms: "I agree to the terms.",
      submit_label: "Create account & start placement test",
      footer_text: "Already have an account?",
      footer_link: { label: "Sign in", mode: "login" },
    },
    forgot: {
      heading: "Reset your password",
      lead: "Enter your email for a reset link.",
      submit_label: "Send reset link",
      success_heading: "Check your inbox",
      success_body: "If an account exists for {email}, a reset link is on its way.",
    },
  };

  it("renders the login mode with role buttons and prefilled demo creds", () => {
    const { container } = render(<AuthPageSection props={authProps} />);
    expect(container.querySelector(".auth")).toBeTruthy();
    expect(container.querySelectorAll(".rolebtn")).toHaveLength(3);
    expect(container.textContent).toContain("Sign in");
    expect(container.querySelector(".aside")?.textContent).toContain("Streak");
    expect(
      (container.querySelector('input[type="email"]') as HTMLInputElement)?.value,
    ).toBe("student@bloomielts.com");
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

  it("rejects a wrong demo password like the prototype", () => {
    const { container } = render(<AuthPageSection props={authProps} />);
    const pw = container.querySelector('input[type="password"]') as HTMLInputElement;
    fireEvent.change(pw, { target: { value: "nope" } });
    fireEvent.submit(container.querySelector("form")!);
    expect(container.querySelector(".err")?.textContent).toContain("bloom2026");
  });

  it("completes the forgot flow with the seeded success copy", () => {
    const { container, getByText } = render(<AuthPageSection props={authProps} />);
    fireEvent.click(getByText("Forgot password?"));
    const input = container.querySelector('input[name="fgEmail"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: "me@x.com" } });
    fireEvent.submit(container.querySelector("form")!);
    expect(container.textContent).toContain("Check your inbox");
    expect(container.textContent).toContain("me@x.com");
  });
});

// ── TEC-136: /ielts + /platform seed shapes ─────────────────────────

import { FeatureGridSection } from "./FeatureGridSection";
import { ShowcaseSection } from "./ShowcaseSection";
import { StepsSection } from "./StepsSection";
import { RichBlockSection } from "./RichBlockSection";
import { ContactSection } from "./ContactSection";

describe("BandTableSection (new seed shape)", () => {
  it("renders band/description/used_for rows and plain-string notes", () => {
    const { container } = render(
      <BandTableSection
        props={{
          ...base,
          rows: [
            { band: "9", title: "Expert user", description: "Full command", used_for: "Rarely", color: "#1f5230", text_color: "#fff" },
          ],
          notes: ["Validity: two years", "Retakes: unlimited"],
        }}
      />,
    );
    expect(container.querySelector(".brow .n")?.textContent).toBe("9");
    expect(container.querySelector(".brow .u")?.textContent).toBe("Rarely");
    expect(container.textContent).toContain("Validity:");
    expect(container.textContent).toContain("two years");
  });
});

describe("DataTableSection (new seed shape)", () => {
  it("renders string columns and row arrays of cells", () => {
    const { container } = render(
      <DataTableSection
        props={{
          eyebrow: "IELTS explained",
          heading: "Know the test",
          intro: "Lead copy",
          columns: ["Section", "Time"],
          rows: [
            [{ text: "Listening", sub: "Four recordings", bold: true }, { text: "30 min", sub: "+10 transfer", mono: true }],
          ],
          footnote: "Footnote text",
        }}
      />,
    );
    expect(container.querySelectorAll("th")).toHaveLength(2);
    expect(container.querySelector("td b")?.textContent).toBe("Listening");
    expect(container.querySelector("td.mono")?.textContent).toContain("30 min");
    expect(container.textContent).toContain("Lead copy");
    expect(container.textContent).toContain("Footnote text");
  });
});

describe("FeatureGridSection (skillcard mode)", () => {
  it("renders .skillcard gradient header, rows and tip", () => {
    const { container } = render(
      <FeatureGridSection
        props={{
          eyebrow: "Skill by skill",
          heading: "Question types",
          features: [
            {
              icon: "headphones",
              title: "Listening",
              sub: "Same paper",
              body: "b",
              color: "linear-gradient(135deg,#1f6e9e,#3899d4)",
              rows: [{ label: "Part 1", value: "Everyday conversation" }],
              tip: "Predict the word type",
            },
          ],
        }}
      />,
    );
    const card = container.querySelector(".skillcard");
    expect(card).toBeTruthy();
    expect(card?.querySelector(".hd span")?.textContent).toBe("Same paper");
    expect(card?.querySelector(".row b")?.textContent).toBe("Everyday conversation");
    expect(card?.querySelector(".tips")?.textContent).toContain("Predict the word type");
    expect(container.querySelector(".sec.dark")).toBeNull();
  });
});

describe("StepsSection", () => {
  it("renders the lead paragraph and paper variant", () => {
    const { container } = render(
      <StepsSection
        props={{
          eyebrow: "How we do it",
          heading: "Five stages",
          lead: "Nothing is guessed.",
          steps: [{ n: 1, title: "Placement", body: "b" }],
        }}
      />,
    );
    expect(container.querySelector(".sec.paper")).toBeTruthy();
    expect(container.querySelector(".lead")?.textContent).toBe("Nothing is guessed.");
    expect(container.querySelectorAll(".step")).toHaveLength(1);
  });
});

describe("RichBlockSection (split side card)", () => {
  it("renders checklist left and data_table side right", () => {
    const { container } = render(
      <RichBlockSection
        props={{
          eyebrow: "Academic or General Training?",
          heading: "Choosing",
          body: "lead",
          cards: [{ icon: "check", title: "Take Academic", body: "b", href: "" }],
          side: {
            kind: "data_table",
            eyebrow: "Score conversions",
            columns: ["IELTS", "CEFR"],
            rows: [["8.5–9.0", "C2"]],
            footnote: "Approximate",
          },
        }}
      />,
    );
    expect(container.querySelector(".split")).toBeTruthy();
    expect(container.querySelectorAll(".checklist li")).toHaveLength(1);
    expect(container.querySelectorAll("table.tbl tbody tr")).toHaveLength(1);
  });

  it("renders the feedback correction card with band bars", () => {
    const { container } = render(
      <RichBlockSection
        props={{
          eyebrow: "The difference",
          heading: "Feedback",
          body: "lead",
          cards: [{ icon: "check", title: "t", body: "b", href: "" }],
          side: {
            kind: "feedback",
            tags: [{ text: "Task 2", tone: "amb" }, { text: "4 issues found", tone: "cor" }],
            wrong: "People is",
            right: "People are",
            why: "plural verb",
            bands: [{ label: "Task Response", score: "7.0", pct: 78, tone: "leaf" }],
          },
        }}
      />,
    );
    expect(container.querySelector(".tag.amb")?.textContent).toBe("Task 2");
    expect(container.querySelector(".tag.cor")?.textContent).toBe("4 issues found");
    expect(container.textContent).toContain("People are");
    expect(container.querySelector(".prow .lb b")?.textContent).toBe("7.0");
  });
});

describe("ShowcaseSection (tour tabs)", () => {
  it("renders seeded tabs and switches the chrome url on click", () => {
    const { container, getByText } = render(
      <ShowcaseSection
        props={{
          eyebrow: "Inside the student portal",
          heading: "This is what you log into",
          body: "b",
          tabs: [
            { key: "dash", icon: "house", title: "Your dashboard", body: "d", url: "bloomielts.com/portal/dashboard" },
            { key: "plan", icon: "calendar-days", title: "Your study plan", body: "p", url: "bloomielts.com/portal/study-plan" },
          ],
          note: "Also inside",
          demo_note: "Demo account",
          cta: { label: "Open the live portal", href: "/login" },
        }}
      />,
    );
    expect(container.querySelectorAll(".tpick")).toHaveLength(2);
    expect(container.querySelector(".url")?.textContent).toBe("bloomielts.com/portal/dashboard");
    fireEvent.click(getByText("Your study plan"));
    expect(container.querySelector(".url")?.textContent).toBe("bloomielts.com/portal/study-plan");
    expect(container.textContent).toContain("Demo account");
  });
});

describe("ContactSection (CTA band)", () => {
  it("renders primary and secondary buttons", () => {
    const { container } = render(
      <ContactSection
        props={{
          eyebrow: "",
          heading: "Find out what band",
          body: "b",
          phone: "",
          email: "hello@bloomielts.com",
          address: "",
          map_url: "",
          form_enabled: false,
          primary_btn: { label: "Take the free placement test", href: "/login?mode=signup", icon: "seedling" },
          secondary_btn: { label: "Sign in to my account", href: "/login" },
        }}
      />,
    );
    const white = container.querySelector("a.btn-white");
    const line = container.querySelector("a.btn-line");
    expect(white?.textContent).toContain("Take the free placement test");
    expect(line?.textContent).toContain("Sign in to my account");
    expect(white?.getAttribute("href")).toBe("/login?mode=signup");
  });
});
