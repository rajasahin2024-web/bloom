import { useState } from "react";
import { Head, Section } from "./shared";
import { Icon } from "./Icon";
import type { SectionAnimation } from "./types";

interface TourTab {
  key: string;
  icon?: string;
  title?: string;
  body?: string;
  /** image-slot id / label for the empty-shot placeholder. */
  shot_slot?: string;
  shot_label?: string;
  image_url?: string;
  url?: string;
}

interface ShowcaseProps {
  eyebrow?: string;
  heading?: string;
  body?: string;
  media?: { url?: string; type?: string };
  cta?: { label?: string; href?: string; icon?: string };
  tabs?: TourTab[];
  /** "Also inside" info note under the tab buttons. */
  note?: string;
  demo_note?: string;
  pad_top?: number;
  pad_bottom?: number;
}

const DEFAULT_TABS: TourTab[] = [
  {
    key: "dash",
    icon: "house",
    title: "Your dashboard",
    body: "Estimated band, days to your test, today's four study blocks and your streak — the first thing you see.",
    url: "bloomielts.com/portal/dashboard",
  },
  {
    key: "write",
    icon: "pen-nib",
    title: "Writing Lab",
    body: "Submit an essay, get a band on all four criteria, every error corrected and a model answer to compare against.",
    url: "bloomielts.com/portal/writing-lab",
  },
  {
    key: "speak",
    icon: "microphone",
    title: "Speaking Lab",
    body: "Real cue cards, a one-minute prep timer, recording, then fluency, vocabulary, grammar and pronunciation scored separately.",
    url: "bloomielts.com/portal/speaking-lab",
  },
  {
    key: "school",
    icon: "graduation-cap",
    title: "The School",
    body: "Class notes, PDFs, audio drills and video lectures, filed under the exact part of the exam they belong to.",
    url: "bloomielts.com/portal/school",
  },
  {
    key: "plan",
    icon: "calendar-days",
    title: "Your study plan",
    body: "Every day to your test date, weighted to your weakest skill, with a mock every Saturday. Tick blocks off as you go.",
    url: "bloomielts.com/portal/study-plan",
  },
];

const DEFAULT_NOTE =
  "Also inside: vocabulary with spaced repetition, twelve grammar lessons, ten mock papers, Bloom Tutor, 1-on-1 booking, progress analytics and your receipts.";

export function ShowcaseSection({
  props,
}: {
  props: ShowcaseProps;
  animation?: SectionAnimation | null;
}) {
  const { heading, body, media, cta, pad_top, pad_bottom } = props;
  const eyebrow = props.eyebrow ?? "Inside the student portal";
  const note = props.note ?? DEFAULT_NOTE;
  const demoNote = props.demo_note ?? "Demo account: student@bloomielts.com · bloom2026";
  const tabs = props.tabs?.length ? props.tabs : DEFAULT_TABS;
  const [active, setActive] = useState(tabs[0]?.key ?? "dash");
  const tour = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <Section id="tour" padTop={pad_top} padBottom={pad_bottom}>
      <Head eyebrow={eyebrow} heading={heading} lead={body} />
      <div className="tour">
        <div className="tourpick rv">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`tpick${t.key === active ? " on" : ""}`}
              onClick={() => setActive(t.key)}
            >
              <div className="ic">
                <Icon name={t.icon ?? "check"} />
              </div>
              <div>
                <b>{t.title}</b>
                <span>{t.body}</span>
              </div>
            </button>
          ))}
          {note && (
            <div
              style={{
                marginTop: 9,
                padding: "14px 17px",
                background: "var(--leaf-50)",
                borderRadius: 13,
                fontSize: "12.5px",
                color: "var(--ink-2)",
                lineHeight: 1.6,
              }}
            >
              <span style={{ color: "var(--leaf-600)", marginRight: 7, display: "inline-flex", verticalAlign: "-2px" }}>
                <Icon name="circle-info" size={12} />
              </span>
              {note}
            </div>
          )}
        </div>
        <div className="rv">
          <div className="shot">
            <div className="chrome">
              <i style={{ background: "#ef6a5a" }} />
              <i style={{ background: "#f0a13a" }} />
              <i style={{ background: "#5da35f" }} />
              <span className="url">{tour?.url}</span>
            </div>
            <div className="body">
              {tabs.map((t) => (
                <div
                  key={t.key}
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: t.key === active ? "block" : "none",
                  }}
                >
                  {(t.image_url || (media?.type !== "video" && media?.url)) ? (
                    <img
                      src={t.image_url || media?.url}
                      alt={t.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        position: "absolute",
                        inset: 10,
                        border: "1.5px dashed var(--line-2, #d8ddd8)",
                        borderRadius: 10,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 12,
                        color: "var(--ink-4)",
                      }}
                    >
                      {t.shot_label ?? `Drop a ${t.title} screenshot`}
                    </div>
                  )}
                </div>
              ))}
              {media?.type === "video" && media.url ? (
                <video
                  src={media.url}
                  controls
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : null}
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 18 }}>
            <a className="btn btn-p" href={cta?.href ?? "/login"}>
              <Icon name={cta?.icon ?? "arrow-right-to-bracket"} />{" "}
              {cta?.label ?? "Open the live portal"}
            </a>
            {demoNote && (
              <div style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 10 }}>{demoNote}</div>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}
