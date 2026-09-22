/**
 * AdminShell — the organized menu chrome around the admin dashboard.
 *
 * Desktop (≥900px): slim sticky navbar — logo + "Admin" tag on the left,
 * main-menu items with slim dropdowns immediately right of the brand,
 * search/bell/avatar on the right. Mobile (<900px): hamburger opens a
 * slide-in drawer with accordion submenus, backdrop overlay and ≥44px
 * tap targets.
 *
 * Only Dashboard is a live destination; every other leaf shows a "Soon"
 * badge and never navigates (approved Plan v7 — menu structure only).
 */
import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ADMIN_NAV } from "@/components/admin/nav";
import type { AdminNavIcon, AdminNavItem } from "@/components/admin/nav";
import { clearSession } from "@/lib/auth";
import type { AdminSession } from "@/lib/auth";
import { useBranding } from "@/lib/branding";
import {
  ArrowRightIcon,
  BanknoteIcon,
  BellIcon,
  BookOpenIcon,
  BriefcaseIcon,
  CalendarCheckIcon,
  ChartLineIcon,
  ChevronIcon,
  ClockIcon,
  DatabaseIcon,
  EnvelopeIcon,
  FileIcon,
  GaugeIcon,
  GearIcon,
  GradCapIcon,
  InboxIcon,
  LayoutIcon,
  MenuIcon,
  PenIcon,
  QuoteLeftIcon,
  SearchIcon,
  ServerIcon,
  SignOutIcon,
  SparkIcon,
  TaskListIcon,
  UserIcon,
  UserPlusIcon,
  UsersIcon,
  WhatsAppIcon,
  XIcon,
} from "@/components/icons";

const NAV_ICONS: Record<AdminNavIcon, (p: { size?: number }) => ReactNode> = {
  gauge: (p) => <GaugeIcon {...p} />,
  database: (p) => <DatabaseIcon {...p} />,
  book: (p) => <BookOpenIcon {...p} />,
  briefcase: (p) => <BriefcaseIcon {...p} />,
  banknote: (p) => <BanknoteIcon {...p} />,
  users: (p) => <UsersIcon {...p} />,
  spark: (p) => <SparkIcon {...p} />,
  gear: (p) => <GearIcon {...p} />,
  layout: (p) => <LayoutIcon {...p} />,
  pen: (p) => <PenIcon {...p} />,
  gradcap: (p) => <GradCapIcon {...p} />,
  inbox: (p) => <InboxIcon {...p} />,
  tasklist: (p) => <TaskListIcon {...p} />,
  userplus: (p) => <UserPlusIcon {...p} />,
  chartline: (p) => <ChartLineIcon {...p} />,
  envelope: (p) => <EnvelopeIcon {...p} />,
  quoteleft: (p) => <QuoteLeftIcon {...p} />,
  user: (p) => <UserIcon {...p} />,
  file: (p) => <FileIcon {...p} />,
  arrowright: (p) => <ArrowRightIcon {...p} />,
  clock: (p) => <ClockIcon {...p} />,
  calendarcheck: (p) => <CalendarCheckIcon {...p} />,
  whatsapp: (p) => <WhatsAppIcon {...p} />,
  search: (p) => <SearchIcon {...p} />,
  server: (p) => <ServerIcon {...p} />,
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function SoonBadge() {
  return <span className="adm-soon">Soon</span>;
}

interface AdminShellProps {
  session: AdminSession;
  onSignOut: () => void;
  children: ReactNode;
}

export function AdminShell({ session, onSignOut, children }: AdminShellProps) {
  const branding = useBranding();
  const navId = useId();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Click-outside / Escape closes every transient surface.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (openMenu && navRef.current && !navRef.current.contains(t)) {
        setOpenMenu(null);
      }
      if (userMenuOpen && userRef.current && !userRef.current.contains(t)) {
        setUserMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setUserMenuOpen(false);
        setDrawerOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu, userMenuOpen]);

  // Lock body scroll + move focus inside while the drawer is open.
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    if (drawerOpen) drawerCloseRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  function signOut() {
    clearSession();
    onSignOut();
  }

  // Hover opens a submenu; click pins it open (toggle-close would fight the
  // mouseenter that fires first). Mouse-leave, outside click or Escape close.
  function openSub(id: string) {
    setOpenMenu(id);
  }

  function toggleAccordion(id: string) {
    setExpanded((cur) => (cur === id ? null : id));
  }

  const logo = branding.logo_url ?? "/assets/bloom-mark.png";

  return (
    <div className="adm-shell">
      <header className="adm-top">
        {/* hamburger — mobile only */}
        <button
          type="button"
          className="adm-burger"
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          aria-controls={`${navId}-drawer`}
          onClick={() => setDrawerOpen(true)}
        >
          <MenuIcon size={17} />
        </button>

        <a className="adm-brand" href="/admin">
          <img src={logo} alt={branding.name} />
          <span className="adm-brand-nm">{branding.name}</span>
          <span className="adm-tag">Admin</span>
        </a>

        {/* main menu — left-aligned beside the brand, desktop only */}
        <nav className="adm-nav" aria-label="Admin sections" ref={navRef}>
          {ADMIN_NAV.map((item) => (
            <div
              key={item.id}
              className="adm-ni"
              onMouseEnter={() => item.children.length > 0 && setOpenMenu(item.id)}
              onMouseLeave={() => item.children.length > 0 && setOpenMenu(null)}
            >
              {item.children.length === 0 ? (
                <button
                  type="button"
                  className="adm-nl on"
                  aria-current="page"
                >
                  <span className="adm-nl-ic">{NAV_ICONS[item.icon]({ size: 13 })}</span>
                  {item.label}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className={`adm-nl${openMenu === item.id ? " open" : ""}`}
                    aria-haspopup="true"
                    aria-expanded={openMenu === item.id}
                    onClick={() => openSub(item.id)}
                  >
                    <span className="adm-nl-ic">{NAV_ICONS[item.icon]({ size: 13 })}</span>
                    {item.label}
                    <ChevronIcon size={9} className="adm-chev" />
                  </button>
                  <div
                    className={`adm-drop${openMenu === item.id ? " show" : ""}`}
                    role="menu"
                  >
                    {item.children.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        role="menuitem"
                        className="adm-di"
                        aria-disabled="true"
                      >
                        <span className="adm-di-ic">
                          {NAV_ICONS[sub.icon]({ size: 12 })}
                          {sub.label}
                        </span>
                        {sub.soon && <SoonBadge />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </nav>

        <div className="adm-top-right">
          <button type="button" className="adm-icbtn" aria-label="Search">
            <SearchIcon size={15} />
          </button>
          <button
            type="button"
            className="adm-icbtn"
            aria-label="Notifications"
          >
            <BellIcon size={15} />
            <span className="adm-dot" />
          </button>

          <div className="adm-user" ref={userRef}>
            <button
              type="button"
              className="adm-avatar"
              aria-haspopup="true"
              aria-expanded={userMenuOpen}
              onClick={() => setUserMenuOpen((s) => !s)}
            >
              <span className="adm-av">{initials(session.user.full_name)}</span>
              <ChevronIcon size={9} className="adm-chev" />
            </button>
            <div className={`adm-drop adm-udrop${userMenuOpen ? " show" : ""}`} role="menu">
              <div className="adm-uwho">
                <b>{session.user.full_name}</b>
                <span>{session.user.email}</span>
              </div>
              <button type="button" role="menuitem" className="adm-di" aria-disabled="true">
                <span className="adm-di-ic">
                  <UserIcon size={12} />
                  Profile
                </span>
                <SoonBadge />
              </button>
              <button
                type="button"
                role="menuitem"
                className="adm-di adm-di-out"
                onClick={signOut}
              >
                <span className="adm-di-ic">
                  <SignOutIcon size={12} />
                  Sign out
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* mobile drawer */}
      <div
        className={`adm-scrim${drawerOpen ? " show" : ""}`}
        aria-hidden="true"
        onClick={() => setDrawerOpen(false)}
      />
      <aside
        id={`${navId}-drawer`}
        className={`adm-drawer${drawerOpen ? " open" : ""}`}
        aria-label="Admin menu"
        aria-hidden={!drawerOpen}
      >
        <div className="adm-drawer-top">
          <img src={logo} alt="" />
          <div>
            <b>{branding.name}</b>
            <span>Administration</span>
          </div>
          <button
            type="button"
            className="adm-icbtn"
            aria-label="Close menu"
            ref={drawerCloseRef}
            onClick={() => setDrawerOpen(false)}
          >
            <XIcon size={15} />
          </button>
        </div>

        <nav className="adm-drawer-nav" aria-label="Admin sections">
          {ADMIN_NAV.map((item: AdminNavItem) =>
            item.children.length === 0 ? (
              <button
                key={item.id}
                type="button"
                className="adm-dl on"
                aria-current="page"
                onClick={() => setDrawerOpen(false)}
              >
                <span className="adm-dl-ic">{NAV_ICONS[item.icon]({ size: 15 })}</span>
                {item.label}
              </button>
            ) : (
              <div key={item.id} className="adm-dgrp">
                <button
                  type="button"
                  className={`adm-dl${expanded === item.id ? " open" : ""}`}
                  aria-expanded={expanded === item.id}
                  onClick={() => toggleAccordion(item.id)}
                >
                  <span className="adm-dl-ic">{NAV_ICONS[item.icon]({ size: 15 })}</span>
                  {item.label}
                  <ChevronIcon size={11} className="adm-dl-chev" />
                </button>
                <div className={`adm-dsub${expanded === item.id ? " show" : ""}`}>
                  {item.children.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      className="adm-dsi"
                      aria-disabled="true"
                    >
                      <span className="adm-dsi-ic">
                        {NAV_ICONS[sub.icon]({ size: 13 })}
                        {sub.label}
                      </span>
                      {sub.soon && <SoonBadge />}
                    </button>
                  ))}
                </div>
              </div>
            ),
          )}
        </nav>

        <div className="adm-drawer-foot">
          <div className="adm-who">
            <span className="adm-av">{initials(session.user.full_name)}</span>
            <div>
              <b>{session.user.full_name}</b>
              <span>{session.user.email}</span>
            </div>
          </div>
          <button type="button" className="adm-signout" onClick={signOut}>
            <SignOutIcon size={13} /> Sign out
          </button>
        </div>
      </aside>

      <main className="adm-main">{children}</main>
    </div>
  );
}
