/**
 * AIO Settings — Settings → AIO Settings (/admin/settings/aio).
 *
 * Same settings wizard as General/SEO, scoped to the `aio` registry group:
 * AI / answer-engine optimization — the /llms.txt switch, the AI-crawler
 * robots.txt policy, and the org summary / key facts / sameAs fields that
 * feed JSON-LD. Save/validate flow is identical — PATCHes go through
 * /api/admin/settings like every other group.
 */
import { SettingsWizard } from "@/components/admin/GeneralSettings";
import type { AdminSession } from "@/lib/auth";

const AIO_GROUP_IDS = ["aio"];

export function AioSettings({ session }: { session: AdminSession }) {
  return (
    <SettingsWizard
      session={session}
      groupIds={AIO_GROUP_IDS}
      eyebrow="Settings"
      title={
        <>
          AIO <em>Settings</em>
        </>
      }
      lede="AI / answer-engine visibility — serve llms.txt, set the AI-crawler robots policy, and feed answer engines your org summary, key facts and profile links."
    />
  );
}
