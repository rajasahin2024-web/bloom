import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/lib/mail", () => ({
  fetchMailStatus: vi.fn(),
  fetchMailDns: vi.fn(),
  fetchMailQueue: vi.fn(),
  retryMailQueue: vi.fn(),
  fetchMailDelivery: vi.fn(),
  sendMailTest: vi.fn(),
  fetchMailboxes: vi.fn(),
  createMailbox: vi.fn(),
  suspendMailbox: vi.fn(),
  unsuspendMailbox: vi.fn(),
  retryMailbox: vi.fn(),
  resetMailboxPassword: vi.fn(),
  testMailbox: vi.fn(),
}));

import {
  createMailbox,
  fetchMailDelivery,
  fetchMailDns,
  fetchMailQueue,
  fetchMailStatus,
  fetchMailboxes,
  resetMailboxPassword,
  retryMailQueue,
  sendMailTest,
  suspendMailbox,
} from "@/lib/mail";
import type {
  Mailbox,
  MailDnsReport,
  MailEngineStatus,
} from "@/lib/mail";
import { MailEngine } from "./MailEngine";
import type { AdminSession } from "@/lib/auth";

const session: AdminSession = {
  user: {
    id: "u1",
    email: "admin@example.com",
    phone: null,
    full_name: "Admin User",
    role: "admin",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  tokens: { access_token: "at-1", token_type: "bearer", expires_in: 1800 },
};

const statusFixture: MailEngineStatus = {
  engine: "Stalwart Mail 0.11",
  checkedAt: "2026-11-15T10:00:00Z",
  apiReachable: true,
  listeners: [
    { name: "smtp", port: 25, ok: true },
    { name: "smtps", port: 465, ok: true },
    { name: "submission", port: 587, ok: true },
    { name: "imaps", port: 993, ok: false },
  ],
  tls: {
    host: "mail.bloomieltsacademy.com",
    expiresAt: "2026-11-20T00:00:00Z",
    daysRemaining: 5,
  },
  queue: { active: 1, deferred: 2 },
};

const dnsFixture: MailDnsReport = {
  checkedAt: "2026-11-15T10:00:00Z",
  records: [
    { name: "MX bloomieltsacademy.com", expected: "mail.bloomieltsacademy.com", found: "mail.bloomieltsacademy.com", ok: true },
    { name: "SPF bloomieltsacademy.com", expected: "v=spf1 mx -all", found: null, ok: false },
  ],
};

const mailboxFixture: Mailbox = {
  id: "m-1",
  user_id: "student-uuid-1234",
  localpart: "rahim.uddin",
  address: "rahim.uddin@bloomieltsacademy.com",
  status: "active",
  quota_mb: 1024,
  provisioned_at: "2026-11-01T00:00:00Z",
  last_error: null,
  attempts: 1,
  created_at: "2026-10-30T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/admin/mail/*"
          element={<MailEngine session={session} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchMailStatus).mockResolvedValue(statusFixture);
  vi.mocked(fetchMailDns).mockResolvedValue(dnsFixture);
  vi.mocked(fetchMailQueue).mockResolvedValue({
    available: false,
    items: [],
    total: 0,
  });
  vi.mocked(fetchMailDelivery).mockResolvedValue({ available: false, items: [] });
  vi.mocked(fetchMailboxes).mockResolvedValue({
    items: [mailboxFixture],
    total: 1,
    page: 1,
    page_size: 20,
  });
});

describe("MailEngine — Status tab", () => {
  it("redirects /admin/mail to the status tab and renders the engine cards", async () => {
    const { findByText, getByText } = renderAt("/admin/mail");

    expect(await findByText("API reachable")).toBeTruthy();
    expect(getByText("Stalwart Mail 0.11")).toBeTruthy();
    // listener matrix — name + port
    expect(getByText("imaps")).toBeTruthy();
    expect(getByText(":993")).toBeTruthy();
    // TLS under 14 days → warn copy
    expect(getByText("5 days left")).toBeTruthy();
    // queue counts
    expect(getByText("active")).toBeTruthy();
    expect(getByText("deferred")).toBeTruthy();
  });

  it("shows DNS records with pass/fail and the missing-found case", async () => {
    const { findByText } = renderAt("/admin/mail/status");

    expect(await findByText("DNS records")).toBeTruthy();
    expect(await findByText("MX bloomieltsacademy.com")).toBeTruthy();
    expect(await findByText(/not published/)).toBeTruthy();
  });

  it("renders N/A for null tls/queue engine gaps", async () => {
    vi.mocked(fetchMailStatus).mockResolvedValue({
      ...statusFixture,
      tls: null,
      queue: null,
    });
    const { findAllByText } = renderAt("/admin/mail/status");

    const nas = await findAllByText(/N\/A/);
    expect(nas.length).toBeGreaterThanOrEqual(2);
  });
});

describe("MailEngine — Mailboxes tab", () => {
  it("lists mailboxes with status pills and quota", async () => {
    const { findByText } = renderAt("/admin/mail/mailboxes");

    expect(await findByText("rahim.uddin@bloomieltsacademy.com")).toBeTruthy();
    expect(
      await findByText("Active", { selector: ".adm-pill" }),
    ).toBeTruthy();
    expect(await findByText("1024 MB")).toBeTruthy();
  });

  it("suspends a mailbox through the confirm dialog", async () => {
    vi.mocked(suspendMailbox).mockResolvedValue(undefined);
    const { findByText, getByText } = renderAt("/admin/mail/mailboxes");

    fireEvent.click(await findByText("Suspend"));
    fireEvent.click(getByText("Suspend mailbox"));

    await waitFor(() =>
      expect(suspendMailbox).toHaveBeenCalledWith("at-1", "m-1"),
    );
  });

  it("shows the reset password once, inside the dialog only", async () => {
    vi.mocked(resetMailboxPassword).mockResolvedValue({
      password: "new-secret-pw",
    });
    const { findByText, getByText, queryByText } = renderAt(
      "/admin/mail/mailboxes",
    );

    fireEvent.click(await findByText("Reset password"));
    fireEvent.click(
      getByText("Reset password", { selector: ".adm-modal button" }),
    );

    expect(await findByText("new-secret-pw")).toBeTruthy();
    expect(getByText("Copy")).toBeTruthy();

    // closing the dialog discards the password — it never reaches the page
    fireEvent.click(getByText("Done"));
    expect(queryByText("new-secret-pw")).toBeNull();
  });

  it("blocks an invalid localpart client-side on create", async () => {
    const { findByText, getByLabelText, getByText } = renderAt(
      "/admin/mail/mailboxes",
    );

    await findByText("Create mailbox");
    fireEvent.change(getByLabelText("Username"), {
      target: { value: "Bad Part!!" },
    });
    fireEvent.change(getByLabelText("Password"), {
      target: { value: "long-enough-pw" },
    });
    fireEvent.click(getByText("Create"));

    expect(await findByText(/Lowercase letters/)).toBeTruthy();
    expect(createMailbox).not.toHaveBeenCalled();
  });
});

describe("MailEngine — Queue tab", () => {
  it("renders the not-supported empty state when available is false", async () => {
    const { findByText } = renderAt("/admin/mail/queue");

    expect(await findByText("Not supported")).toBeTruthy();
    expect(
      await findByText(/not available on this engine version/),
    ).toBeTruthy();
  });

  it("retries a single deferred message", async () => {
    vi.mocked(fetchMailQueue).mockResolvedValue({
      available: true,
      total: 1,
      items: [
        {
          id: "q-1",
          returnPath: "rahim.uddin@bloomieltsacademy.com",
          size: 4210,
          created: "2026-11-15T09:00:00Z",
          status: "deferred",
          nextRetry: "2026-11-15T11:00:00Z",
          recipients: 2,
        },
      ],
    });
    vi.mocked(retryMailQueue).mockResolvedValue({
      available: true,
      retried: 1,
      error: null,
    });
    const { findByText, getByText } = renderAt("/admin/mail/queue");

    fireEvent.click(await findByText("Retry"));

    await waitFor(() =>
      expect(retryMailQueue).toHaveBeenCalledWith("at-1", ["q-1"]),
    );
    expect(getByText("rahim.uddin@bloomieltsacademy.com")).toBeTruthy();
    expect(await findByText(/re-queued/)).toBeTruthy();
  });
});

describe("MailEngine — Delivery tab", () => {
  it("renders the not-supported empty state", async () => {
    const { findByText } = renderAt("/admin/mail/delivery");

    expect(await findByText("Not supported")).toBeTruthy();
  });

  it("shows metadata only — no body content", async () => {
    vi.mocked(fetchMailDelivery).mockResolvedValue({
      available: true,
      items: [
        {
          id: "d-1",
          direction: "inbound",
          from: "ext@gmail.com",
          to: ["rahim.uddin@bloomieltsacademy.com"],
          subject: "Speaking slot",
          receivedAt: "2026-11-14T09:00:00Z",
          status: "seen",
          folder: "INBOX",
        },
      ],
    });
    const { findByText, getByText } = renderAt("/admin/mail/delivery");

    expect(await findByText("Speaking slot")).toBeTruthy();
    expect(getByText("INBOX")).toBeTruthy();
    expect(getByText(/never shown, by design/)).toBeTruthy();
  });
});

describe("MailEngine — Tools tab", () => {
  it("rejects a malformed recipient client-side", async () => {
    const { findByText, getByLabelText, getByText } = renderAt(
      "/admin/mail/tools",
    );

    fireEvent.change(getByLabelText("Recipient"), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(getByText("Send test"));

    expect(await findByText("Enter a valid email address.")).toBeTruthy();
    expect(sendMailTest).not.toHaveBeenCalled();
  });

  it("toasts the accepted result with the message id", async () => {
    vi.mocked(sendMailTest).mockResolvedValue({
      accepted: true,
      messageId: "msg-123",
      error: null,
    });
    const { findByText, getByLabelText, getByText } = renderAt(
      "/admin/mail/tools",
    );

    fireEvent.change(getByLabelText("Recipient"), {
      target: { value: "ops@bloomieltsacademy.com" },
    });
    fireEvent.click(getByText("Send test"));

    await waitFor(() =>
      expect(sendMailTest).toHaveBeenCalledWith(
        "at-1",
        "ops@bloomieltsacademy.com",
      ),
    );
    expect(await findByText(/msg-123/)).toBeTruthy();
  });
});
