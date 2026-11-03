import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";

vi.mock("@/lib/storage", () => ({
  fetchStorageStatus: vi.fn(),
  putStorageConnection: vi.fn(),
  deleteStorageConnection: vi.fn(),
  fetchStorageBuckets: vi.fn(),
  createStorageBucket: vi.fn(),
  selectStorageBucket: vi.fn(),
  fetchStorageObjects: vi.fn(),
  putStoragePrefixes: vi.fn(),
  fetchStorageUsage: vi.fn(),
}));

import {
  fetchStorageStatus,
  putStorageConnection,
  fetchStorageBuckets,
  selectStorageBucket,
  fetchStorageObjects,
  putStoragePrefixes,
  fetchStorageUsage,
} from "@/lib/storage";
import { StorageSettings } from "./StorageSettings";
import type { AdminSession } from "@/lib/auth";
import type { StorageStatus } from "@/lib/storage";

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
  tokens: {
    access_token: "at-1",
    token_type: "bearer",
    expires_in: 1800,
  },
};

const notConfigured: StorageStatus = {
  configured: false,
  account_id: null,
  access_key_id: null,
  bucket: null,
  prefixes: { media: null, public_uploads: null, files: null },
  reachable: false,
};

const connected: StorageStatus = {
  configured: true,
  account_id: "acct••••1234",
  access_key_id: "key••••abcd",
  bucket: "bloom-media",
  prefixes: { media: "media/", public_uploads: "public/", files: "files/" },
  reachable: true,
};

const unreachable: StorageStatus = { ...connected, reachable: false };

function mockConnectedBackend() {
  vi.mocked(fetchStorageStatus).mockResolvedValue(connected);
  vi.mocked(fetchStorageBuckets).mockResolvedValue([
    { name: "bloom-media", created_at: "2026-01-01T00:00:00Z" },
    { name: "backups", created_at: "2026-02-01T00:00:00Z" },
  ]);
  vi.mocked(fetchStorageUsage).mockResolvedValue({
    bytes: 2_400_000_000,
    object_count: 1842,
    truncated: false,
  });
  vi.mocked(fetchStorageObjects).mockResolvedValue({
    folders: ["media/", "public/"],
    objects: [
      { key: "logo.png", size: 48_210, last_modified: "2026-10-01T00:00:00Z" },
    ],
    next_token: null,
    truncated: false,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("StorageSettings", () => {
  it("renders the not-configured connection state", async () => {
    vi.mocked(fetchStorageStatus).mockResolvedValue(notConfigured);
    const { getByText, getByLabelText, findByText } = render(
      <StorageSettings session={session} />,
    );

    expect(await findByText("Not configured")).toBeTruthy();
    expect(getByLabelText("Account ID")).toBeTruthy();
    expect(getByLabelText("Secret access key")).toBeTruthy();
    // dependent cards stay hidden until a connection exists
    expect(document.body.textContent).not.toContain("Purpose mapping");
    void getByText;
  });

  it("shows the unreachable warning and hides dependent cards", async () => {
    vi.mocked(fetchStorageStatus).mockResolvedValue(unreachable);
    const { findByText, queryByText } = render(
      <StorageSettings session={session} />,
    );

    expect(await findByText("Unreachable")).toBeTruthy();
    expect(document.body.textContent).toContain("R2 is unreachable");
    expect(queryByText("Buckets")).toBeNull();
    // prefix mapping is config — still editable while unreachable
    expect(queryByText("Purpose mapping")).toBeTruthy();
  });

  it("lists buckets and selects the active one", async () => {
    mockConnectedBackend();
    vi.mocked(selectStorageBucket).mockResolvedValue(connected);
    const { findByText, getByText } = render(
      <StorageSettings session={session} />,
    );

    expect(await findByText("Active")).toBeTruthy();
    fireEvent.click(getByText("Select"));

    await waitFor(() =>
      expect(selectStorageBucket).toHaveBeenCalledWith("at-1", "backups"),
    );
  });

  it("keeps masked values as placeholders — PUT sends the typed credential trio", async () => {
    mockConnectedBackend();
    vi.mocked(putStorageConnection).mockResolvedValue(connected);
    const { findByText, getByLabelText, getByText } = render(
      <StorageSettings session={session} />,
    );

    await findByText("Connected");
    const acct = getByLabelText("Account ID") as HTMLInputElement;
    // masked value is shown as a placeholder, never as a resubmittable value
    expect(acct.value).toBe("");
    expect(acct.placeholder).toContain("••••1234");

    fireEvent.change(getByLabelText("Account ID"), {
      target: { value: "acct-new" },
    });
    fireEvent.change(getByLabelText("Access key ID"), {
      target: { value: "key-new" },
    });
    fireEvent.change(getByLabelText("Secret access key"), {
      target: { value: "sec-new" },
    });
    fireEvent.click(getByText("Test & save changes"));

    await waitFor(() =>
      expect(putStorageConnection).toHaveBeenCalledWith("at-1", {
        account_id: "acct-new",
        access_key_id: "key-new",
        secret_access_key: "sec-new",
      }),
    );
  });

  it("blocks prefix save client-side when the value does not end in /", async () => {
    mockConnectedBackend();
    const { findByText, getByLabelText, getByText } = render(
      <StorageSettings session={session} />,
    );

    await findByText("Purpose mapping");
    fireEvent.change(getByLabelText("Media uploads"), {
      target: { value: "media" },
    });
    fireEvent.click(getByText("Save mapping"));

    expect(await findByText("Folder paths must end in “/”.")).toBeTruthy();
    expect(putStoragePrefixes).not.toHaveBeenCalled();
  });
});
