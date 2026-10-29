"""Shared enum types for the Bloom schema.

Postgres-native enums are used for fixed domain vocabularies. Enum *values*
(the strings stored in the DB) match the vocabulary used in the approved
proposal and the FMAHTML prototype so the API contract reads naturally.
"""

from __future__ import annotations

import enum


class StrEnum(enum.StrEnum):
    """str-Enum that serialises to its value in JSON and DB."""


class UserRole(StrEnum):
    student = "student"
    teacher = "teacher"
    admin = "admin"


class ExamTrack(StrEnum):
    """Exam tracks assignable to students (proposal §2.2)."""

    ielts_academic = "ielts-a"
    ielts_general = "ielts-g"
    toefl = "toefl"
    pte = "pte"
    duolingo = "duolingo"
    cambridge = "cambridge"
    oet = "oet"


class EnquiryStatus(StrEnum):
    """Enquiry lifecycle as shown in the admin enquiry inbox (FMAHTML spec)."""

    new = "new"
    contacted = "contacted"
    converted = "converted"
    closed = "closed"


class ApplicationStage(StrEnum):
    """Hiring pipeline stages (prototype bloom-data-hr.js HIRE_STAGES)."""

    applied = "applied"
    screen = "screen"
    demo = "demo"
    interview = "interview"
    offer = "offer"
    hired = "hired"
    declined = "declined"


class CmsStatus(StrEnum):
    draft = "draft"
    published = "published"


class OtpChannel(StrEnum):
    phone = "phone"
    email = "email"
