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
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "textarea", key: "body", label: "Body" },
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
    ],
  },
  steps: {
    label: "Steps",
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "heading", label: "Heading" },
      {
        kind: "text",
        key: "steps",
        label: "Steps",
        list: true,
        itemFields: [
          { kind: "text", key: "n", label: "Number" },
          { kind: "text", key: "title", label: "Title" },
          { kind: "textarea", key: "body", label: "Body" },
        ],
      },
    ],
  },
  feature_grid: {
    label: "Feature grid",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
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
    ],
  },
  showcase: {
    label: "Showcase",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "textarea", key: "body", label: "Body" },
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
    ],
  },
  certificate_list: {
    label: "Certificates",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      {
        kind: "text",
        key: "items",
        label: "Items",
        list: true,
        itemFields: [
          { kind: "text", key: "name", label: "Name" },
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
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "textarea", key: "body", label: "Body" },
      { kind: "text", key: "phone", label: "Phone" },
      { kind: "text", key: "email", label: "Email" },
      { kind: "textarea", key: "address", label: "Address" },
      { kind: "url", key: "map_url", label: "Map URL" },
      { kind: "toggle", key: "form_enabled", label: "Show map" },
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
          { kind: "text", key: "score", label: "Band score" },
          { kind: "text", key: "bg", label: "Badge background" },
          { kind: "text", key: "color", label: "Badge text colour" },
          { kind: "text", key: "title", label: "Title" },
          { kind: "textarea", key: "body", label: "Description" },
          { kind: "textarea", key: "usage", label: "Where it is required" },
        ],
      },
      {
        kind: "text",
        key: "footnotes",
        label: "Footnotes",
        list: true,
        itemFields: [
          { kind: "text", key: "label", label: "Label" },
          { kind: "text", key: "text", label: "Text" },
        ],
      },
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
          { kind: "text", key: "question", label: "Question" },
          { kind: "textarea", key: "answer", label: "Answer" },
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
          { kind: "text", key: "name", label: "Name" },
          { kind: "textarea", key: "blurb", label: "Blurb" },
          { kind: "text", key: "level", label: "Level tag" },
          { kind: "text", key: "weeks", label: "Weeks" },
          { kind: "text", key: "tier", label: "Tier tag" },
          { kind: "text", key: "price", label: "Price" },
        ],
      },
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
      { kind: "textarea", key: "lead", label: "Lead" },
      {
        kind: "text",
        key: "columns",
        label: "Columns",
        list: true,
        itemFields: [{ kind: "text", key: "label", label: "Label" }],
      },
      {
        kind: "text",
        key: "rows",
        label: "Rows",
        list: true,
        itemFields: [
          {
            kind: "text",
            key: "cells",
            label: "Cells",
            list: true,
            itemFields: [
              { kind: "text", key: "text", label: "Text" },
              { kind: "text", key: "sub", label: "Sub-line" },
              { kind: "toggle", key: "bold", label: "Bold" },
              { kind: "toggle", key: "mono", label: "Monospace" },
            ],
          },
        ],
      },
      { kind: "textarea", key: "footnote", label: "Footnote" },
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
      {
        kind: "text",
        key: "jobs",
        label: "Roles",
        list: true,
        itemFields: [
          { kind: "text", key: "icon", label: "Icon name" },
          { kind: "text", key: "title", label: "Title" },
          { kind: "text", key: "department", label: "Department tag" },
          { kind: "text", key: "office", label: "Office tag" },
          { kind: "text", key: "contract", label: "Contract tag" },
          { kind: "text", key: "ctc", label: "Salary tag" },
          { kind: "textarea", key: "summary", label: "What we need" },
          { kind: "text", key: "posted", label: "Posted" },
          { kind: "text", key: "band", label: "Band" },
          { kind: "text", key: "apply_label", label: "Apply label" },
          { kind: "url", key: "apply_href", label: "Apply link" },
        ],
      },
      { kind: "text", key: "empty_heading", label: "Empty heading" },
      { kind: "textarea", key: "empty_body", label: "Empty body" },
      { kind: "text", key: "empty_cta_label", label: "Empty CTA label" },
      { kind: "url", key: "empty_cta_href", label: "Empty CTA link" },
    ],
  },
  job_form: {
    label: "Job application form",
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "textarea", key: "lead", label: "Lead" },
      { kind: "text", key: "tips_title", label: "Tips card title" },
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
      { kind: "textarea", key: "aside_note", label: "Aside note" },
      {
        kind: "text",
        key: "roles",
        label: "Roles",
        list: true,
        itemFields: [{ kind: "text", key: "label", label: "Label" }],
      },
      {
        kind: "text",
        key: "countries",
        label: "Countries",
        list: true,
        itemFields: [{ kind: "text", key: "label", label: "Label" }],
      },
      {
        kind: "text",
        key: "offices",
        label: "Offices",
        list: true,
        itemFields: [{ kind: "text", key: "label", label: "Label" }],
      },
      {
        kind: "text",
        key: "examiner_statuses",
        label: "Examiner statuses",
        list: true,
        itemFields: [{ kind: "text", key: "label", label: "Label" }],
      },
      { kind: "text", key: "submit_label", label: "Submit label" },
      { kind: "textarea", key: "footnote", label: "Footnote" },
      { kind: "text", key: "whatsapp", label: "HR WhatsApp number" },
    ],
  },
  blog_grid: {
    label: "Blog grid",
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "textarea", key: "lead", label: "Lead" },
      {
        kind: "text",
        key: "posts",
        label: "Posts",
        list: true,
        itemFields: [
          { kind: "text", key: "cat", label: "Category" },
          { kind: "text", key: "title", label: "Title" },
          { kind: "textarea", key: "excerpt", label: "Excerpt" },
          { kind: "text", key: "author", label: "Author" },
          { kind: "text", key: "date", label: "Date" },
          { kind: "text", key: "read", label: "Minutes to read" },
          { kind: "toggle", key: "featured", label: "Featured" },
          { kind: "image", key: "hero_url", label: "Hero image" },
          { kind: "url", key: "href", label: "Link" },
        ],
      },
    ],
  },
  blog_filter: {
    label: "Blog filter pills",
    fields: [
      {
        kind: "text",
        key: "categories",
        label: "Categories",
        list: true,
        itemFields: [
          { kind: "text", key: "name", label: "Name" },
          { kind: "text", key: "count", label: "Count" },
        ],
      },
    ],
  },
  auth_page: {
    label: "Auth page",
    fields: [
      { kind: "text", key: "brand_name", label: "Brand name" },
      { kind: "text", key: "brand_tagline", label: "Brand tagline" },
      { kind: "image", key: "logo_url", label: "Logo" },
      { kind: "url", key: "home_href", label: "Home link" },
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "textarea", key: "heading", label: "Heading" },
      { kind: "textarea", key: "lead", label: "Lead" },
      {
        kind: "text",
        key: "features",
        label: "Aside features",
        list: true,
        itemFields: [
          { kind: "text", key: "icon", label: "Icon name" },
          { kind: "text", key: "title", label: "Title" },
          { kind: "textarea", key: "body", label: "Body" },
        ],
      },
      { kind: "textarea", key: "quote", label: "Quote" },
      { kind: "text", key: "quote_author", label: "Quote author" },
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
      { kind: "text", key: "notice", label: "Submit notice" },
    ],
  },
};

export const SECTION_TYPES = Object.keys(SECTION_REGISTRY);
