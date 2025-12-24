#!/usr/bin/env python3
"""
Train / score ML models for firm and entrepreneur predictions and write results to Supabase.

Run:
    python ml/train_and_predict.py

Behavior:
 - Loads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from ml/.env
 - Validates that required tables exist (firmalar, girisimciler, firma_tahminleme, girisimci_tahminleme)
 - Uses deterministic, normalized scores (0-100) when historical labels don't exist
 - If historical labels exist, trains a simple RandomForestRegressor pipeline and evaluates it
 - Writes predictions back to Supabase prediction tables by deleting existing predictions for the same entity and inserting new rows
"""

from __future__ import annotations

import os
import sys
import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client

from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error


# ---------- Fixed output schemas (prediction tables) ----------
FIRMA_TAHMIN_COLS = [
    "id",
    "firma_id",
    "tahmini_getiri",
    "surdurulebilirlik_uyum_puani",
    "olusturulma_tarihi",
]

GIRISIMCI_TAHMIN_COLS = [
    "id",
    "girisimci_id",
    "kriter_uyumluluk_puani",
    "gerceklesme_tarihi",
]


# ---------- logging ----------
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("train_ml")


# ---------- env ----------
def load_env() -> None:
    env_path = Path(__file__).parent / ".env"
    if not env_path.exists():
        raise FileNotFoundError(f".env file not found at {env_path}")

    load_dotenv(dotenv_path=env_path)

    required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
    missing = [k for k in required if not (os.getenv(k) or "").strip()]
    if missing:
        raise EnvironmentError(f"Missing required env vars in ml/.env: {', '.join(missing)}")

    logger.info("Environment loaded successfully")
    print("SUPABASE_URL exists:", bool((os.getenv("SUPABASE_URL") or "").strip()))
    print("SERVICE_ROLE exists:", bool((os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()))


def get_supabase_client() -> Client:
    url = (os.getenv("SUPABASE_URL") or "").strip().strip('"').strip("'")
    key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip().strip('"').strip("'")

    # Basic sanity checks
    if not url.startswith("https://") or "supabase.co" not in url:
        raise ValueError("SUPABASE_URL must look like: https://<project-ref>.supabase.co")

    return create_client(url, key)


def can_read_table(supabase: Client, table: str) -> bool:
    try:
        supabase.table(table).select("*").limit(1).execute()
        return True
    except Exception as e:
        logger.error("[TABLE CHECK] %s not readable: %s", table, e)
        return False


def get_table_columns(supabase: Client, table_name: str) -> List[str]:
    """
    Supabase REST üzerinden 1 satır çekip kolonları key'lerden çıkarır.
    Not: tablo tamamen boşsa kolon çıkarılamaz.
    """
    try:
        resp = supabase.table(table_name).select("*").limit(1).execute()
    except Exception as e:
        logger.error("Error fetching sample row from %s: %s", table_name, e)
        sys.exit(1)

    data = getattr(resp, "data", None) or []
    if not data:
        raise RuntimeError(
            f"Table '{table_name}' is empty. Cannot infer columns from sample row. "
            f"Insert 1 sample row OR hardcode column list for this table."
        )

    return list(data[0].keys())


# ---------- data extraction ----------
def fetch_table_all(supabase: Client, table_name: str) -> List[Dict[str, Any]]:
    try:
        resp = supabase.table(table_name).select("*").execute()
    except Exception as e:
        logger.error("Error fetching data from %s: %s", table_name, e)
        sys.exit(1)

    return getattr(resp, "data", None) or []


# ---------- feature engineering / scoring ----------
def extract_cert_features(sertifikalar_value: Any) -> Dict[str, Any]:
    """
    Parse sertifikalar JSONB field and extract:
      - certificate_count
      - has_GOTS, has_OEKO_TEX, has_ISO_14001 (booleans)
    Accepts list/dict/string/None
    """
    out = {
        "certificate_count": 0,
        "has_GOTS": False,
        "has_OEKO_TEX": False,
        "has_ISO_14001": False,
    }

    if sertifikalar_value is None:
        return out

    try:
        parsed = json.loads(sertifikalar_value) if isinstance(sertifikalar_value, str) else sertifikalar_value
    except Exception:
        parsed = None

    certs: List[str] = []
    if isinstance(parsed, list):
        for item in parsed:
            if isinstance(item, str):
                certs.append(item)
            elif isinstance(item, dict):
                if "name" in item:
                    certs.append(str(item["name"]))
                elif "title" in item:
                    certs.append(str(item["title"]))
                else:
                    certs.append(json.dumps(item))
    elif isinstance(parsed, dict):
        for k, v in parsed.items():
            if isinstance(v, bool):
                if v:
                    certs.append(str(k))
            else:
                certs.append(str(k))
    elif isinstance(parsed, str):
        certs = [parsed]

    normalized = [c.upper() for c in certs if isinstance(c, str)]
    out["certificate_count"] = len(normalized)
    out["has_GOTS"] = any("GOTS" in c for c in normalized)
    out["has_OEKO_TEX"] = any(("OEKO" in c) or ("OEKO-TEX" in c) or ("OEKO_TEX" in c) for c in normalized)
    out["has_ISO_14001"] = any(("ISO" in c) and ("14001" in c) for c in normalized)
    return out


def min_max_series(s: pd.Series) -> pd.Series:
    if s.isnull().all():
        return pd.Series(0.0, index=s.index)
    mn = s.min()
    mx = s.max()
    if pd.isna(mn) or pd.isna(mx) or mx == mn:
        return pd.Series(0.0, index=s.index)
    return (s - mn) / (mx - mn)


def compute_sustainability_score(df: pd.DataFrame) -> pd.Series:
    """
    surdurulebilirlik_uyum_puani in 0-100:
     - lower karbon_ayak_izi, su_tuketimi, atik_miktari -> better (inverted)
     - higher geri_donusum_orani -> better
     - certificates -> better
    """
    components: List[pd.Series] = []
    weights: List[float] = []

    if "karbon_ayak_izi" in df.columns:
        s = min_max_series(pd.to_numeric(df["karbon_ayak_izi"], errors="coerce"))
        components.append(1 - s)
        weights.append(1.5)

    if "su_tuketimi" in df.columns:
        s = min_max_series(pd.to_numeric(df["su_tuketimi"], errors="coerce"))
        components.append(1 - s)
        weights.append(1.0)

    if "atik_miktari" in df.columns:
        s = min_max_series(pd.to_numeric(df["atik_miktari"], errors="coerce"))
        components.append(1 - s)
        weights.append(1.0)

    if "geri_donusum_orani" in df.columns:
        s = min_max_series(pd.to_numeric(df["geri_donusum_orani"], errors="coerce"))
        components.append(s)
        weights.append(1.2)

    if "certificate_count" in df.columns:
        s = min_max_series(pd.to_numeric(df["certificate_count"], errors="coerce").fillna(0.0))
        components.append(s)
        weights.append(0.8)

    for col, w in [("has_GOTS", 0.6), ("has_OEKO_TEX", 0.4), ("has_ISO_14001", 0.5)]:
        if col in df.columns:
            components.append(df[col].fillna(False).astype(float))
            weights.append(w)

    if not components:
        return pd.Series(0.0, index=df.index)

    total_weight = sum(weights)
    stacked = pd.concat(components, axis=1).fillna(0.0)
    weighted = stacked.multiply(weights, axis=1).sum(axis=1) / total_weight
    return (weighted * 100).clip(0, 100)


def compute_tahmini_getiri_score(df: pd.DataFrame, sustainability_score: pd.Series) -> pd.Series:
    """
    tahmini_getiri proxy score 0-100:
      - ciro, gorunurluk_orani, magaza_sayisi, sustainability_score
    """
    components: List[pd.Series] = []
    weights: List[float] = []

    if "ciro" in df.columns:
        s = min_max_series(pd.to_numeric(df["ciro"], errors="coerce").fillna(0.0))
        components.append(s)
        weights.append(2.0)

    if "gorunurluk_orani" in df.columns:
        s = min_max_series(pd.to_numeric(df["gorunurluk_orani"], errors="coerce").fillna(0.0))
        components.append(s)
        weights.append(1.5)

    if "magaza_sayisi" in df.columns:
        s = min_max_series(pd.to_numeric(df["magaza_sayisi"], errors="coerce").fillna(0.0))
        components.append(s)
        weights.append(1.0)

    components.append(sustainability_score.fillna(0.0) / 100.0)
    weights.append(1.2)

    stacked = pd.concat(components, axis=1).fillna(0.0)
    weighted = stacked.multiply(weights, axis=1).sum(axis=1) / sum(weights)
    return (weighted * 100).clip(0, 100)


def compute_kriter_uyumluluk_puani(df: pd.DataFrame) -> pd.Series:
    """
    Entrepreneurs score 0-100:
     - newer business -> higher
     - more kadin_calisan_sayisi / engelli_calisan_sayisi -> higher
     - optional talep_edilen_butce -> included
    """
    components: List[pd.Series] = []
    weights: List[float] = []

    # Recency
    if "kurulma_yili" in df.columns:
        year = pd.to_numeric(df["kurulma_yili"], errors="coerce")
        recency = (pd.Series(datetime.utcnow().year, index=df.index) - year)
        components.append(1 - min_max_series(recency))
        weights.append(1.2)
    elif "kurulma_tarihi" in df.columns:
        d = pd.to_datetime(df["kurulma_tarihi"], errors="coerce")
        # newer => smaller age days, so invert after min-max
        age_days = (pd.Timestamp.utcnow().normalize() - d).dt.days
        components.append(1 - min_max_series(age_days))
        weights.append(1.2)

    if "kadin_calisan_sayisi" in df.columns:
        components.append(min_max_series(pd.to_numeric(df["kadin_calisan_sayisi"], errors="coerce").fillna(0.0)))
        weights.append(0.9)

    if "engelli_calisan_sayisi" in df.columns:
        components.append(min_max_series(pd.to_numeric(df["engelli_calisan_sayisi"], errors="coerce").fillna(0.0)))
        weights.append(0.9)

    if "talep_edilen_butce" in df.columns:
        components.append(min_max_series(pd.to_numeric(df["talep_edilen_butce"], errors="coerce").fillna(0.0)))
        weights.append(0.6)

    if not components:
        return pd.Series(0.0, index=df.index)

    stacked = pd.concat(components, axis=1).fillna(0.0)
    weighted = stacked.multiply(weights, axis=1).sum(axis=1) / sum(weights)
    return (weighted * 100).clip(0, 100)


# ---------- ML training / evaluation ----------
def train_regressor_and_predict(
    df: pd.DataFrame, feature_cols: List[str], target_col: str
) -> Tuple[pd.Series, Optional[Dict[str, Any]]]:
    """
    Train a RandomForestRegressor on df[feature_cols] -> df[target_col].
    Returns predictions for all rows and metrics dict or None on failure.
    """
    X = df[feature_cols].copy()
    y = pd.to_numeric(df[target_col], errors="coerce")

    mask = ~y.isna()
    if mask.sum() < 5:
        logger.warning("Not enough labeled rows (%d) to train ML model for %s", mask.sum(), target_col)
        return pd.Series(dtype=float, index=df.index), None

    X_train_all = X.loc[mask]
    y_train_all = y.loc[mask]

    numeric_cols = X_train_all.columns.tolist()

    numeric_pipeline = Pipeline(
        steps=[("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]
    )

    preprocessor = ColumnTransformer(
        transformers=[("num", numeric_pipeline, numeric_cols)],
        remainder="drop",
    )

    model = Pipeline(
        steps=[("pre", preprocessor), ("rf", RandomForestRegressor(n_estimators=100, random_state=42))]
    )

    X_train, X_test, y_tr, y_te = train_test_split(X_train_all, y_train_all, test_size=0.2, random_state=42)

    model.fit(X_train, y_tr)

    y_pred_test = model.predict(X_test)
    metrics = {
        "r2": float(r2_score(y_te, y_pred_test)),
        "mae": float(mean_absolute_error(y_te, y_pred_test)),
        "rmse": float(mean_squared_error(y_te, y_pred_test, squared=False)),
        "trained_on": int(len(X_train)),
        "tested_on": int(len(X_test)),
    }

    preds_all = pd.Series(model.predict(X.fillna(np.nan)), index=df.index)
    return preds_all, metrics


# ---------- write helpers (delete then insert) ----------
def delete_existing_predictions_for_firm(supabase: Client, firma_ids: List[Any]) -> None:
    for fid in firma_ids:
        try:
            supabase.table("firma_tahminleme").delete().eq("firma_id", fid).execute()
        except Exception as e:
            logger.error("Failed to delete firma_tahminleme for firma_id=%s: %s", fid, e)
            sys.exit(1)


def insert_firma_predictions(supabase: Client, rows: List[Dict[str, Any]]) -> None:
    if not rows:
        return
    try:
        supabase.table("firma_tahminleme").insert(rows).execute()
    except Exception as e:
        logger.error("Failed to insert firma_tahminleme rows: %s", e)
        sys.exit(1)


def delete_existing_predictions_for_girisimci(supabase: Client, girisimci_ids: List[Any]) -> None:
    for gid in girisimci_ids:
        try:
            supabase.table("girisimci_tahminleme").delete().eq("girisimci_id", gid).execute()
        except Exception as e:
            logger.error("Failed to delete girisimci_tahminleme for girisimci_id=%s: %s", gid, e)
            sys.exit(1)


def insert_girisimci_predictions(supabase: Client, rows: List[Dict[str, Any]]) -> None:
    if not rows:
        return
    try:
        supabase.table("girisimci_tahminleme").insert(rows).execute()
    except Exception as e:
        logger.error("Failed to insert girisimci_tahminleme rows: %s", e)
        sys.exit(1)


# ---------- main pipeline ----------
def process_firmalar(supabase: Client) -> None:
    logger.info("Processing firms (firmalar)...")

    required_tables = ["firmalar", "firma_tahminleme"]
    for t in required_tables:
        if not can_read_table(supabase, t):
            logger.error("Required table missing or not readable: %s", t)
            sys.exit(1)

    firm_cols = get_table_columns(supabase, "firmalar")
    logger.info("Found columns in firmalar: %s", ", ".join(firm_cols))

    candidate_features = [
        "ciro",
        "karbon_ayak_izi",
        "su_tuketimi",
        "atik_miktari",
        "geri_donusum_orani",
        "kadin_calisan_orani",
        "engelli_calisan_sayisi",
        "magaza_sayisi",
        "gorunurluk_orani",
        "sertifikalar",
    ]
    available_features = [c for c in candidate_features if c in firm_cols]
    if not available_features:
        logger.error("No expected feature columns found in 'firmalar'. Found: %s", ", ".join(firm_cols))
        sys.exit(1)

    possible_labels = ["gercek_getiri", "isbirligi_getirisi"]
    label_col = next((c for c in possible_labels if c in firm_cols), None)
    if label_col:
        logger.info("Historical firm label found: %s -> will train ML regression model", label_col)
    else:
        logger.info("No historical firm label found; will use deterministic scoring fallback")

    rows = fetch_table_all(supabase, "firmalar")
    if not rows:
        logger.info("No firmalar rows found. Skipping.")
        return

    df = pd.DataFrame(rows)

    # Certificates -> derived features
    if "sertifikalar" in df.columns:
        cert_parsed = df["sertifikalar"].apply(extract_cert_features).apply(pd.Series)
        df = pd.concat([df, cert_parsed], axis=1)

    sustainability_score = compute_sustainability_score(df)
    df["surdurulebilirlik_uyum_puani"] = sustainability_score

    if label_col:
        feature_cols = [
            c for c in [
                "ciro", "karbon_ayak_izi", "su_tuketimi", "atik_miktari",
                "geri_donusum_orani", "kadin_calisan_orani", "engelli_calisan_sayisi",
                "magaza_sayisi", "gorunurluk_orani", "certificate_count",
                "has_GOTS", "has_OEKO_TEX", "has_ISO_14001",
            ]
            if c in df.columns
        ]
        preds, metrics = train_regressor_and_predict(df, feature_cols, label_col)
        if metrics is None:
            logger.warning("Fallback deterministic tahmini_getiri (insufficient labels)")
            df["tahmini_getiri"] = compute_tahmini_getiri_score(df, sustainability_score)
        else:
            df["tahmini_getiri"] = preds
            logger.info("Trained firm regressor metrics: %s", metrics)
    else:
        df["tahmini_getiri"] = compute_tahmini_getiri_score(df, sustainability_score)

    now_iso = datetime.utcnow().isoformat()

    out_rows: List[Dict[str, Any]] = []
    for idx, row in df.iterrows():
        firma_id = row.get("id") or row.get("firma_id") or row.get("pk") or None
        if firma_id is None:
            logger.warning("Skipping firm row with no id: index=%s", idx)
            continue

        out_rows.append({
            "firma_id": firma_id,
            "tahmini_getiri": None if pd.isna(row.get("tahmini_getiri")) else float(row.get("tahmini_getiri")),
            "surdurulebilirlik_uyum_puani": None if pd.isna(row.get("surdurulebilirlik_uyum_puani")) else float(row.get("surdurulebilirlik_uyum_puani")),
            "olusturulma_tarihi": now_iso,
        })

    firma_ids = [r["firma_id"] for r in out_rows]
    if firma_ids:
        logger.info("Deleting existing firma_tahminleme rows for %d firms...", len(firma_ids))
        delete_existing_predictions_for_firm(supabase, firma_ids)

        logger.info("Inserting %d firma_tahminleme rows...", len(out_rows))
        insert_firma_predictions(supabase, out_rows)

    logger.info("Firma predictions written: %d", len(out_rows))
    for sample in out_rows[:5]:
        logger.info("Sample: %s", sample)


def process_girisimciler(supabase: Client) -> None:
    logger.info("Processing entrepreneurs (girisimciler)...")

    required_tables = ["girisimciler", "girisimci_tahminleme"]
    for t in required_tables:
        if not can_read_table(supabase, t):
            logger.error("Required table missing or not readable: %s", t)
            sys.exit(1)

    gir_cols = get_table_columns(supabase, "girisimciler")
    logger.info("Found columns in girisimciler: %s", ", ".join(gir_cols))

    candidate_features = [
        "kurulma_yili",
        "kurulma_tarihi",
        "kadin_calisan_sayisi",
        "engelli_calisan_sayisi",
        "talep_edilen_butce",
    ]
    available_features = [c for c in candidate_features if c in gir_cols]
    if not available_features:
        logger.error("No expected feature columns found in 'girisimciler'. Found: %s", ", ".join(gir_cols))
        sys.exit(1)

    possible_labels = ["gercek_uyum_puani", "basari_puani"]
    label_col = next((c for c in possible_labels if c in gir_cols), None)
    if label_col:
        logger.info("Historical entrepreneur label found: %s -> will train ML regression model", label_col)
    else:
        logger.info("No historical entrepreneur label found; will use deterministic scoring fallback")

    rows = fetch_table_all(supabase, "girisimciler")
    if not rows:
        logger.info("No girisimciler rows found. Skipping.")
        return

    df = pd.DataFrame(rows)

    if label_col:
        feature_cols = [c for c in ["kurulma_yili", "kadin_calisan_sayisi", "engelli_calisan_sayisi", "talep_edilen_butce"] if c in df.columns]
        preds, metrics = train_regressor_and_predict(df, feature_cols, label_col)
        if metrics is None:
            logger.warning("Fallback deterministic kriter_uyumluluk_puani (insufficient labels)")
            df["kriter_uyumluluk_puani"] = compute_kriter_uyumluluk_puani(df)
        else:
            df["kriter_uyumluluk_puani"] = preds
            logger.info("Trained entrepreneur regressor metrics: %s", metrics)
    else:
        df["kriter_uyumluluk_puani"] = compute_kriter_uyumluluk_puani(df)

    now_iso = datetime.utcnow().isoformat()

    out_rows: List[Dict[str, Any]] = []
    for idx, row in df.iterrows():
        gid = row.get("id") or row.get("girisimci_id") or None
        if gid is None:
            logger.warning("Skipping entrepreneur row with no id: index=%s", idx)
            continue

        out_rows.append({
            "girisimci_id": gid,
            "kriter_uyumluluk_puani": None if pd.isna(row.get("kriter_uyumluluk_puani")) else float(row.get("kriter_uyumluluk_puani")),
            "gerceklesme_tarihi": now_iso,
        })

    girisimci_ids = [r["girisimci_id"] for r in out_rows]
    if girisimci_ids:
        logger.info("Deleting existing girisimci_tahminleme rows for %d entrepreneurs...", len(girisimci_ids))
        delete_existing_predictions_for_girisimci(supabase, girisimci_ids)

        logger.info("Inserting %d girisimci_tahminleme rows...", len(out_rows))
        insert_girisimci_predictions(supabase, out_rows)

    logger.info("Girisimci predictions written: %d", len(out_rows))
    for sample in out_rows[:5]:
        logger.info("Sample: %s", sample)


def main() -> None:
    logger.info("Starting training/scoring script")
    load_env()

    supabase = get_supabase_client()

    tables_to_check = ["firmalar", "girisimciler", "firma_tahminleme", "girisimci_tahminleme"]
    missing = [t for t in tables_to_check if not can_read_table(supabase, t)]
    if missing:
        logger.error("Missing required tables: %s", ", ".join(missing))
        sys.exit(1)

    process_firmalar(supabase)
    process_girisimciler(supabase)

    logger.info("Done.")


if __name__ == "__main__":
    main()
