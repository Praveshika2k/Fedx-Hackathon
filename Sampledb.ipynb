import pandas as pd
import numpy as np
import uuid

np.random.seed(42)

# ---------- CASES ----------
n_cases = 1000

cases = pd.DataFrame({
    "case_id": [str(uuid.uuid4()) for _ in range(n_cases)],
    "customer_id": [str(uuid.uuid4()) for _ in range(n_cases)],
    "invoice_amount": np.random.randint(5000, 500000, n_cases),
    "ageing_days": np.random.randint(1, 180, n_cases),
    "past_payment_score": np.round(np.random.uniform(0, 1, n_cases), 2),
    "customer_rating": np.round(np.random.uniform(0, 1, n_cases), 2),
    "business_priority": np.round(np.random.uniform(0.5, 2.0, n_cases), 2),
    "geo": np.random.choice(["NA", "EU", "APAC"], n_cases),
    "industry": np.random.choice(["Retail", "Manufacturing", "Healthcare", "Tech"], n_cases)
})

cases["risk_tier"] = pd.cut(
    cases["ageing_days"],
    bins=[0,30,90,180],
    labels=["Low","Medium","High"]
)

# Recovery label (proxy for ML training)
cases["recovery_label"] = (
    (cases["past_payment_score"] * 0.4 +
     cases["customer_rating"] * 0.4 -
     cases["ageing_days"] / 200) > 0.3
).astype(int)

# ---------- DCA PROFILES ----------
n_dcas = 10

dcas = pd.DataFrame({
    "dca_id": [str(uuid.uuid4()) for _ in range(n_dcas)],
    "dca_name": [f"DCA_{i}" for i in range(n_dcas)],
    "historical_recovery_rate": np.round(np.random.uniform(0.5, 0.9, n_dcas), 2),
    "specialization_match": np.round(np.random.uniform(0.6, 1.0, n_dcas), 2),
    "geo_match": np.round(np.random.uniform(0.6, 1.0, n_dcas), 2),
    "active_case_load": np.random.randint(50, 500, n_dcas),
    "load_penalty": np.round(np.random.uniform(0.1, 0.5, n_dcas), 2),
    "compliance_risk": np.round(np.random.uniform(0.0, 0.3, n_dcas), 2)
})

dcas["compliance_score"] = (1 - dcas["compliance_risk"]) * 100

cases.head(), dcas.head()
