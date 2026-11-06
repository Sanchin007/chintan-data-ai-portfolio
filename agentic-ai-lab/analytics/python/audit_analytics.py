"""Reproducible audit analytics reference routines over supplied CSV extracts.
Outputs are candidate indicators only; no fraud or control conclusion is produced.
"""
from __future__ import annotations
import argparse, json
from pathlib import Path
from typing import Any
import pandas as pd


def _as_bool(value: Any) -> bool:
    return False if pd.isna(value) else bool(value)


def _clean(value: Any) -> Any:
    return None if pd.isna(value) else value


def profile_dataset(name: str, frame: pd.DataFrame) -> dict[str, Any]:
    blank = frame.isna().sum().sum() + frame.astype("string").eq("").sum().sum()
    return {"dataset": name, "row_count": int(len(frame)),
            "column_count": int(len(frame.columns)), "blank_cell_count": int(blank),
            "exact_duplicate_row_count": int(frame.duplicated().sum()),
            "columns": list(frame.columns),
            "interpretation": "Blank fields require a field-level data contract; some blanks may be conditionally valid."}


def duplicate_invoice_candidates(invoices: pd.DataFrame, window_days: int = 90) -> list[dict[str, Any]]:
    required = {"invoice_id","supplier_id","invoice_number","amount","currency","invoice_date","paid","payment_reference"}
    if missing := required.difference(invoices.columns):
        raise ValueError(f"Invoice dataset missing columns: {sorted(missing)}")
    df = invoices.copy()
    df["invoice_date"] = pd.to_datetime(df["invoice_date"], errors="coerce")
    df["invoice_norm"] = df["invoice_number"].astype("string").str.upper().str.replace(r"[^A-Z0-9]","",regex=True)
    df = df.dropna(subset=["invoice_date","amount","invoice_norm"])
    output = []
    keys = ["supplier_id","invoice_norm","amount","currency"]
    for _, group in df.sort_values("invoice_date").groupby(keys, dropna=False):
        rows = group.to_dict("records")
        for i, left in enumerate(rows):
            for right in rows[i+1:]:
                gap = abs((right["invoice_date"]-left["invoice_date"]).days)
                if gap > window_days: continue
                both_paid = _as_bool(left["paid"]) and _as_bool(right["paid"])
                both_refs = bool(_clean(left["payment_reference"])) and bool(_clean(right["payment_reference"]))
                output.append({"finding_type":"duplicate_invoice_candidate",
                    "invoice_ids":[left["invoice_id"],right["invoice_id"]],
                    "supplier_id":left["supplier_id"],"invoice_number_normalized":left["invoice_norm"],
                    "amount":float(left["amount"]),"currency":left["currency"],"date_gap_days":int(gap),
                    "payment_references":[_clean(left["payment_reference"]),_clean(right["payment_reference"])],
                    "candidate_type":"possible_duplicate_payment" if both_paid and both_refs else "duplicate_invoice_candidate_payment_not_confirmed",
                    "review_required":True})
    return output


def procurement_threshold_candidates(pos: pd.DataFrame, approval_threshold: float, window_days: int = 7) -> list[dict[str, Any]]:
    required = {"po_id","supplier_id","requester_id","cost_centre","project_code","created_at","amount"}
    if missing := required.difference(pos.columns):
        raise ValueError(f"Purchase-order dataset missing columns: {sorted(missing)}")
    df = pos.copy()
    df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce")
    df = df.dropna(subset=["created_at","amount"])
    groups = ["supplier_id","requester_id","cost_centre","project_code"]
    output, seen = [], set()
    for key, group in df.sort_values("created_at").groupby(groups, dropna=False):
        rows = group.to_dict("records")
        for start in rows:
            end = start["created_at"] + pd.Timedelta(days=window_days)
            cluster = [r for r in rows if start["created_at"] <= r["created_at"] <= end]
            ids = tuple(sorted(str(r["po_id"]) for r in cluster))
            if len(cluster)<2 or ids in seen or not all(float(r["amount"])<approval_threshold for r in cluster): continue
            total = sum(float(r["amount"]) for r in cluster)
            if total < approval_threshold: continue
            seen.add(ids)
            output.append({"finding_type":"approval_threshold_clustering_indicator","po_ids":list(ids),
                "group":dict(zip(groups,key if isinstance(key,tuple) else (key,))),
                "aggregate_amount":total,"illustrative_threshold":float(approval_threshold),
                "window_days":int(window_days),"review_required":True,
                "caveat":"Shared attributes do not prove one underlying purchase need."})
    # Remove nested rolling windows so one PO cluster is not reported multiple times.
    candidate_sets = [set(item["po_ids"]) for item in output]
    return [
        item for i, item in enumerate(output)
        if not any(candidate_sets[i] < other for j, other in enumerate(candidate_sets) if i != j)
    ]


def supplier_change_to_payment_candidates(changes: pd.DataFrame, payments: pd.DataFrame,
                                          high_value_threshold: float, lookback_days: int = 30) -> list[dict[str, Any]]:
    cr={"change_id","supplier_id","change_date","callback_verified","dual_approved"}
    pr={"payment_id","supplier_id","payment_date","amount"}
    if missing:=cr.difference(changes.columns): raise ValueError(f"Supplier-change dataset missing columns: {sorted(missing)}")
    if missing:=pr.difference(payments.columns): raise ValueError(f"Payment dataset missing columns: {sorted(missing)}")
    c,p=changes.copy(),payments.copy()
    c["change_date"]=pd.to_datetime(c["change_date"],errors="coerce")
    p["payment_date"]=pd.to_datetime(p["payment_date"],errors="coerce")
    joined=c.merge(p,on="supplier_id",how="inner")
    joined["days_to_payment"]=(joined["payment_date"]-joined["change_date"]).dt.days
    selected=joined[joined["days_to_payment"].between(0,lookback_days)&
        (joined["amount"]>=high_value_threshold)&
        (~joined["callback_verified"].fillna(False).astype(bool)|~joined["dual_approved"].fillna(False).astype(bool))]
    return [{"finding_type":"supplier_change_to_payment_control_candidate","change_id":r.change_id,
        "payment_id":r.payment_id,"supplier_id":r.supplier_id,"days_to_payment":int(r.days_to_payment),
        "amount":float(r.amount),"callback_verified":_as_bool(r.callback_verified),
        "dual_approved":_as_bool(r.dual_approved),"review_required":True} for r in selected.itertuples(index=False)]


def pricing_variance_candidates(pricing: pd.DataFrame, material_discount_gap_pct: float = 5.0) -> list[dict[str, Any]]:
    required={"lane","revenue","cost","discount_pct","approved_discount_pct","volume"}
    if missing:=required.difference(pricing.columns): raise ValueError(f"Pricing dataset missing columns: {sorted(missing)}")
    df=pricing.copy()
    df["margin_pct"]=(df["revenue"]-df["cost"])/df["revenue"].where(df["revenue"]!=0)*100
    df["discount_gap_pct"]=df["discount_pct"]-df["approved_discount_pct"]
    selected=df[df["discount_gap_pct"]>=material_discount_gap_pct]
    return [{"finding_type":"discount_authority_variance","lane":r.lane,
        "margin_pct":round(float(r.margin_pct),2),"discount_pct":float(r.discount_pct),
        "approved_discount_pct":float(r.approved_discount_pct),"discount_gap_pct":round(float(r.discount_gap_pct),2),
        "volume":float(r.volume),"review_required":True,
        "caveat":"Contract version, volume mix and approval context are not inferred."} for r in selected.itertuples(index=False)]


def fleet_utilisation_candidates(fleet: pd.DataFrame, minimum_gap_pct: float = 10.0) -> list[dict[str, Any]]:
    required={"asset_id","cohort","utilisation_pct","benchmark_pct","cost_per_unit"}
    if missing:=required.difference(fleet.columns): raise ValueError(f"Fleet dataset missing columns: {sorted(missing)}")
    df=fleet.copy(); df["benchmark_gap_pct"]=df["benchmark_pct"]-df["utilisation_pct"]
    selected=df[df["benchmark_gap_pct"]>=minimum_gap_pct]
    return [{"finding_type":"fleet_utilisation_outlier","asset_id":r.asset_id,"cohort":r.cohort,
        "utilisation_pct":float(r.utilisation_pct),"benchmark_pct":float(r.benchmark_pct),
        "benchmark_gap_pct":round(float(r.benchmark_gap_pct),1),"cost_per_unit":float(r.cost_per_unit),
        "review_required":True,"caveat":"Validate route, maintenance, seasonality, schedule and demand context."}
        for r in selected.itertuples(index=False)]


def run_all(folder: Path) -> dict[str, Any]:
    load=lambda name: pd.read_csv(folder/f"{name}.csv")
    invoices,pos,changes,payments,pricing,fleet=map(load,["invoices","purchase_orders","supplier_changes","payments","pricing","fleet"])
    return {"environment":"synthetic_csv_reference",
        "data_quality":{n:profile_dataset(n,d) for n,d in {
            "invoices":invoices,"purchase_orders":pos,"supplier_changes":changes,
            "payments":payments,"pricing":pricing,"fleet":fleet}.items()},
        "tests":{
            "duplicate_invoice_candidates":duplicate_invoice_candidates(invoices),
            "procurement_threshold_candidates":procurement_threshold_candidates(pos,25000,7),
            "supplier_change_to_payment_candidates":supplier_change_to_payment_candidates(changes,payments,80000,30),
            "pricing_variance_candidates":pricing_variance_candidates(pricing,5),
            "fleet_utilisation_candidates":fleet_utilisation_candidates(fleet,10)},
        "decision_boundary":"Indicators only. Validate source records and control criteria; no fraud, loss, legal or compliance conclusion."}


def main():
    parser=argparse.ArgumentParser(description="Run synthetic audit analytics reference tests.")
    parser.add_argument("--data-dir",type=Path,default=Path(__file__).parent/"sample_data")
    args=parser.parse_args()
    print(json.dumps(run_all(args.data_dir),indent=2,default=str))


if __name__=="__main__": main()
