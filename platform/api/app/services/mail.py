"""Mail domain service — username availability + mirror-row helpers (TEC-184)."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.integrations import mail_api
from app.models.mailbox import Mailbox


def username_available(
    db: Session, provisioner: mail_api.MailProvisioner, raw_localpart: str
) -> tuple[bool | None, str]:
    """(available, reason) — reason ∈ available|taken|invalid|reserved|unavailable.

    Order matters: naming rules are free, the mirror table is cheap, and only
    then the provider call (the contract's check_username).
    """
    localpart = mail_api.normalize_localpart(raw_localpart)
    if error := mail_api.localpart_error(localpart):
        return False, error
    claimed = db.scalar(select(Mailbox.id).where(Mailbox.localpart == localpart))
    if claimed is not None:
        return False, "taken"
    try:
        free = provisioner.check_username(localpart)
    except mail_api.MailError:
        # Advisory path — the caller treats this as "can't tell right now";
        # signup itself is still safe (DB unique + queued provisioning).
        return None, "unavailable"
    return (True, "available") if free else (False, "taken")
