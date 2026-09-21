/**
 * Admin dashboard — sample landing page for the admin console.
 *
 * Approved Plan v5 scope: one page, all mock/sample data. The only real
 * backend call is /api/auth/me (already done by the AdminPage gate).
 * Prototype .stat/.card design language in the Bloom leaf-green palette.
 */
import type { AdminSession } from "@/lib/auth";
import {
  ArrowRightIcon,
  BanknoteIcon,
  CalendarCheckIcon,
  ChartLineIcon,
  ClockIcon,
  FileIcon,
  GradCapIcon,
  InboxIcon,
  PenIcon,
  PlusIcon,
  TaskListIcon,
  UserPlusIcon,
  WhatsAppIcon,
} from "@/components/icons";

/* ── sample data (no API) ── */

const STATS = [
  {
    label: "Active students",
    value: "284",
    sub: "+12 this month",
    tone: "leaf",
    icon: (s: number) => <GradCapIcon size={s} />,
  },
  {
    label: "Today's classes",
    value: "9",
    sub: "3 live right now",
    tone: "sky",
    icon: (s: number) => <CalendarCheckIcon size={s} />,
  },
  {
    label: "Pending enquiries",
    value: "17",
    sub: "5 new today",
    tone: "amb",
    icon: (s: number) => <InboxIcon size={s} />,
  },
  {
    label: "Revenue (month)",
    value: "₹4.2L",
    sub: "+8% vs last month",
    tone: "leaf",
    icon: (s: number) => <BanknoteIcon size={s} />,
  },
];

const ENROLLMENT = [
  { m: "Apr", v: 32 },
  { m: "May", v: 41 },
  { m: "Jun", v: 38 },
  { m: "Jul", v: 55 },
  { m: "Aug", v: 62 },
  { m: "Sep", v: 71 },
];

const BATCHES = [
  { name: "IELTS Morning A", fill: 92, cap: "23/25", tone: "ok" },
  { name: "IELTS Evening B", fill: 76, cap: "19/25", tone: "ok" },
  { name: "PTE Weekend", fill: 58, cap: "14/24", tone: "amb" },
  { name: "Spoken English 1", fill: 34, cap: "7/20", tone: "cor" },
  { name: "IELTS Sprint Oct", fill: 18, cap: "4/22", tone: "cor" },
];

const ENQUIRIES = [
  { name: "Tanvir Hasan", what: "IELTS Academic · Nov intake", when: "12 min ago", tag: "New" },
  { name: "Priya Nair", what: "Batch transfer request", when: "1 h ago", tag: "Follow-up" },
  { name: "Rafid Karim", what: "PTE course fees", when: "3 h ago", tag: "New" },
  { name: "Suma Akter", what: "Demo class booking", when: "Yesterday", tag: "Called" },
];

const SCHEDULE = [
  { time: "09:00", what: "IELTS Reading — Mock review", who: "Room 3 · Nusrat J." },
  { time: "11:30", what: "Speaking Lab B2", who: "Room 1 · Arif H." },
  { time: "14:00", what: "Writing Task 2 workshop", who: "Room 2 · Maria S." },
  { time: "17:30", what: "PTE Evening batch", who: "Room 3 · Nusrat J." },
];

const TASKS = [
  { t: "Approve October batch schedule", who: "Academic · due today", pri: "high", state: "To do" },
  { t: "Callback: 5 pending enquiries", who: "Front desk · due today", pri: "med", state: "In progress" },
  { t: "Publish September results blog", who: "CMS · due Fri", pri: "low", state: "To do" },
  { t: "Verify fee receipts (12)", who: "Finance · due Fri", pri: "med", state: "To do" },
];

const QUICK_ACTIONS = [
  { label: "New Admission", icon: (s: number) => <UserPlusIcon size={s} /> },
  { label: "New Blog Post", icon: (s: number) => <PenIcon size={s} /> },
  { label: "New Page", icon: (s: number) => <FileIcon size={s} /> },
  { label: "WhatsApp Alert", icon: (s: number) => <WhatsAppIcon size={s} /> },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayLine(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface AdminDashboardProps {
  session: AdminSession;
}

export function AdminDashboard({ session }: AdminDashboardProps) {
  const firstName = session.user.full_name.split(" ")[0] || "Admin";
  const maxEnroll = Math.max(...ENROLLMENT.map((e) => e.v));

  return (
    <div className="adm-dash">
      {/* page head */}
      <div className="adm-phead">
        <div>
          <div className="adm-eyebrow">Administration</div>
          <h1>
            {greeting()}, <em>{firstName}</em>
          </h1>
          <p>{todayLine()} — here is the academy at a glance.</p>
        </div>
        <div className="adm-phead-actions">
          <button type="button" className="adm-btn adm-btn-g" aria-disabled="true">
            <ChartLineIcon size={12} /> Reports
            <span className="adm-soon">Soon</span>
          </button>
          <button type="button" className="adm-btn" aria-disabled="true">
            <PlusIcon size={12} /> New admission
          </button>
        </div>
      </div>

      {/* stat row */}
      <div className="adm-stats">
        {STATS.map((s) => (
          <div key={s.label} className="adm-stat">
            <div className="adm-stat-l">{s.label}</div>
            <div className={`adm-stat-v ${s.tone}`}>{s.value}</div>
            <div className="adm-stat-s">{s.sub}</div>
            <div className="adm-stat-ic">{s.icon(15)}</div>
          </div>
        ))}
      </div>

      {/* charts row */}
      <div className="adm-grid2">
        <div className="adm-card">
          <div className="adm-card-hd">
            <div style={{ flex: 1 }}>
              <h3>Enrollment trend</h3>
              <p>New admissions per month · sample data</p>
            </div>
            <span className="adm-chip">+29% YoY</span>
          </div>
          <div className="adm-card-bd">
            <div className="adm-bars" role="img" aria-label="Sample enrollment bar chart">
              {ENROLLMENT.map((e) => (
                <div key={e.m} className="adm-bar-col">
                  <div className="adm-bar-wrap">
                    <div
                      className="adm-bar"
                      style={{ height: `${Math.round((e.v / maxEnroll) * 100)}%` }}
                    >
                      <span>{e.v}</span>
                    </div>
                  </div>
                  <div className="adm-bar-lb">{e.m}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-hd">
            <div style={{ flex: 1 }}>
              <h3>Batch occupancy</h3>
              <p>Seats filled across running batches</p>
            </div>
          </div>
          <div className="adm-card-bd">
            <div className="adm-occ">
              {BATCHES.map((b) => (
                <div key={b.name} className="adm-occ-row">
                  <div className="adm-occ-lb">
                    <span>{b.name}</span>
                    <b>
                      {b.cap} · {b.fill}%
                    </b>
                  </div>
                  <div className="adm-prog">
                    <i className={b.tone} style={{ width: `${b.fill}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* lists row */}
      <div className="adm-grid3">
        <div className="adm-card">
          <div className="adm-card-hd">
            <div style={{ flex: 1 }}>
              <h3>Recent enquiries</h3>
              <p>Latest admissions inbox items</p>
            </div>
            <InboxIcon size={14} className="adm-hd-ic" />
          </div>
          <div className="adm-card-bd flush">
            {ENQUIRIES.map((e) => (
              <div key={e.name} className="adm-row">
                <div className="adm-row-tx">
                  <b>{e.name}</b>
                  <span>
                    {e.what} · {e.when}
                  </span>
                </div>
                <span className="adm-tag-sm">{e.tag}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-hd">
            <div style={{ flex: 1 }}>
              <h3>Today's schedule</h3>
              <p>Classes running today</p>
            </div>
            <ClockIcon size={14} className="adm-hd-ic" />
          </div>
          <div className="adm-card-bd flush">
            {SCHEDULE.map((s) => (
              <div key={s.time} className="adm-row">
                <div className="adm-row-time">{s.time}</div>
                <div className="adm-row-tx">
                  <b>{s.what}</b>
                  <span>{s.who}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-hd">
            <div style={{ flex: 1 }}>
              <h3>Pending tasks</h3>
              <p>{TASKS.length} outstanding</p>
            </div>
            <TaskListIcon size={14} className="adm-hd-ic" />
          </div>
          <div className="adm-card-bd flush">
            {TASKS.map((t) => (
              <div key={t.t} className="adm-row">
                <span className={`adm-pri ${t.pri}`} />
                <div className="adm-row-tx">
                  <b>{t.t}</b>
                  <span>{t.who}</span>
                </div>
                <span className={`adm-tag-sm${t.state === "In progress" ? " amb" : ""}`}>
                  {t.state}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* quick actions */}
      <div className="adm-card">
        <div className="adm-card-hd">
          <div style={{ flex: 1 }}>
            <h3>Quick actions</h3>
            <p>Jump straight into the common jobs</p>
          </div>
        </div>
        <div className="adm-card-bd">
          <div className="adm-qa">
            {QUICK_ACTIONS.map((a) => (
              <button key={a.label} type="button" className="adm-qa-btn" aria-disabled="true">
                <span className="adm-qa-ic">{a.icon(15)}</span>
                {a.label}
                <ArrowRightIcon size={11} className="adm-qa-ar" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
