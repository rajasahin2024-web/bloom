/**
 * Section registry — maps each section `type` string to its React component
 * and its edit-form field spec. SitePage renders via SECTION_REGISTRY;
 * SiteEditor auto-generates its form from SECTION_META.
 *
 * FieldSpec kinds: text, textarea, richtext, url, image, toggle, select,
 * group (nested single object) and list:true (array of itemFields).
 */
import type { ComponentType } from "react";
import { NavSection } from "./NavSection";
import { HeroSection } from "./HeroSection";
import { StatsStripSection } from "./StatsStripSection";
import { DestinationsSection } from "./DestinationsSection";
import { RichBlockSection } from "./RichBlockSection";
import { StepsSection } from "./StepsSection";
import { FeatureGridSection } from "./FeatureGridSection";
import { ShowcaseSection } from "./ShowcaseSection";
import { CertificateListSection } from "./CertificateListSection";
import { StaffCardsSection } from "./StaffCardsSection";
import { TestimonialCardsSection } from "./TestimonialCardsSection";
import { OverseasSection } from "./OverseasSection";
import { UniversityGridSection } from "./UniversityGridSection";
import { CtaStripSection } from "./CtaStripSection";
import { PricingTiersSection } from "./PricingTiersSection";
import { ReachSection } from "./ReachSection";
import { LifeSection } from "./LifeSection";
import { PaperCtaSection } from "./PaperCtaSection";
import { ContactSection } from "./ContactSection";
import { FooterSection } from "./FooterSection";
import { BandTableSection } from "./BandTableSection";
import { FaqSection } from "./FaqSection";
import { CourseGridSection } from "./CourseGridSection";
import { UniFilterSection } from "./UniFilterSection";
import { DataTableSection } from "./DataTableSection";
import { MomentsSection } from "./MomentsSection";
import { MapBlockSection } from "./MapBlockSection";
import { JobListSection } from "./JobListSection";
import { JobFormSection } from "./JobFormSection";
import { BlogGridSection } from "./BlogGridSection";
import { BlogFilterSection } from "./BlogFilterSection";
import { AuthPageSection } from "./AuthPageSection";
import type { FieldSpec, SectionMeta } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SECTION_REGISTRY: Record<string, ComponentType<{ props: any; animation?: any }>> = {
  nav: NavSection,
  hero: HeroSection,
  stats_strip: StatsStripSection,
  destinations: DestinationsSection,
  rich_block: RichBlockSection,
  steps: StepsSection,
  feature_grid: FeatureGridSection,
  showcase: ShowcaseSection,
  certificate_list: CertificateListSection,
  staff_cards: StaffCardsSection,
  testimonial_cards: TestimonialCardsSection,
  overseas: OverseasSection,
  university_grid: UniversityGridSection,
  cta_strip: CtaStripSection,
  pricing_tiers: PricingTiersSection,
  reach: ReachSection,
  life: LifeSection,
  paper_cta: PaperCtaSection,
  contact: ContactSection,
  footer: FooterSection,
  band_table: BandTableSection,
  faq: FaqSection,
  course_grid: CourseGridSection,
  uni_filter: UniFilterSection,
  data_table: DataTableSection,
  moments: MomentsSection,
  map_block: MapBlockSection,
  job_list: JobListSection,
  job_form: JobFormSection,
  blog_grid: BlogGridSection,
  blog_filter: BlogFilterSection,
  auth_page: AuthPageSection,
};

const linkFields: FieldSpec[] = [
  { kind: "text", key: "label", label: "Label" },
  { kind: "url", key: "href", label: "Link" },
];

const ctaFields: FieldSpec[] = [
  { kind: "text", key: "label", label: "Label" },
  { kind: "url", key: "href", label: "Link" },
];

export const SECTION_META: Record<string, SectionMeta> = {
  nav: {
    label: "Navigation",
    fields: [
      {
        kind: "group",
        key: "brand",
        label: "Brand",
        fields: [
          { kind: "text", key: "name", label: "Name" },
          { kind: "text", key: "tagline", label: "Tagline" },
          { kind: "image", key: "logo_url", label: "Logo" },
        ],
      },
      {
        kind: "text",
        key: "links",
        label: "Links",
        list: true,
        itemFields: linkFields,
      },
      {
        kind: "group",
        key: "cta",
        label: "Call to action",
        fields: [
          { kind: "url", key: "signin_href", label: "Sign-in link" },
          { kind: "url", key: "signup_href", label: "Sign-up link" },
          { kind: "text", key: "signup_label", label: "Sign-up label" },
        ],
      },
    ],
  },
  hero: {
    label: "Hero",
    fields: [
      { kind: "text", key: "badge", label: "Badge text" },
      { kind: "textarea", key: "headline", label: "Headline" },
      { kind: "textarea", key: "subhead", label: "Subhead" },
      { kind: "group", key: "primary_btn", label: "Primary button", fields: ctaFields },
      { kind: "group", key: "secondary_btn", label: "Secondary button", fields: ctaFields },
      {
        kind: "group",
        key: "stats_line",
        label: "Stats line",
        fields: [
          { kind: "text", key: "students", label: "Students" },
          { kind: "text", key: "band_gain", label: "Band gain" },
          { kind: "text", key: "reach_pct", label: "Reach %" },
        ],
      },
      {
        kind: "text",
        key: "avatars",
        label: "Avatars",
        list: true,
        itemFields: [
          { kind: "image", key: "media_url", label: "Photo" },
          { kind: "text", key: "initials", label: "Initials" },
        ],
      },
    ],
  },
  stats_strip: {
    label: "Stats strip",
    fields: [
      {
        kind: "text",
        key: "items",
        label: "Items",
        list: true,
        itemFields: [
          { kind: "text", key: "label", label: "Label" },
          { kind: "text", key: "value", label: "Value" },
          { kind: "text", key: "prefix", label: "Prefix" },
          { kind: "text", key: "suffix", label: "Suffix" },
        ],
      },
    ],
  },
  destinations: {
    label: "Destinations",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      {
        kind: "text",
        key: "items",
        label: "Items",
        list: true,
        itemFields: [
          { kind: "text", key: "name", label: "Name" },
          { kind: "image", key: "flag_url", label: "Flag" },
          { kind: "textarea", key: "blurb", label: "Blurb" },
        ],
      },
    ],
  },
  rich_block: {
    label: "Rich block",
    fields: [
      {
        kind: "select",
        key: "layout",
        label: "Layout",
        options: ["cards", "hero"],
      },
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "textarea", key: "body", label: "Body" },
      {
        kind: "select",
        key: "variant",
        label: "Variant",
        options: ["paper", "dark", "tight"],
      },
      {
        kind: "group",
        key: "primary_btn",
        label: "Primary button (hero)",
        fields: [
          { kind: "text", key: "label", label: "Label" },
          { kind: "url", key: "href", label: "Link" },
          { kind: "text", key: "icon", label: "Icon name" },
        ],
      },
      {
        kind: "group",
        key: "secondary_btn",
        label: "Secondary button (hero)",
        fields: [
          { kind: "text", key: "label", label: "Label" },
          { kind: "url", key: "href", label: "Link" },
        ],
      },
      {
        kind: "text",
        key: "stats",
        label: "Stats (hero)",
        list: true,
        itemFields: [
          { kind: "text", key: "value", label: "Value" },
          { kind: "text", key: "label", label: "Label" },
        ],
      },
      {
        kind: "text",
        key: "photos",
        label: "Photos (hero)",
        list: true,
        itemFields: [
          { kind: "image", key: "media_url", label: "Photo" },
          { kind: "text", key: "caption", label: "Caption" },
          { kind: "text", key: "sub", label: "Sub-caption" },
        ],
      },
      {
        kind: "text",
        key: "cards",
        label: "Cards",
        list: true,
        itemFields: [
          { kind: "text", key: "icon", label: "Icon name" },
          { kind: "text", key: "title", label: "Title" },
          { kind: "textarea", key: "body", label: "Body" },
          { kind: "url", key: "href", label: "Link" },
        ],
      },
      { kind: "text", key: "pad_top", label: "Padding top (px)" },
      { kind: "text", key: "pad_bottom", label: "Padding bottom (px)" },
    ],
  },
  steps: {
    label: "Steps",
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "textarea", key: "lead", label: "Lead" },
      {
        kind: "select",
        key: "variant",
        label: "Variant",
        options: ["paper", "dark", "tight"],
      },
      { kind: "toggle", key: "mid", label: "Centred heading" },
      {
        kind: "text",
        key: "steps",
        label: "Steps",
        list: true,
        itemFields: [
          { kind: "text", key: "n", label: "Number" },
          { kind: "text", key: "icon", label: "Icon name (card grid)" },
          { kind: "text", key: "title", label: "Title" },
          { kind: "textarea", key: "body", label: "Body" },
        ],
      },
      { kind: "text", key: "pad_top", label: "Padding top (px)" },
      { kind: "text", key: "pad_bottom", label: "Padding bottom (px)" },
    ],
  },
  feature_grid: {
    label: "Feature grid",
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "textarea", key: "lead", label: "Lead" },
      {
        kind: "select",
        key: "variant",
        label: "Variant",
        options: ["dark", "paper", "tight"],
      },
      { kind: "toggle", key: "mid", label: "Centred heading" },
      { kind: "text", key: "columns", label: "Columns (2 or 3)" },
      {
        kind: "group",
        key: "cta",
        label: "Call to action",
        fields: [
          { kind: "text", key: "label", label: "Label" },
          { kind: "url", key: "href", label: "Link" },
          { kind: "text", key: "icon", label: "Icon name" },
        ],
      },
      {
        kind: "text",
        key: "features",
        label: "Features",
        list: true,
        itemFields: [
          { kind: "text", key: "icon", label: "Icon name" },
          { kind: "text", key: "title", label: "Title" },
          { kind: "text", key: "sub", label: "Sub-line (skillcard)" },
          { kind: "textarea", key: "body", label: "Body" },
          { kind: "text", key: "color", label: "Header background (skillcard)" },
          {
            kind: "text",
            key: "rows",
            label: "Rows (skillcard)",
            list: true,
            itemFields: [
              { kind: "text", key: "label", label: "Label" },
              { kind: "text", key: "value", label: "Value" },
            ],
          },
          { kind: "textarea", key: "tip", label: "Tip box (skillcard)" },
          { kind: "text", key: "kind", label: "News tag (kind)" },
          { kind: "text", key: "date", label: "News date (ISO)" },
        ],
      },
      { kind: "text", key: "pad_top", label: "Padding top (px)" },
      { kind: "text", key: "pad_bottom", label: "Padding bottom (px)" },
    ],
  },
  showcase: {
    label: "Showcase",
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "textarea", key: "body", label: "Body" },
      {
        kind: "text",
        key: "tabs",
        label: "Tour tabs",
        list: true,
        itemFields: [
          { kind: "text", key: "key", label: "Key" },
          { kind: "text", key: "icon", label: "Icon name" },
          { kind: "text", key: "title", label: "Title" },
          { kind: "textarea", key: "body", label: "Body" },
          { kind: "text", key: "url", label: "Browser chrome URL" },
          { kind: "image", key: "image_url", label: "Screenshot" },
        ],
      },
      { kind: "textarea", key: "note", label: "Info note" },
      { kind: "text", key: "demo_note", label: "Demo note" },
      {
        kind: "group",
        key: "media",
        label: "Media",
        fields: [
          { kind: "image", key: "url", label: "Image / video URL" },
          { kind: "select", key: "type", label: "Type", options: ["image", "video"] },
        ],
      },
      { kind: "group", key: "cta", label: "Call to action", fields: ctaFields },
      { kind: "text", key: "pad_top", label: "Padding top (px)" },
      { kind: "text", key: "pad_bottom", label: "Padding bottom (px)" },
    ],
  },
  certificate_list: {
    label: "Certificates",
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "heading", label: "Heading" },
      {
        kind: "text",
        key: "items",
        label: "Items",
        list: true,
        itemFields: [
          { kind: "text", key: "name", label: "Name" },
          { kind: "text", key: "org", label: "Org line" },
          { kind: "text", key: "overall", label: "Overall band" },
          { kind: "text", key: "cefr", label: "CEFR" },
          {
            kind: "text",
            key: "skills",
            label: "Score rows",
            list: true,
            itemFields: [
              { kind: "text", key: "label", label: "Label" },
              { kind: "text", key: "value", label: "Value" },
            ],
          },
          { kind: "image", key: "logo_url", label: "Logo" },
          { kind: "textarea", key: "blurb", label: "Blurb" },
        ],
      },
    ],
  },
  staff_cards: {
    label: "Staff cards",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      {
        kind: "text",
        key: "staff",
        label: "Staff",
        list: true,
        itemFields: [
          { kind: "text", key: "name", label: "Name" },
          { kind: "text", key: "role", label: "Role" },
          { kind: "image", key: "photo_url", label: "Photo" },
          { kind: "textarea", key: "bio", label: "Bio" },
        ],
      },
    ],
  },
  testimonial_cards: {
    label: "Testimonials",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      {
        kind: "text",
        key: "students",
        label: "Students",
        list: true,
        itemFields: [
          { kind: "text", key: "name", label: "Name" },
          { kind: "image", key: "photo_url", label: "Photo" },
          { kind: "text", key: "before_band", label: "Before band" },
          { kind: "text", key: "after_band", label: "After band" },
          { kind: "textarea", key: "quote", label: "Quote" },
          { kind: "text", key: "course", label: "Course" },
        ],
      },
    ],
  },
  overseas: {
    label: "Overseas",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "textarea", key: "body", label: "Body" },
      {
        kind: "text",
        key: "items",
        label: "Items",
        list: true,
        itemFields: [
          { kind: "text", key: "title", label: "Title" },
          { kind: "textarea", key: "body", label: "Body" },
        ],
      },
    ],
  },
  university_grid: {
    label: "University grid",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      {
        kind: "text",
        key: "universities",
        label: "Universities",
        list: true,
        itemFields: [
          { kind: "text", key: "name", label: "Name" },
          { kind: "image", key: "logo_url", label: "Logo" },
          { kind: "url", key: "href", label: "Link" },
        ],
      },
    ],
  },
  cta_strip: {
    label: "CTA strip",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "textarea", key: "body", label: "Body" },
      { kind: "group", key: "cta", label: "Call to action", fields: ctaFields },
    ],
  },
  pricing_tiers: {
    label: "Pricing tiers",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      {
        kind: "text",
        key: "tiers",
        label: "Tiers",
        list: true,
        itemFields: [
          { kind: "text", key: "name", label: "Name" },
          { kind: "text", key: "price", label: "Price" },
          { kind: "text", key: "period", label: "Period" },
          { kind: "textarea", key: "features", label: "Features (one per line)" },
          { kind: "text", key: "cta_label", label: "CTA label" },
          { kind: "url", key: "cta_href", label: "CTA link" },
          { kind: "toggle", key: "highlighted", label: "Highlighted" },
        ],
      },
    ],
  },
  reach: {
    label: "Reach",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      {
        kind: "text",
        key: "items",
        label: "Items",
        list: true,
        itemFields: [
          { kind: "text", key: "label", label: "Label" },
          { kind: "text", key: "value", label: "Value" },
        ],
      },
    ],
  },
  life: {
    label: "Life",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      {
        kind: "text",
        key: "gallery",
        label: "Gallery",
        list: true,
        itemFields: [
          { kind: "image", key: "media_url", label: "Photo" },
          { kind: "text", key: "caption", label: "Caption" },
        ],
      },
    ],
  },
  paper_cta: {
    label: "Paper CTA",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "textarea", key: "body", label: "Body" },
      { kind: "group", key: "cta", label: "Call to action", fields: ctaFields },
    ],
  },
  contact: {
    label: "Contact",
    fields: [
      {
        kind: "select",
        key: "layout",
        label: "Layout",
        options: ["band", "page"],
      },
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "textarea", key: "body", label: "Body" },
      { kind: "text", key: "phone", label: "Phone" },
      { kind: "text", key: "email", label: "Email" },
      { kind: "textarea", key: "address", label: "Address" },
      { kind: "url", key: "map_url", label: "Map URL" },
      { kind: "toggle", key: "form_enabled", label: "Show map" },
      { kind: "toggle", key: "top_pad", label: "Extra top padding (standalone page)" },
      {
        kind: "group",
        key: "primary_btn",
        label: "Primary button",
        fields: [
          { kind: "text", key: "label", label: "Label" },
          { kind: "url", key: "href", label: "Link" },
          { kind: "text", key: "icon", label: "Icon name" },
        ],
      },
      {
        kind: "group",
        key: "secondary_btn",
        label: "Secondary button",
        fields: [
          { kind: "text", key: "label", label: "Label" },
          { kind: "url", key: "href", label: "Link" },
        ],
      },
      {
        kind: "group",
        key: "form",
        label: "Form (page layout)",
        fields: [
          {
            kind: "text",
            key: "fields",
            label: "Fields",
            list: true,
            itemFields: [
              { kind: "text", key: "key", label: "Field key" },
              { kind: "text", key: "label", label: "Label" },
              {
                kind: "select",
                key: "kind",
                label: "Kind",
                options: ["text", "email", "select", "textarea"],
              },
              { kind: "text", key: "placeholder", label: "Placeholder" },
              { kind: "text", key: "hint", label: "Hint" },
              { kind: "toggle", key: "required", label: "Required" },
              { kind: "toggle", key: "half", label: "Half width" },
            ],
          },
          { kind: "text", key: "submit_label", label: "Submit label" },
          { kind: "textarea", key: "footnote", label: "Footnote" },
          {
            kind: "group",
            key: "success",
            label: "Success panel",
            fields: [
              { kind: "text", key: "title", label: "Title" },
              { kind: "textarea", key: "body", label: "Body" },
              { kind: "text", key: "cta_label", label: "WhatsApp CTA label" },
            ],
          },
        ],
      },
      {
        kind: "text",
        key: "details",
        label: "Direct contact rows",
        list: true,
        itemFields: [
          { kind: "text", key: "icon", label: "Icon name" },
          { kind: "text", key: "label", label: "Label" },
          { kind: "text", key: "value", label: "Value" },
          { kind: "url", key: "href", label: "Link" },
        ],
      },
      {
        kind: "text",
        key: "hours",
        label: "Office hours",
        list: true,
        itemFields: [
          { kind: "text", key: "days", label: "Days" },
          { kind: "text", key: "time", label: "Time" },
        ],
      },
      { kind: "textarea", key: "hours_note", label: "Hours note" },
      {
        kind: "group",
        key: "office",
        label: "Visit us card",
        fields: [
          { kind: "text", key: "heading", label: "Heading" },
          { kind: "image", key: "photo_url", label: "Office photo" },
        ],
      },
      { kind: "text", key: "whatsapp", label: "Team WhatsApp number" },
    ],
  },
  footer: {
    label: "Footer",
    fields: [
      {
        kind: "text",
        key: "columns",
        label: "Columns",
        list: true,
        itemFields: [
          { kind: "text", key: "heading", label: "Heading" },
          {
            kind: "text",
            key: "links",
            label: "Links",
            list: true,
            itemFields: linkFields,
          },
        ],
      },
      {
        kind: "text",
        key: "social",
        label: "Social",
        list: true,
        itemFields: [
          { kind: "text", key: "icon", label: "Icon name" },
          { kind: "url", key: "href", label: "Link" },
        ],
      },
      { kind: "textarea", key: "copyright", label: "Copyright" },
    ],
  },
  band_table: {
    label: "Band scale table",
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "textarea", key: "lead", label: "Lead" },
      {
        kind: "text",
        key: "rows",
        label: "Band rows",
        list: true,
        itemFields: [
          { kind: "text", key: "band", label: "Band score" },
          { kind: "text", key: "color", label: "Badge background" },
          { kind: "text", key: "text_color", label: "Badge text colour" },
          { kind: "text", key: "title", label: "Title" },
          { kind: "textarea", key: "description", label: "Description" },
          { kind: "textarea", key: "used_for", label: "Where it is required" },
        ],
      },
      { kind: "textarea", key: "notes", label: "Footnotes (one per line)" },
      { kind: "text", key: "pad_top", label: "Padding top (px)" },
      { kind: "text", key: "pad_bottom", label: "Padding bottom (px)" },
    ],
  },
  faq: {
    label: "FAQ",
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "heading", label: "Heading" },
      {
        kind: "text",
        key: "items",
        label: "Questions",
        list: true,
        itemFields: [
          { kind: "text", key: "q", label: "Question" },
          { kind: "textarea", key: "a", label: "Answer" },
          { kind: "toggle", key: "open", label: "Open by default" },
        ],
      },
    ],
  },
  course_grid: {
    label: "Course grid",
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "textarea", key: "lead", label: "Lead" },
      {
        kind: "text",
        key: "courses",
        label: "Courses",
        list: true,
        itemFields: [
          { kind: "text", key: "icon", label: "Icon name" },
          {
            kind: "select",
            key: "icon_tone",
            label: "Icon colour",
            options: ["leaf", "sky", "amber", "coral", "vio"],
          },
          { kind: "text", key: "name", label: "Name" },
          { kind: "text", key: "price", label: "Price" },
          { kind: "text", key: "period", label: "Period" },
          { kind: "textarea", key: "blurb", label: "Blurb" },
          {
            kind: "text",
            key: "features",
            label: "Features",
            list: true,
            itemFields: [
              { kind: "text", key: "text", label: "Feature" },
              { kind: "toggle", key: "included", label: "Included" },
            ],
          },
          { kind: "text", key: "cta_label", label: "CTA label" },
          { kind: "url", key: "cta_href", label: "CTA link" },
          { kind: "toggle", key: "highlighted", label: "Highlighted" },
          { kind: "text", key: "ribbon", label: "Ribbon" },
        ],
      },
      { kind: "textarea", key: "footnote", label: "Footnote" },
    ],
  },
  uni_filter: {
    label: "University directory",
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "textarea", key: "lead", label: "Lead" },
      {
        kind: "text",
        key: "universities",
        label: "Universities",
        list: true,
        itemFields: [
          { kind: "text", key: "name", label: "Name" },
          { kind: "text", key: "country", label: "Country" },
          { kind: "text", key: "flag", label: "Flag emoji" },
          { kind: "text", key: "course", label: "Course line" },
          { kind: "text", key: "city", label: "City" },
          { kind: "text", key: "tuition", label: "Tuition / year" },
          { kind: "text", key: "intake", label: "Intakes" },
          { kind: "text", key: "per_skill", label: "Per-skill rule" },
          { kind: "text", key: "ielts", label: "IELTS" },
          { kind: "text", key: "toefl", label: "TOEFL" },
          { kind: "text", key: "rank", label: "QS rank" },
          { kind: "textarea", key: "note", label: "Note" },
          { kind: "image", key: "photo_url", label: "Campus photo" },
        ],
      },
    ],
  },
  data_table: {
    label: "Data table",
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "textarea", key: "intro", label: "Lead" },
      { kind: "text", key: "table_label", label: "Table label" },
      { kind: "textarea", key: "footnote", label: "Footnote" },
      { kind: "text", key: "pad_top", label: "Padding top (px)" },
      { kind: "text", key: "pad_bottom", label: "Padding bottom (px)" },
    ],
  },
  moments: {
    label: "Moments gallery",
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "textarea", key: "lead", label: "Lead" },
      {
        kind: "text",
        key: "items",
        label: "Moments",
        list: true,
        itemFields: [
          {
            kind: "select",
            key: "size",
            label: "Tile size",
            options: ["a", "b", "c", "d", "e", "f", "g"],
          },
          { kind: "image", key: "media_url", label: "Photo" },
          { kind: "text", key: "caption", label: "Caption" },
          { kind: "text", key: "sub", label: "Sub-caption" },
        ],
      },
      { kind: "textarea", key: "footnote", label: "Footnote" },
    ],
  },
  map_block: {
    label: "Map block",
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "textarea", key: "lead", label: "Lead" },
      { kind: "text", key: "min_height", label: "Min height (px)" },
      {
        kind: "text",
        key: "dots",
        label: "Ping dots",
        list: true,
        itemFields: [
          { kind: "text", key: "x", label: "Left (%)" },
          { kind: "text", key: "y", label: "Top (%)" },
          { kind: "text", key: "size", label: "Size (px)" },
          { kind: "text", key: "delay", label: "Pulse delay (s)" },
          { kind: "text", key: "color", label: "Colour" },
        ],
      },
      {
        kind: "group",
        key: "marker",
        label: "Labelled marker",
        fields: [
          { kind: "text", key: "x", label: "Left (%)" },
          { kind: "text", key: "y", label: "Top (%)" },
          { kind: "text", key: "label", label: "Label" },
        ],
      },
    ],
  },
  job_list: {
    label: "Job list",
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "textarea", key: "lead", label: "Lead" },
      { kind: "toggle", key: "mid", label: "Centre the heading" },
      {
        kind: "text",
        key: "jobs",
        label: "Roles",
        list: true,
        itemFields: [
          { kind: "text", key: "id", label: "Role id" },
          { kind: "text", key: "title", label: "Title" },
          { kind: "text", key: "dept", label: "Department" },
          { kind: "text", key: "dept_icon", label: "Dept icon" },
          { kind: "text", key: "office", label: "Office" },
          { kind: "text", key: "office_flag", label: "Office flag" },
          { kind: "text", key: "contract", label: "Contract" },
          { kind: "text", key: "ctc", label: "Salary tag" },
          { kind: "textarea", key: "need", label: "What we need" },
          { kind: "text", key: "posted", label: "Posted" },
          { kind: "text", key: "band", label: "Band" },
        ],
      },
      {
        kind: "group",
        key: "empty",
        label: "Empty state",
        fields: [
          { kind: "text", key: "heading", label: "Heading" },
          { kind: "textarea", key: "body", label: "Body" },
          { kind: "text", key: "cta_label", label: "CTA label" },
          { kind: "url", key: "cta_href", label: "CTA link" },
        ],
      },
    ],
  },
  job_form: {
    label: "Job application form",
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "textarea", key: "lead", label: "Lead" },
      { kind: "text", key: "tips_heading", label: "Tips card title" },
      {
        kind: "text",
        key: "tips",
        label: "Tips",
        list: true,
        itemFields: [
          { kind: "text", key: "title", label: "Title" },
          { kind: "textarea", key: "body", label: "Body" },
        ],
      },
      { kind: "textarea", key: "note", label: "Aside note" },
      {
        kind: "text",
        key: "roles",
        label: "Roles",
        list: true,
        itemFields: [
          { kind: "text", key: "id", label: "Role id" },
          { kind: "text", key: "title", label: "Title" },
        ],
      },
      {
        kind: "text",
        key: "offices",
        label: "Offices",
        list: true,
        itemFields: [
          { kind: "text", key: "id", label: "Office id" },
          { kind: "text", key: "label", label: "Label" },
        ],
      },
      {
        kind: "text",
        key: "countries",
        label: "Countries",
        list: true,
        itemFields: [{ kind: "text", key: "label", label: "Country" }],
      },
      {
        kind: "text",
        key: "examiner_options",
        label: "Examiner statuses",
        list: true,
        itemFields: [{ kind: "text", key: "label", label: "Status" }],
      },
      { kind: "text", key: "submit_label", label: "Submit label" },
      { kind: "textarea", key: "footnote", label: "Footnote" },
      {
        kind: "group",
        key: "success",
        label: "Success panel",
        fields: [
          { kind: "text", key: "title", label: "Title" },
          { kind: "textarea", key: "body", label: "Body" },
          { kind: "text", key: "cta_label", label: "WhatsApp CTA label" },
        ],
      },
      { kind: "text", key: "whatsapp", label: "HR WhatsApp number" },
    ],
  },
  blog_grid: {
    label: "Blog grid",
    fields: [
      {
        kind: "select",
        key: "variant",
        label: "Variant",
        options: ["tight", "paper", "dark"],
      },
      {
        kind: "text",
        key: "posts",
        label: "Posts",
        list: true,
        itemFields: [
          { kind: "text", key: "slug", label: "Slug" },
          { kind: "text", key: "title", label: "Title" },
          { kind: "text", key: "category", label: "Category" },
          { kind: "textarea", key: "excerpt", label: "Excerpt" },
          { kind: "text", key: "author", label: "Author" },
          { kind: "text", key: "date", label: "Date (ISO)" },
          { kind: "text", key: "read_minutes", label: "Minutes to read" },
          { kind: "toggle", key: "featured", label: "Featured" },
          { kind: "image", key: "hero_url", label: "Hero image" },
        ],
      },
      {
        kind: "group",
        key: "empty",
        label: "Empty state",
        fields: [
          { kind: "text", key: "title", label: "Title" },
          { kind: "text", key: "body", label: "Body" },
        ],
      },
    ],
  },
  blog_filter: {
    label: "Blog filter pills",
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "textarea", key: "lead", label: "Lead" },
      { kind: "text", key: "all_label", label: "All-pill label" },
      {
        kind: "text",
        key: "categories",
        label: "Categories",
        list: true,
        itemFields: [{ kind: "text", key: "label", label: "Label" }],
      },
    ],
  },
  auth_page: {
    label: "Auth page",
    fields: [
      {
        kind: "group",
        key: "brand",
        label: "Brand",
        fields: [
          { kind: "text", key: "name", label: "Name" },
          { kind: "text", key: "tagline", label: "Tagline" },
          { kind: "image", key: "logo_url", label: "Logo" },
          { kind: "url", key: "href", label: "Link" },
        ],
      },
      {
        kind: "group",
        key: "back_link",
        label: "Back link",
        fields: [
          { kind: "text", key: "label", label: "Label" },
          { kind: "url", key: "href", label: "Link" },
        ],
      },
      {
        kind: "group",
        key: "aside",
        label: "Aside panel",
        fields: [
          { kind: "text", key: "eyebrow", label: "Eyebrow" },
          { kind: "textarea", key: "heading", label: "Heading" },
          { kind: "textarea", key: "lead", label: "Lead" },
          {
            kind: "text",
            key: "features",
            label: "Features",
            list: true,
            itemFields: [
              { kind: "text", key: "icon", label: "Icon name" },
              { kind: "text", key: "title", label: "Title" },
              { kind: "textarea", key: "body", label: "Body" },
            ],
          },
          {
            kind: "group",
            key: "quote",
            label: "Quote",
            fields: [
              { kind: "textarea", key: "text", label: "Text" },
              { kind: "text", key: "author", label: "Author" },
            ],
          },
        ],
      },
      {
        kind: "text",
        key: "roles",
        label: "Sign-in roles",
        list: true,
        itemFields: [
          { kind: "text", key: "key", label: "Key" },
          { kind: "text", key: "name", label: "Name" },
          { kind: "text", key: "icon", label: "Icon name" },
          { kind: "text", key: "sub", label: "Sub-line" },
        ],
      },
      {
        kind: "group",
        key: "signin",
        label: "Sign-in mode",
        fields: [
          { kind: "text", key: "heading", label: "Heading" },
          { kind: "textarea", key: "lead", label: "Lead" },
          {
            kind: "text",
            key: "sso",
            label: "SSO buttons",
            list: true,
            itemFields: [
              { kind: "text", key: "provider", label: "Provider" },
              { kind: "text", key: "icon", label: "Icon name" },
            ],
          },
          { kind: "textarea", key: "demo_note", label: "Demo note" },
          { kind: "text", key: "footer_text", label: "Footer text" },
          {
            kind: "group",
            key: "footer_link",
            label: "Footer link",
            fields: [
              { kind: "text", key: "label", label: "Label" },
              { kind: "text", key: "mode", label: "Mode (login/signup/forgot)" },
            ],
          },
        ],
      },
      {
        kind: "group",
        key: "signup",
        label: "Sign-up mode",
        fields: [
          { kind: "text", key: "heading", label: "Heading" },
          { kind: "textarea", key: "lead", label: "Lead" },
          {
            kind: "text",
            key: "countries",
            label: "Countries",
            list: true,
            itemFields: [{ kind: "text", key: "label", label: "Label" }],
          },
          {
            kind: "text",
            key: "languages",
            label: "First languages",
            list: true,
            itemFields: [{ kind: "text", key: "label", label: "Label" }],
          },
          {
            kind: "text",
            key: "exams",
            label: "Exams",
            list: true,
            itemFields: [
              { kind: "text", key: "value", label: "Value" },
              { kind: "text", key: "label", label: "Label" },
            ],
          },
          {
            kind: "text",
            key: "plans",
            label: "Course plans",
            list: true,
            itemFields: [
              { kind: "text", key: "value", label: "Value" },
              { kind: "text", key: "label", label: "Label" },
            ],
          },
          { kind: "textarea", key: "terms", label: "Terms text" },
          { kind: "text", key: "submit_label", label: "Submit label" },
          { kind: "text", key: "footer_text", label: "Footer text" },
          {
            kind: "group",
            key: "footer_link",
            label: "Footer link",
            fields: [
              { kind: "text", key: "label", label: "Label" },
              { kind: "text", key: "mode", label: "Mode (login/signup/forgot)" },
            ],
          },
        ],
      },
      {
        kind: "group",
        key: "forgot",
        label: "Reset mode",
        fields: [
          { kind: "text", key: "heading", label: "Heading" },
          { kind: "textarea", key: "lead", label: "Lead" },
          { kind: "text", key: "submit_label", label: "Submit label" },
          { kind: "text", key: "success_heading", label: "Success heading" },
          { kind: "textarea", key: "success_body", label: "Success body" },
        ],
      },
    ],
  },
};

export const SECTION_TYPES = Object.keys(SECTION_REGISTRY);
