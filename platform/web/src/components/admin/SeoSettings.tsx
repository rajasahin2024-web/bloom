/**
 * SEO Settings — Settings → SEO Settings (/admin/settings/seo).
 *
 * Same settings wizard as General Settings, scoped to the `seo` registry
 * group: global meta, indexing & crawling controls, and verification /
 * analytics IDs. Save/validate flow is identical — PATCHes go through
 * /api/admin/settings like every other group.
 */
import { SettingsWizard } from "@/components/admin/GeneralSettings";
import type { AdminSession } from "@/lib/auth";

const SEO_GROUP_IDS = ["seo"];

export function SeoSettings({ session }: { session: AdminSession }) {
  return (
    <SettingsWizard
      session={session}
      groupIds={SEO_GROUP_IDS}
      eyebrow="Settings"
      title={
        <>
          SEO <em>Settings</em>
        </>
      }
      lede="Search visibility — global meta tags, indexing and crawling controls, and verification / analytics IDs for the public site."
    />
  );
}
