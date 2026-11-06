"""Ocean Intelligence — reusable synthetic audit analytics.
Run: python analytics.py
Standard library only. Reads embedded synthetic records and prints JSON results.
This is executable reference logic, not connected to an enterprise data platform.
"""
from __future__ import annotations
import json
import statistics
import hashlib
from datetime import date, datetime
from collections import defaultdict

AP = [
    {"id":"AP-301","supplier":"Northstar Marine","invoice":"INV-771","amount":184200,"po":"PO-810","paid":True},
    {"id":"AP-302","supplier":"Northstar Marine","invoice":"INV-771-R","amount":184200,"po":"PO-810","paid":False},
    {"id":"AP-303","supplier":"Delta Port Tech","invoice":"INV-882","amount":42600,"po":"PO-811","paid":True},
]
POS = [
    {"id":"PO-4101","supplier":"BlueHarbor Logistics","requester":"R-8","day":"2026-10-02","amount":48600},
    {"id":"PO-4102","supplier":"BlueHarbor Logistics","requester":"R-8","day":"2026-10-03","amount":47200},
    {"id":"PO-4103","supplier":"BlueHarbor Logistics","requester":"R-8","day":"2026-10-04","amount":48900},
]
SUPPLIER_CHANGES = [
    {"supplier":"Northstar Marine","hours_before_payment":24,"amount":218000,"callback":False,"dual_approval":False},
    {"supplier":"Delta Port Tech","hours_before_payment":432,"amount":32000,"callback":True,"dual_approval":True},
]
LANES = [
    {"lane":"Asia-Med","revenue":6.2,"cost":5.8,"discount":.18},
    {"lane":"Asia-North Europe","revenue":8.4,"cost":7.1,"discount":.07},
    {"lane":"Med-West Africa","revenue":4.8,"cost":3.5,"discount":.05},
]
VESSELS = [
    {"vessel":"MV Meridian","class":"A","lane":"Asia-Med","utilisation":.64,"delay_hours":7},
    {"vessel":"MV Horizon","class":"A","lane":"Asia-Med","utilisation":.91,"delay_hours":18},
    {"vessel":"MV Atlantic","class":"B","lane":"North Europe-US","utilisation":.86,"delay_hours":3},
]
PORT_CALLS = [
    {"voyage":"VOY-771","port":"Singapore","planned_hours":18,"actual_hours":42,"buffer_hours":12},
    {"voyage":"VOY-772","port":"Colombo","planned_hours":10,"actual_hours":16,"buffer_hours":20},
]
QUALITY_ROWS = [
    {"id":"D-1001","supplier":"SUP-81","currency":"EUR","amount":12500},
    {"id":"D-1002","supplier":"SUP-82","currency":"XXX","amount":9200},
    {"id":"D-1003","supplier":"","currency":"EUR","amount":4800},
    {"id":"D-1003","supplier":"SUP-84","currency":"USD","amount":6200},
]

def invoice_candidates(rows=AP):
    out=[]
    for i,a in enumerate(rows):
        for b in rows[i+1:]:
            same=(a["supplier"],a["amount"],a["po"])==(b["supplier"],b["amount"],b["po"])
            if same:
                out.append({"records":[a["id"],b["id"]],"both_paid":a["paid"] and b["paid"],
                            "classification":"potential_duplicate_invoice",
                            "payment_loss_proven":False})
    return out

def procurement_clusters(rows=POS, threshold=50000, window_days=7):
    groups=defaultdict(list)
    for row in rows:
        groups[(row["supplier"],row["requester"])].append((date.fromisoformat(row["day"]),row))
    out=[]
    seen=set()
    for key,items in groups.items():
        items.sort(key=lambda x:x[0])
        for start,(start_day,_) in enumerate(items):
            cluster=[row for day,row in items[start:] if 0 <= (day-start_day).days <= window_days]
            if len(cluster)<2 or not all(row["amount"]<threshold for row in cluster):
                continue
            ids=tuple(sorted(row["id"] for row in cluster))
            if ids in seen:
                continue
            seen.add(ids)
            total=sum(row["amount"] for row in cluster)
            if total>threshold:
                out.append({"supplier":key[0],"requester":key[1],"po_ids":list(ids),
                            "window_days":window_days,"aggregate_amount":total,
                            "threshold":threshold,"status":"review_business_purpose_and_policy"})
    return out

def supplier_change_risk(rows=SUPPLIER_CHANGES):
    return [{"supplier":r["supplier"],"signal":0<=r["hours_before_payment"]<=72 and
             r["amount"]>=50000 and (not r["callback"] or not r["dual_approval"]),
             "fraud_conclusion":None} for r in rows]

def pricing_outliers(rows=LANES, margin_floor=.08, discount_ceiling=.12):
    out=[]
    for r in rows:
        margin=(r["revenue"]-r["cost"])/r["revenue"]
        signals=[]
        if margin<margin_floor: signals.append("margin_below_demo_floor")
        if r["discount"]>discount_ceiling: signals.append("discount_above_demo_ceiling")
        out.append({"lane":r["lane"],"contribution_margin":round(margin,4),"signals":signals})
    return out

def fleet_cohort_outliers(rows=VESSELS, gap=.10):
    cohorts=defaultdict(list)
    for r in rows: cohorts[(r["class"],r["lane"])].append(r)
    out=[]
    for key,items in cohorts.items():
        baseline=statistics.mean(x["utilisation"] for x in items)
        for r in items:
            if baseline-r["utilisation"]>=gap:
                out.append({"vessel":r["vessel"],"cohort_mean":round(baseline,3),
                            "utilisation_gap":round(r["utilisation"]-baseline,3),
                            "causality_established":False})
    return out

def port_buffer_exposure(rows=PORT_CALLS):
    return [{"voyage":r["voyage"],"delay_hours":r["actual_hours"]-r["planned_hours"],
             "buffer_breach_hours":max(0,r["actual_hours"]-r["planned_hours"]-r["buffer_hours"])}
            for r in rows]

def data_quality_gate(rows=QUALITY_ROWS):
    counts=defaultdict(int)
    for r in rows: counts[r["id"]]+=1
    issues=[]
    for r in rows:
        flags=[]
        if not r["supplier"]: flags.append("missing_supplier")
        if r["currency"] not in {"EUR","USD","GBP","INR","SGD"}: flags.append("invalid_currency")
        if r["amount"] is None or r["amount"]<0: flags.append("invalid_amount")
        if counts[r["id"]]>1: flags.append("duplicate_record_id")
        if flags: issues.append({"record_id":r["id"],"issues":flags,"critical":True})
    return {"status":"BLOCK" if issues else "PASS","issues":issues}

def continuous_audit_cycle():
    events=[("AP_DUPLICATE","AP-301","HIGH","RUN-001"),("SUPPLIER_CHANGE","SUP-81","HIGH","RUN-001"),
            ("PO_THRESHOLD","PO-4101","MEDIUM","RUN-001"),("LANE_MARGIN","ASIA-MED","MEDIUM","RUN-001")]
    return [{"alert_key":hashlib.sha256("|".join(x[:2]).encode("utf-8")).hexdigest(),
             "control_id":x[0],"source_id":x[1],"run_id":x[3],
             "severity":x[2],"status":"OPEN"} for x in events]

def main():
    result={"ap_duplicate_candidates":invoice_candidates(),
            "procurement_clusters":procurement_clusters(),
            "supplier_change_risk":supplier_change_risk(),
            "pricing_outliers":pricing_outliers(),
            "fleet_cohort_outliers":fleet_cohort_outliers(),
            "port_buffer_exposure":port_buffer_exposure(),
            "data_quality_gate":data_quality_gate(),
            "continuous_audit_cycle":continuous_audit_cycle()}
    print(json.dumps(result,indent=2))

if __name__=="__main__":
    main()
