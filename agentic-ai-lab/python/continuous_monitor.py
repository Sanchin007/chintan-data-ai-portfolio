"""Continuous audit reference engine.

Deterministic, standard-library-only lifecycle logic for synthetic audit events.
A scheduler or event platform may invoke run_cycle(); this module does not
schedule itself or persist state. Production state belongs in a governed case
store with append-only events and authenticated actors.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from typing import Iterable


@dataclass(frozen=True)
class ControlPolicy:
    control_id: str
    version: str
    severity: str
    sla_hours: int
    specialist_role: str
    materiality: float = 0.0


@dataclass
class Finding:
    finding_id: str
    idempotency_key: str
    control_id: str
    control_version: str
    source_record_id: str
    event_key: str
    severity: str
    specialist_role: str
    detected_at: str
    last_seen_at: str
    due_at: str
    status: str = "OPEN"
    occurrence_count: int = 1
    escalation_level: int = 0
    evidence_refs: tuple[str, ...] = ()


def _utc(value: str | datetime) -> datetime:
    if isinstance(value, datetime):
        dt = value
    else:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        raise ValueError("Timestamps must include a timezone.")
    return dt.astimezone(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def stable_key(control_id: str, source_record_id: str, event_key: str) -> str:
    raw = "|".join((control_id.strip(), source_record_id.strip(), event_key.strip()))
    if not all((control_id.strip(), source_record_id.strip(), event_key.strip())):
        raise ValueError("control_id, source_record_id and event_key are required.")
    return sha256(raw.encode("utf-8")).hexdigest()


def run_cycle(
    events: Iterable[dict],
    policies: dict[str, ControlPolicy],
    existing: Iterable[Finding] = (),
    now: str | datetime | None = None,
) -> dict:
    """Upsert current signals by stable key and calculate SLA/escalation state.

    Event contract: control_id, source_record_id, event_key, detected_at,
    evidence_refs (optional). Existing finding state is never silently closed.
    """
    clock = _utc(now or datetime.now(timezone.utc))
    by_key = {f.idempotency_key: f for f in existing}
    created, refreshed, escalated, rejected = [], [], [], []

    for event in events:
        control_id = str(event.get("control_id", "")).strip()
        policy = policies.get(control_id)
        if not policy:
            rejected.append({"event": event, "reason": "NO_APPROVED_CONTROL_POLICY"})
            continue
        if policy.sla_hours <= 0:
            rejected.append({"event": event, "reason": "INVALID_SLA_POLICY"})
            continue
        detected = _utc(event["detected_at"])
        if detected > clock:
            rejected.append({"event": event, "reason": "FUTURE_DETECTION_TIMESTAMP"})
            continue
        source_id = str(event.get("source_record_id", "")).strip()
        event_key = str(event.get("event_key", "")).strip()
        key = stable_key(control_id, source_id, event_key)
        evidence = tuple(sorted(set(map(str, event.get("evidence_refs", [])))))
        current = by_key.get(key)

        if current:
            current.last_seen_at = _iso(clock)
            current.occurrence_count += 1
            current.evidence_refs = tuple(sorted(set(current.evidence_refs).union(evidence)))
            refreshed.append(current.finding_id)
        else:
            fid = "FND-" + key[:16].upper()
            current = Finding(
                finding_id=fid,
                idempotency_key=key,
                control_id=control_id,
                control_version=policy.version,
                source_record_id=source_id,
                event_key=event_key,
                severity=policy.severity.upper(),
                specialist_role=policy.specialist_role,
                detected_at=_iso(detected),
                last_seen_at=_iso(clock),
                due_at=_iso(detected + timedelta(hours=policy.sla_hours)),
                evidence_refs=evidence,
            )
            by_key[key] = current
            created.append(fid)

        age_hours = (clock - _utc(current.detected_at)).total_seconds() / 3600
        overdue_hours = (clock - _utc(current.due_at)).total_seconds() / 3600
        target_level = 2 if overdue_hours >= 24 else 1 if overdue_hours >= 0 else 0
        if current.status not in {"CLOSED", "REJECTED"} and target_level > current.escalation_level:
            current.escalation_level = target_level
            current.status = "ESCALATED" if target_level else current.status
            escalated.append({
                "finding_id": current.finding_id,
                "level": target_level,
                "age_hours": round(age_hours, 2),
                "overdue_hours": round(max(0, overdue_hours), 2),
                "route_to": policy.specialist_role,
            })

    findings = list(by_key.values())
    return {
        "cycle_at": _iso(clock),
        "created_count": len(created),
        "refreshed_count": len(refreshed),
        "escalated_count": len(escalated),
        "rejected_count": len(rejected),
        "created": created,
        "refreshed": refreshed,
        "escalations": escalated,
        "rejected": rejected,
        "findings": [asdict(f) for f in findings],
        "limitations": [
            "In-memory reference engine; caller must persist append-only events and findings.",
            "SLA uses elapsed hours, not business calendars or local holidays.",
            "A signal is not a confirmed control failure; a human reviewer owns disposition.",
            "No scheduler, notification transport, identity provider or enterprise source is connected.",
        ],
    }


def record_human_disposition(finding: Finding, action: str, actor: str, rationale: str) -> dict:
    allowed = {"VERIFIED", "EVIDENCE_REQUESTED", "ESCALATED", "REJECTED", "REOPENED"}
    if action not in allowed:
        raise ValueError(f"Unsupported disposition: {action}")
    if not actor.strip() or not rationale.strip():
        raise ValueError("Authenticated actor and rationale are required.")
    previous = finding.status
    if action == "REOPENED":
        finding.status = "OPEN"
        finding.escalation_level = 0
    else:
        finding.status = action
    return {
        "finding_id": finding.finding_id,
        "actor": actor,
        "timestamp": _iso(datetime.now(timezone.utc)),
        "previous_status": previous,
        "new_status": finding.status,
        "rationale": rationale,
        "note": "Reviewer action only; verified does not mean legal clearance or final audit sign-off.",
    }


if __name__ == "__main__":
    policies = {
        "SUPPLIER_BANK_CHANGE": ControlPolicy(
            "SUPPLIER_BANK_CHANGE", "1.0", "HIGH", 8, "Finance controls specialist"
        ),
        "EXPORT_DOC_GAP": ControlPolicy(
            "EXPORT_DOC_GAP", "1.0", "HIGH", 2, "Trade compliance specialist"
        ),
        "PRICING_VARIANCE": ControlPolicy(
            "PRICING_VARIANCE", "1.0", "MEDIUM", 120, "Commercial controls reviewer"
        ),
    }
    demo_events = [
        {"control_id": "SUPPLIER_BANK_CHANGE", "source_record_id": "SUP-81",
         "event_key": "PAYMENT-771", "detected_at": "2026-11-07T08:00:00Z",
         "evidence_refs": ["SUP-81-CHANGE", "PAYMENT-771"]},
        {"control_id": "EXPORT_DOC_GAP", "source_record_id": "EXP-2041",
         "event_key": "DOC-COMPLETENESS-1", "detected_at": "2026-11-07T08:00:00Z",
         "evidence_refs": ["EXP-2041"]},
    ]
    print(__import__("json").dumps(run_cycle(demo_events, policies, now="2026-11-07T12:00:00Z"), indent=2))
