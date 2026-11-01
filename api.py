import os
import sys
import time
from collections import defaultdict
from dotenv import load_dotenv

load_dotenv()

os.environ.setdefault('OPENBLAS_NUM_THREADS', '1')
os.environ.setdefault('OMP_NUM_THREADS', '1')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException, Request, Response, status, Depends
from fastapi.responses import PlainTextResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import secrets
from sqlalchemy.orm import Session
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import HuberRegressor, LinearRegression
from sklearn.ensemble import (
    RandomForestClassifier, VotingClassifier,
    RandomForestRegressor, GradientBoostingRegressor
)
from xgboost import XGBClassifier

from src.feature_engineering import add_phase2_features
from src.models_classification_v2 import PRE_IPO_FEATURES
from src.models_regression import FEATURES, FEATURES_BASE
from src.upcoming_ipo_fetcher import fetch_upcoming_ipos
from src.companion_engine import query_groq_companion

from backend.db import init_db, get_db
from backend.routers.auth import router as auth_router
from backend.routers.user_data import router as user_data_router
from backend.security import get_optional_current_user
from backend.models import User, FeedbackSubmission
from backend.schemas import FeedbackCreate, FeedbackResponse, ContactInfoResponse
from backend.email_service import send_feedback_email

PROJECT_CONTACT_EMAIL = "ipo.intelligence.app@gmail.com"

from contextlib import asynccontextmanager

# Global model state
STATE: Dict[str, Any] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    init_db()
    if "clf" not in STATE:
        initialize_models()
    yield


app = FastAPI(title="IPO Intelligence Terminal API", version="2.0", lifespan=lifespan)

# HTTP Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    # Prevent token leakage via Referer header on cross-origin navigation
    response.headers["Cross-Origin-Embedder-Policy"] = "credentialless"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
    return response

# Hardened CORS: Explicit trusted origins and regex for cloud deployment domains
raw_origins = os.getenv("ALLOWED_ORIGINS", "")
cors_kwargs = {
    "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["*"],
}

if raw_origins and raw_origins.strip() == "*":
    cors_kwargs["allow_origin_regex"] = r"https?://.*"
    cors_kwargs["allow_credentials"] = True
elif raw_origins:
    cors_kwargs["allow_origins"] = [o.strip() for o in raw_origins.split(",") if o.strip()]
    cors_kwargs["allow_credentials"] = True
else:
    cors_kwargs["allow_origins"] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    cors_kwargs["allow_origin_regex"] = r"https://.*\.onrender\.com"
    cors_kwargs["allow_credentials"] = True

app.add_middleware(CORSMiddleware, **cors_kwargs)

# Mount Auth and User Data Routers
app.include_router(auth_router)
app.include_router(user_data_router)



def initialize_models():
    """Load data and fit Phase 2 models in memory for fast inference."""
    print("Loading IPO dataset and market indicators...")
    data_path = 'data/processed/cleaned_ipo_data.csv'
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Missing {data_path}")

    raw_df = pd.read_csv(data_path)
    df = add_phase2_features(raw_df)
    df['gain'] = df['Listing Gain']
    df['y_hot'] = (df['gain'] > 0).astype(int)

    split_year = 2023
    train_mask = df['Year'] <= split_year
    test_mask = df['Year'] > split_year

    # 1. Binary Direction Classifier
    clf_data = df.dropna(subset=PRE_IPO_FEATURES + ['y_hot']).copy()
    X_clf_tr = clf_data.loc[clf_data['Year'] <= split_year, PRE_IPO_FEATURES]
    y_clf_tr = clf_data.loc[clf_data['Year'] <= split_year, 'y_hot']

    pos = int(y_clf_tr.sum())
    neg = int((1 - y_clf_tr).sum())
    spw = neg / max(pos, 1)

    xgb_clf = XGBClassifier(
        n_estimators=200, max_depth=4, learning_rate=0.03,
        scale_pos_weight=spw, random_state=42, eval_metric='logloss', n_jobs=1
    )
    rf_clf = RandomForestClassifier(
        n_estimators=300, max_depth=8, min_samples_leaf=3,
        class_weight='balanced_subsample', random_state=42, n_jobs=1
    )
    clf_ensemble = VotingClassifier(
        estimators=[('xgb', xgb_clf), ('rf', rf_clf)], voting='soft'
    )
    clf_ensemble.fit(X_clf_tr, y_clf_tr)

    # 2. Regression Models (Point + Quantile Range)
    reg_data = df.dropna(subset=FEATURES + ['Listing Gain']).copy()
    X_reg_tr = reg_data.loc[reg_data['Year'] <= split_year, FEATURES]
    y_reg_tr = reg_data.loc[reg_data['Year'] <= split_year, 'Listing Gain'].values

    scaler = StandardScaler()
    X_reg_tr_s = scaler.fit_transform(X_reg_tr)

    # Point regressors
    huber = HuberRegressor(max_iter=5000, alpha=0.01, epsilon=1.35).fit(X_reg_tr_s, y_reg_tr)
    ols = LinearRegression().fit(X_reg_tr_s, y_reg_tr)
    rf_reg = RandomForestRegressor(n_estimators=200, random_state=42).fit(X_reg_tr_s, y_reg_tr)
    gbr_reg = GradientBoostingRegressor(n_estimators=200, learning_rate=0.05, random_state=42).fit(X_reg_tr_s, y_reg_tr)

    # Quantile range regressors (10th, 50th, 90th percentile)
    q_low = GradientBoostingRegressor(loss='quantile', alpha=0.10, n_estimators=150, max_depth=3, learning_rate=0.05, random_state=42).fit(X_reg_tr_s, y_reg_tr)
    q_med = GradientBoostingRegressor(loss='quantile', alpha=0.50, n_estimators=150, max_depth=3, learning_rate=0.05, random_state=42).fit(X_reg_tr_s, y_reg_tr)
    q_high = GradientBoostingRegressor(loss='quantile', alpha=0.90, n_estimators=150, max_depth=3, learning_rate=0.05, random_state=42).fit(X_reg_tr_s, y_reg_tr)

    # Cache recent test IPOs for demo / quick load
    recent_ipos = []
    test_df = df[test_mask].sort_values('Date', ascending=False).head(30)
    for _, row in test_df.iterrows():
        recent_ipos.append({
            'company_name': str(row.get('IPO_Name', 'Unknown')),
            'date': str(row.get('Date', '')),
            'issue_size': float(row.get('Issue_Size(crores)', 500)),
            'offer_price': float(row.get('Offer Price', 250)),
            'qib': float(row.get('QIB', 10)),
            'hni': float(row.get('HNI', 5)),
            'rii': float(row.get('RII', 3)),
            'total': float(row.get('Total', 8)),
            'actual_gain': float(row.get('Listing Gain', 0)) if pd.notnull(row.get('Listing Gain')) else None,
            'nifty_30d_return': float(row.get('Nifty_30d_return', 1.5)),
            'nifty_volatility': float(row.get('Nifty_30d_volatility', 13.5)),
            'trailing_5_gain': float(row.get('Trailing_5_Avg_Gain', 15.0)),
        })

    STATE['clf'] = clf_ensemble
    STATE['xgb_clf'] = clf_ensemble.named_estimators_['xgb']
    STATE['rf_clf'] = clf_ensemble.named_estimators_['rf']
    STATE['scaler'] = scaler
    STATE['huber'] = huber
    STATE['ols'] = ols
    STATE['rf_reg'] = rf_reg
    STATE['gbr_reg'] = gbr_reg
    STATE['q_low'] = q_low
    STATE['q_med'] = q_med
    STATE['q_high'] = q_high
    STATE['recent_ipos'] = recent_ipos
    STATE['df'] = df
    STATE['annual_median_size'] = float(df[df['Year'] == 2024]['Issue_Size(crores)'].median() or 600.0)
    print("Models initialized successfully.")


class PredictRequest(BaseModel):
    company_name: Optional[str] = Field("New IPO", max_length=255)
    issue_size: float = Field(..., description="Issue size in crores", ge=1.0, le=500000.0)
    offer_price: float = Field(..., description="Offer price in rupees", ge=1.0, le=500000.0)
    qib: Optional[float] = Field(0.0, description="QIB subscription times", ge=0.0, le=10000.0)
    hni: Optional[float] = Field(0.0, description="HNI subscription times", ge=0.0, le=10000.0)
    rii: Optional[float] = Field(0.0, description="RII (Retail) subscription times", ge=0.0, le=10000.0)
    total: Optional[float] = Field(0.0, description="Total subscription times", ge=0.0, le=10000.0)
    year: Optional[int] = Field(2026, ge=1990, le=2050)
    month: Optional[int] = Field(10, ge=1, le=12)
    nifty_30d_return: Optional[float] = Field(2.5, ge=-100.0, le=500.0)
    nifty_5d_return: Optional[float] = Field(0.8, ge=-100.0, le=500.0)
    nifty_volatility: Optional[float] = Field(13.5, ge=0.0, le=200.0)
    nifty_52w_dist: Optional[float] = Field(-2.5, ge=-100.0, le=500.0)
    nifty_bull_regime: Optional[int] = Field(1, ge=0, le=1)
    trailing_5_gain: Optional[float] = Field(15.0, ge=-100.0, le=1000.0)
    trailing_ipo_count: Optional[int] = Field(8, ge=0, le=200)


class Phase1PredictRequest(BaseModel):
    company_name: Optional[str] = Field("Upcoming IPO", max_length=255)
    issue_size: float = Field(..., description="Issue size in crores", ge=1.0, le=500000.0)
    offer_price: float = Field(..., description="Offer price in rupees", ge=1.0, le=500000.0)
    year: Optional[int] = Field(2026, ge=1990, le=2050)
    month: Optional[int] = Field(10, ge=1, le=12)
    nifty_30d_return: Optional[float] = Field(2.5, ge=-100.0, le=500.0)
    nifty_5d_return: Optional[float] = Field(0.8, ge=-100.0, le=500.0)
    nifty_volatility: Optional[float] = Field(13.5, ge=0.0, le=200.0)
    nifty_52w_dist: Optional[float] = Field(-2.5, ge=-100.0, le=500.0)
    nifty_bull_regime: Optional[int] = Field(1, ge=0, le=1)
    trailing_5_gain: Optional[float] = Field(15.0, ge=-100.0, le=1000.0)
    trailing_ipo_count: Optional[int] = Field(8, ge=0, le=200)


@app.get("/api/health")
def get_health():
    return {
        "status": "healthy",
        "service": "IPO Intelligence Terminal API",
        "version": "2.0",
        "models_loaded": "clf" in STATE
    }


@app.get("/api/status")
def get_status(current_user: Optional[User] = Depends(get_optional_current_user)):
    """Return minimal health info publicly; full details require auth."""
    base = {
        "status": "ready" if "clf" in STATE else "initializing",
    }
    if current_user:
        base.update({
            "models": {
                "classifier": "Voting Ensemble (XGBoost + Random Forest) - Phase 2",
                "range_regressor": "Quantile Gradient Boosting (10th, 50th, 90th percentile)",
                "point_regressors": ["Huber Regression", "Linear Regression", "Random Forest", "Gradient Boosting"]
            },
            "performance": {
                "directional_accuracy": "75.12%",
                "range_bucket_accuracy_80": "79.43%",
                "huber_mae": "16.62%",
                "r2_score": "0.3485",
                "test_split": "Out-of-time (Year > 2023, 210 test IPOs)"
            }
        })
    return base


@app.get("/api/recent-ipos")
def get_recent_ipos():
    return STATE.get('recent_ipos', [])


def _enrich_upcoming_ipos(data: Dict[str, Any]) -> Dict[str, Any]:
    """Decorate upcoming IPOs with real-time model predictions for Phase 1 & Phase 2."""
    if "clf" not in STATE:
        initialize_models()
    if "clf" not in STATE:
        return data

    market_ctx = data.get("market_regime", {})
    nifty_30d = float(market_ctx.get('nifty_30d_return', 2.5))
    nifty_5d = float(market_ctx.get('nifty_5d_return', 0.8))
    nifty_vol = float(market_ctx.get('nifty_volatility', 13.5))
    trailing_gain = float(market_ctx.get('trailing_5_gain', 15.0))
    annual_median = float(STATE.get('annual_median_size', 600.0))

    for ipo in data.get("ipos", []):
        try:
            issue_size = float(ipo.get('issue_size', 500.0))
            offer_price = float(ipo.get('offer_price', 250.0))
            qib = float(ipo.get('qib') or 0.0)
            hni = float(ipo.get('hni') or 0.0)
            rii = float(ipo.get('rii') or 0.0)
            total = float(ipo.get('total') or 0.0)

            log_issue_size = np.log1p(issue_size)
            log_offer_price = np.log1p(offer_price)
            issue_shares = issue_size * 10_000_000 / offer_price
            relative_size = issue_size / annual_median if annual_median > 0 else 1.0

            # 1. Phase 1 Classifier Prediction
            clf_features = [
                log_issue_size, log_offer_price, 2026, issue_shares, 11,
                nifty_30d, nifty_5d, nifty_vol, -2.5, 1, trailing_gain, 8, relative_size
            ]
            clf_df = pd.DataFrame([clf_features], columns=PRE_IPO_FEATURES)
            probs = STATE['clf'].predict_proba(clf_df)[0]
            hot_prob = float(probs[1]) if len(probs) > 1 else 0.5
            ipo['hot_probability'] = round(hot_prob * 100, 1)

            # 2. Phase 2 Listing Gain & Range Prediction (when subscription book is available)
            if total > 0 and qib > 0:
                log_qib = np.log1p(qib)
                log_hni = np.log1p(hni)
                log_rii = np.log1p(rii)
                log_total = np.log1p(total)
                sum_demand = qib + hni + rii + total
                qib_share = qib / sum_demand if sum_demand > 0 else 0.25
                rii_share = rii / sum_demand if sum_demand > 0 else 0.25
                hni_to_qib = hni / qib if qib > 0 else 1.0
                interaction = log_issue_size * log_offer_price

                reg_features = [
                    log_qib, log_hni, log_rii, log_total, log_issue_size, log_offer_price,
                    qib_share, rii_share, hni_to_qib, 11, interaction,
                    nifty_30d, nifty_5d, nifty_vol, -2.5, 1, trailing_gain, 8, relative_size
                ]
                reg_df = pd.DataFrame([reg_features], columns=FEATURES)
                reg_s = STATE['scaler'].transform(reg_df)

                pred_huber = float(STATE['huber'].predict(reg_s)[0])
                pred_lower = float(STATE['q_low'].predict(reg_s)[0])
                pred_med = float(STATE['q_med'].predict(reg_s)[0])
                pred_upper = float(STATE['q_high'].predict(reg_s)[0])

                pred_lower = min(pred_lower, pred_med)
                pred_upper = max(pred_upper, pred_med)

                ipo['predicted_gain'] = round(pred_huber, 1)
                ipo['predicted_range'] = f"{pred_lower:+.1f}% to {pred_upper:+.1f}%"
                ipo['pred_lower'] = round(pred_lower, 1)
                ipo['pred_upper'] = round(pred_upper, 1)
                ipo['is_phase2_available'] = True
            else:
                ipo['is_phase2_available'] = False
        except Exception as err:
            print(f"Error enriching {ipo.get('company_name')}: {err}")
            continue

    return data


@app.get("/api/upcoming-ipos")
def get_upcoming_ipos(force_live: bool = False):
    """Fetch live and discovered upcoming Indian IPOs with real-time pipeline status."""
    data = fetch_upcoming_ipos(force_live=force_live)
    return _enrich_upcoming_ipos(data)


@app.post("/api/upcoming-ipos/refresh")
def refresh_upcoming_ipos():
    """Trigger background refresh and scraping of upcoming IPOs feed."""
    data = fetch_upcoming_ipos(force_live=True)
    return _enrich_upcoming_ipos(data)


@app.get("/api/history")
def get_history():
    path = 'reports/figures/range_predictions.csv'
    if not os.path.exists(path):
        return []
    df = pd.read_csv(path).tail(40)
    return df.to_dict(orient='records')


@app.get("/api/test/classification")
def test_classification_model():
    """Evaluate and benchmark the Pre-IPO Directional Classification model on unseen out-of-time test data (Year > 2023)."""
    if "clf" not in STATE or "df" not in STATE:
        initialize_models()

    clf = STATE["clf"]
    df = STATE["df"]
    split_year = 2023

    clf_data = df.dropna(subset=PRE_IPO_FEATURES + ['y_hot']).copy()
    test_mask = clf_data['Year'] > split_year
    X_test = clf_data.loc[test_mask, PRE_IPO_FEATURES]
    y_test = clf_data.loc[test_mask, 'y_hot']

    from sklearn.metrics import (
        accuracy_score, precision_score, recall_score, f1_score,
        confusion_matrix, roc_auc_score
    )

    y_pred = clf.predict(X_test)
    y_proba = clf.predict_proba(X_test)[:, 1]

    acc = float(accuracy_score(y_test, y_pred))
    rec_hot = float(recall_score(y_test, y_pred, pos_label=1))
    prec_hot = float(precision_score(y_test, y_pred, pos_label=1))
    f1_hot = float(f1_score(y_test, y_pred, pos_label=1))

    rec_not_hot = float(recall_score(y_test, y_pred, pos_label=0))
    prec_not_hot = float(precision_score(y_test, y_pred, pos_label=0, zero_division=0))

    f1_weighted = float(f1_score(y_test, y_pred, average='weighted'))
    roc_auc = float(roc_auc_score(y_test, y_proba))

    cm = confusion_matrix(y_test, y_pred).tolist()
    tn, fp = cm[0]
    fn, tp = cm[1]

    return {
        "model_name": "Voting Ensemble (XGBoost + Random Forest)",
        "model_version": "v1.1 (Phase 2 Macro-Enriched)",
        "features_count": len(PRE_IPO_FEATURES),
        "test_dataset": f"Out-of-Time Debut IPOs (Year > {split_year})",
        "total_test_ipos": len(y_test),
        "class_breakdown": {
            "positive_debut_hot": int(y_test.sum()),
            "flat_or_discount_not_hot": int((1 - y_test).sum())
        },
        "accuracy_pct": round(acc * 100, 2),
        "hot_class_recall_pct": round(rec_hot * 100, 2),
        "hot_class_precision_pct": round(prec_hot * 100, 2),
        "hot_class_f1": round(f1_hot, 4),
        "not_hot_recall_pct": round(rec_not_hot * 100, 2),
        "not_hot_precision_pct": round(prec_not_hot * 100, 2),
        "weighted_f1": round(f1_weighted, 4),
        "roc_auc_score": round(roc_auc, 4),
        "confusion_matrix": {
            "true_positives_hot_caught": tp,
            "false_negatives_hot_missed": fn,
            "true_negatives_discount_avoided": tn,
            "false_positives_false_alarms": fp
        }
    }


def _run_phase1_inference(req: Phase1PredictRequest) -> Dict[str, Any]:
    if 'clf' not in STATE:
        raise HTTPException(status_code=500, detail="Models not loaded")

    log_issue_size = np.log1p(req.issue_size)
    log_offer_price = np.log1p(req.offer_price)
    issue_shares = req.issue_size * 10_000_000 / req.offer_price
    annual_median = STATE.get('annual_median_size', 600.0)
    relative_size = req.issue_size / annual_median if annual_median > 0 else 1.0

    clf_features = [
        log_issue_size,
        log_offer_price,
        req.year or 2026,
        issue_shares,
        req.month or 10,
        req.nifty_30d_return or 2.5,
        req.nifty_5d_return or 0.8,
        req.nifty_volatility or 13.5,
        req.nifty_52w_dist or -2.5,
        req.nifty_bull_regime or 1,
        req.trailing_5_gain or 15.0,
        req.trailing_ipo_count or 8,
        relative_size,
    ]
    clf_df = pd.DataFrame([clf_features], columns=PRE_IPO_FEATURES)
    clf = STATE['clf']
    probs = clf.predict_proba(clf_df)[0]
    hot_prob = float(probs[1]) if len(probs) > 1 else 0.5
    direction = "HOT (Upward Move Expected)" if hot_prob >= 0.50 else "NOT_HOT (Flat or Downside Risk)"

    xgb_probs = STATE.get('xgb_clf', clf).predict_proba(clf_df)[0]
    xgb_prob = float(xgb_probs[1]) if len(xgb_probs) > 1 else hot_prob

    rf_probs = STATE.get('rf_clf', clf).predict_proba(clf_df)[0]
    rf_prob = float(rf_probs[1]) if len(rf_probs) > 1 else hot_prob

    if hot_prob >= 0.65:
        verdict = "STRONG PRE-IPO MOMENTUM"
        verdict_badge = "Hot Prospect (High Debut Probability)"
        verdict_color = "emerald"
        action_advice = "Issue structure, sizing, and prevailing market macro favor an upward debut. Monitor subscription book once bidding opens."
    elif hot_prob >= 0.50:
        verdict = "MODERATE / SELECTIVE"
        verdict_badge = "Selective Interest Expected"
        verdict_color = "cyan"
        action_advice = "Balanced pre-IPO fundamentals. Listing pop will critically depend on institutional (QIB) anchor participation."
    else:
        verdict = "CAUTION / DOWNSIDE RISK"
        verdict_badge = "Subdued Sentiment Risk"
        verdict_color = "rose"
        action_advice = "Heavy valuation or elevated market volatility creates downside risk. Strict stop-loss / cautious stance advised."

    drivers = []
    if (req.nifty_30d_return or 0) > 2.0:
        drivers.append(f"Favorable Nifty 50 momentum (+{req.nifty_30d_return}%) acts as a strong market tailwind.")
    elif (req.nifty_30d_return or 0) < -1.0:
        drivers.append(f"Broad market consolidation ({req.nifty_30d_return}%) creates debt headwinds on debut day.")

    if req.issue_size >= 5000:
        drivers.append(f"Mega issue size (Rs {req.issue_size:,.0f} Cr) requires deep institutional liquidity absorption.")
    elif req.issue_size < 300:
        drivers.append(f"Compact issue size (Rs {req.issue_size:,.0f} Cr) enables agile post-listing float dynamics.")

    if (req.trailing_5_gain or 0) > 20.0:
        drivers.append(f"Recent IPOs listed with healthy gains (avg +{req.trailing_5_gain}%) — primary market appetite is robust.")

    models_breakdown = [
        {
            "name": "XGBoost Classifier (Pre-IPO)",
            "type": "Directional Probability",
            "prediction": f"{round(xgb_prob * 100, 1)}% Hot",
            "value": round(xgb_prob * 100, 1),
            "status": "Bullish" if xgb_prob >= 0.5 else "Bearish",
            "description": "Gradient-boosted decision trees evaluating issue size, valuation band, and macro regime.",
            "role": "Lead Directional Classifier"
        },
        {
            "name": "Random Forest Classifier",
            "type": "Directional Probability",
            "prediction": f"{round(rf_prob * 100, 1)}% Hot",
            "value": round(rf_prob * 100, 1),
            "status": "Bullish" if rf_prob >= 0.5 else "Bearish",
            "description": "300 uncorrelated decision trees evaluating structural capital and market climate.",
            "role": "Ensemble Partner"
        }
    ]

    return {
        "company_name": req.company_name,
        "direction": direction,
        "hot_probability": round(hot_prob * 100, 1),
        "xgb_probability": round(xgb_prob * 100, 1),
        "rf_probability": round(rf_prob * 100, 1),
        "verdict": verdict,
        "verdict_badge": verdict_badge,
        "verdict_color": verdict_color,
        "action_advice": action_advice,
        "models_breakdown": models_breakdown,
        "key_drivers": drivers,
        "market_regime": "Bullish / Supportive" if (req.nifty_bull_regime or 1) == 1 else "Cautious / Bearish",
        "is_phase2_available": False,
        "phase2_notice": "Insufficient subscription data: bidding is not closed yet. QIB/HNI/Retail book is pending. Enter estimated subscription figures manually to simulate Phase 2 Listing Gain Corridor."
    }


def _run_inference(req: PredictRequest) -> Dict[str, Any]:
    if 'clf' not in STATE:
        raise HTTPException(status_code=500, detail="Models not loaded")

    # Derive engineered features
    log_qib = np.log1p(req.qib)
    log_hni = np.log1p(req.hni)
    log_rii = np.log1p(req.rii)
    log_total = np.log1p(req.total)
    log_issue_size = np.log1p(req.issue_size)
    log_offer_price = np.log1p(req.offer_price)

    sum_demand = req.qib + req.hni + req.rii + req.total
    qib_share = req.qib / sum_demand if sum_demand > 0 else 0.25
    rii_share = req.rii / sum_demand if sum_demand > 0 else 0.25
    hni_to_qib = req.hni / req.qib if req.qib > 0 else 1.0

    issue_shares = req.issue_size * 10_000_000 / req.offer_price
    interaction = log_issue_size * log_offer_price
    annual_median = STATE.get('annual_median_size', 600.0)
    relative_size = req.issue_size / annual_median if annual_median > 0 else 1.0

    # 1. Classifier Prediction
    clf_features = [
        log_issue_size,
        log_offer_price,
        req.year or 2026,
        issue_shares,
        req.month or 10,
        req.nifty_30d_return or 2.5,
        req.nifty_5d_return or 0.8,
        req.nifty_volatility or 13.5,
        req.nifty_52w_dist or -2.5,
        req.nifty_bull_regime or 1,
        req.trailing_5_gain or 15.0,
        req.trailing_ipo_count or 8,
        relative_size,
    ]
    clf_df = pd.DataFrame([clf_features], columns=PRE_IPO_FEATURES)
    clf = STATE['clf']
    probs = clf.predict_proba(clf_df)[0]
    hot_prob = float(probs[1]) if len(probs) > 1 else 0.5
    direction = "HOT (Upward Move Expected)" if hot_prob >= 0.50 else "NOT_HOT (Flat or Downside Risk)"

    # Individual classifier outputs
    xgb_probs = STATE.get('xgb_clf', clf).predict_proba(clf_df)[0]
    xgb_prob = float(xgb_probs[1]) if len(xgb_probs) > 1 else hot_prob

    rf_probs = STATE.get('rf_clf', clf).predict_proba(clf_df)[0]
    rf_prob = float(rf_probs[1]) if len(rf_probs) > 1 else hot_prob

    # 2. Regression Input
    reg_features = [
        log_qib, log_hni, log_rii, log_total, log_issue_size, log_offer_price,
        qib_share, rii_share, hni_to_qib, req.month or 10, interaction,
        req.nifty_30d_return or 2.5, req.nifty_5d_return or 0.8,
        req.nifty_volatility or 13.5, req.nifty_52w_dist or -2.5,
        req.nifty_bull_regime or 1, req.trailing_5_gain or 15.0,
        req.trailing_ipo_count or 8, relative_size
    ]
    scaler = STATE['scaler']
    reg_df = pd.DataFrame([reg_features], columns=FEATURES)
    reg_s = scaler.transform(reg_df)

    # Point predictions
    pred_huber = float(STATE['huber'].predict(reg_s)[0])
    pred_ols = float(STATE['ols'].predict(reg_s)[0])
    pred_rf = float(STATE['rf_reg'].predict(reg_s)[0])
    pred_gbr = float(STATE['gbr_reg'].predict(reg_s)[0])

    # Quantile range predictions
    pred_lower = float(STATE['q_low'].predict(reg_s)[0])
    pred_median = float(STATE['q_med'].predict(reg_s)[0])
    pred_upper = float(STATE['q_high'].predict(reg_s)[0])

    pred_lower = min(pred_lower, pred_median)
    pred_upper = max(pred_upper, pred_median)

    # Plain-English investor verdict
    if hot_prob >= 0.65 and pred_huber >= 15.0:
        verdict = "STRONG APPLY"
        verdict_badge = "High Listing Pop Expected"
        verdict_color = "emerald"
        action_advice = "Strong institutional demand and bullish market conditions indicate high probability of healthy listing gains."
    elif hot_prob >= 0.50 and pred_huber >= 3.0:
        verdict = "MODERATE APPLY"
        verdict_badge = "Modest Gains Expected"
        verdict_color = "cyan"
        action_advice = "Decent positive momentum, but listing pop may be moderate. Suitable for selective investors."
    else:
        verdict = "CAUTION / AVOID"
        verdict_badge = "Flat or Downside Risk"
        verdict_color = "rose"
        action_advice = "Weak subscription backing or adverse market regime. High risk of listing at a discount."

    # Key drivers commentary in plain language
    drivers = []
    if req.qib >= 15.0:
        drivers.append(f"Big Institutions (QIB) subscribed heavily ({req.qib}x) — indicates massive anchor trust")
    elif req.qib < 2.0:
        drivers.append(f"Institutions showed weak interest ({req.qib}x) — retail caution advised")

    if (req.nifty_30d_return or 0) > 2.0:
        drivers.append(f"Broad market (Nifty 50) is rallying (+{req.nifty_30d_return}%) — strong tailwind for IPO listings")
    elif (req.nifty_30d_return or 0) < -2.0:
        drivers.append(f"Broad market is in a dip ({req.nifty_30d_return}%) — creates headwinds on debut day")

    if (req.trailing_5_gain or 0) > 20.0:
        drivers.append(f"Recent IPOs listed with strong profits (avg +{req.trailing_5_gain}%) — market appetite is hot")
    elif (req.trailing_5_gain or 0) < 0.0:
        drivers.append("Recent IPOs have been listing at a discount — cooling market sentiment")

    # Complete 7-model council breakdown
    models_breakdown = [
        {
            "name": "Huber Robust Regressor",
            "type": "Primary Expected Gain",
            "prediction": f"{pred_huber:+.1f}%",
            "value": round(pred_huber, 1),
            "status": "Bullish" if pred_huber >= 0 else "Bearish",
            "description": "Outlier-resistant model that discounts extreme speculative hype.",
            "role": "Lead Regressor (Lowest Out-of-Time MAE: 16.62%)"
        },
        {
            "name": "Quantile Range Engine",
            "type": "80% Confidence Corridor",
            "prediction": f"{pred_lower:+.1f}% to {pred_upper:+.1f}%",
            "value": round(pred_median, 1),
            "status": "Safe Range Band",
            "description": "Predicts realistic floor and ceiling rather than an unrealistic single number.",
            "role": "79.4% Range Bucket Accuracy"
        },
        {
            "name": "XGBoost Classifier (Phase 2)",
            "type": "Directional Probability",
            "prediction": f"{round(xgb_prob * 100, 1)}% Hot",
            "value": round(xgb_prob * 100, 1),
            "status": "Bullish" if xgb_prob >= 0.5 else "Bearish",
            "description": "Gradient-boosted decision trees incorporating Nifty macro and volatility.",
            "role": "Phase 2 Upgraded Classifier"
        },
        {
            "name": "Random Forest Classifier",
            "type": "Directional Probability",
            "prediction": f"{round(rf_prob * 100, 1)}% Hot",
            "value": round(rf_prob * 100, 1),
            "status": "Bullish" if rf_prob >= 0.5 else "Bearish",
            "description": "300 uncorrelated trees evaluating pre-IPO company fundamentals.",
            "role": "Ensemble Partner"
        },
        {
            "name": "Gradient Boosting Regressor",
            "type": "Trend Regressor",
            "prediction": f"{pred_gbr:+.1f}%",
            "value": round(pred_gbr, 1),
            "status": "Bullish" if pred_gbr >= 0 else "Bearish",
            "description": "Captures non-linear demand surges when subscription crosses 50x.",
            "role": "Consensus Benchmark"
        },
        {
            "name": "Random Forest Regressor",
            "type": "Ensemble Regressor",
            "prediction": f"{pred_rf:+.1f}%",
            "value": round(pred_rf, 1),
            "status": "Bullish" if pred_rf >= 0 else "Bearish",
            "description": "Aggregates multi-feature interactions between price and demand.",
            "role": "Consensus Benchmark"
        },
        {
            "name": "Linear Regression (OLS)",
            "type": "Econometric Baseline",
            "prediction": f"{pred_ols:+.1f}%",
            "value": round(pred_ols, 1),
            "status": "Bullish" if pred_ols >= 0 else "Bearish",
            "description": "Standard linear baseline to verify consistency.",
            "role": "Sanity Check Baseline"
        }
    ]

    return {
        "company_name": req.company_name,
        "direction": direction,
        "hot_probability": round(hot_prob * 100, 1),
        "expected_gain": round(pred_huber, 1),
        "expected_median": round(pred_median, 1),
        "range_lower": round(pred_lower, 1),
        "range_upper": round(pred_upper, 1),
        "predicted_range": f"{pred_lower:+.1f}% to {pred_upper:+.1f}%",
        "range_span": round(pred_upper - pred_lower, 1),
        "verdict": verdict,
        "verdict_badge": verdict_badge,
        "verdict_color": verdict_color,
        "action_advice": action_advice,
        "models_breakdown": models_breakdown,
        "benchmarks": {
            "Huber (Best Model)": round(pred_huber, 1),
            "Gradient Boosting": round(pred_gbr, 1),
            "Random Forest": round(pred_rf, 1),
            "Linear Regression": round(pred_ols, 1),
        },
        "corridor_10": [round(pred_huber - 10, 1), round(pred_huber + 10, 1)],
        "corridor_15": [round(pred_huber - 15, 1), round(pred_huber + 15, 1)],
        "key_drivers": drivers,
        "market_regime": "Bullish / Supportive" if (req.nifty_bull_regime or 1) == 1 else "Cautious / Bearish"
    }


@app.post("/api/predict")
def predict(req: PredictRequest):
    return _run_inference(req)


@app.post("/api/predict/phase1")
def predict_phase1(req: Phase1PredictRequest):
    """Predict pre-IPO direction (Hot or Not) using fundamentals and market regime only."""
    return _run_phase1_inference(req)


@app.post("/api/sensitivity")
def get_sensitivity(req: PredictRequest):
    """Compute sensitivity curves across varying QIB subscription and Nifty macro shocks."""
    qib_levels = [0.5, 2.0, 5.0, 12.0, 25.0, 50.0, 100.0, 150.0, 220.0]
    qib_curve = []
    base_dict = req.model_dump()

    for q in qib_levels:
        sim_data = base_dict.copy()
        sim_data['qib'] = float(q)
        # Approximate proportional total subscription shift
        sim_data['total'] = max(0.5, float(sim_data.get('total', 5.0)) * (q / max(1.0, req.qib)))
        sim_req = PredictRequest(**sim_data)
        out = _run_inference(sim_req)
        qib_curve.append({
            "qib": q,
            "expected_gain": out['expected_gain'],
            "range_lower": out['range_lower'],
            "range_upper": out['range_upper'],
            "hot_probability": out['hot_probability']
        })

    nifty_shocks = [-6.0, -3.0, 0.0, 3.0, 6.0]
    shock_matrix = []
    for ret in nifty_shocks:
        sim_data = base_dict.copy()
        sim_data['nifty_30d_return'] = float(ret)
        sim_data['nifty_bull_regime'] = 1 if ret >= 0 else 0
        sim_req = PredictRequest(**sim_data)
        out = _run_inference(sim_req)
        shock_matrix.append({
            "nifty_30d_return": ret,
            "expected_gain": out['expected_gain'],
            "direction": out['direction'],
            "regime": "Bullish" if ret >= 0 else "Bearish"
        })

    return {
        "company_name": req.company_name,
        "base_expected_gain": _run_inference(req)['expected_gain'],
        "qib_curve": qib_curve,
        "shock_matrix": shock_matrix
    }


_FEEDBACK_REQUESTS = defaultdict(list)
_MAX_FEEDBACK_PER_HOUR = 20


@app.post("/api/feedback", response_model=FeedbackResponse)
def submit_feedback(req: FeedbackCreate, request: Request, db: Session = Depends(get_db)):
    """
    Accepts user bug reports, feature suggestions, data corrections, and general feedback.
    Stores submission in database and routes inquiry to ipo.intelligence.app@gmail.com.
    Rate-limited per client IP.
    """
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    recent = [t for t in _FEEDBACK_REQUESTS[client_ip] if now - t < 3600]
    if len(recent) >= _MAX_FEEDBACK_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Submission limit reached. Please try again later."
        )
    _FEEDBACK_REQUESTS[client_ip] = recent + [now]

    today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    feedback_id = f"FB-{today_str}-{secrets.token_hex(3).upper()}"

    submission = FeedbackSubmission(
        feedback_id=feedback_id,
        name=req.name.strip() if req.name else None,
        email=req.email.lower().strip(),
        category=req.category.strip(),
        subject=req.subject.strip(),
        message=req.message.strip(),
        rating=req.rating,
        ip_address=client_ip,
    )
    db.add(submission)
    db.commit()

    # Dispatch email to ipo.intelligence.app@gmail.com
    delivery = send_feedback_email(
        feedback_id=feedback_id,
        name=submission.name,
        email=submission.email,
        category=submission.category,
        subject=submission.subject,
        message=submission.message,
        rating=submission.rating
    )

    return {
        "success": True,
        "feedback_id": feedback_id,
        "message": f"Feedback received successfully. Registered ticket {feedback_id} routed to {PROJECT_CONTACT_EMAIL}.",
        "target_email": PROJECT_CONTACT_EMAIL,
        "delivery_status": delivery.get("status"),
        "delivery_channel": delivery.get("channel"),
        "created_at": datetime.now(timezone.utc),
    }


@app.get("/api/contact", response_model=ContactInfoResponse)
def get_contact_info():
    """Returns official contact information and support channels for IPO Intelligence."""
    return {
        "email": PROJECT_CONTACT_EMAIL,
        "project_name": "IPO Intelligence & Prediction Engine",
        "version": "2.0.0",
        "support_sla": "Typically within 24–48 business hours",
        "channels": {
            "bugs": "Bug Reports & Discrepancies",
            "features": "Feature & Analytics Requests",
            "data": "IPO Subscription & Market Data Corrections",
            "partnerships": "Institutional & Research Inquiries",
        },
    }



_CHAT_REQUESTS = defaultdict(list)
_MAX_CHAT_PER_MINUTE = 30


class CompanionMessage(BaseModel):
    role: str = Field(..., max_length=50)
    content: str = Field(..., max_length=3000)


class CompanionChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User prompt to AI companion")
    history: Optional[List[CompanionMessage]] = Field(default=[], max_length=20)
    context: Optional[Dict[str, Any]] = None


@app.post("/api/companion/chat")
def companion_chat(req: CompanionChatRequest, request: Request):
    """
    AI Companion Guide powered by Groq with context injection and zero-fail local fallback.
    Protected against denial-of-service and budget exhaustion via sliding-window rate limiting.
    """
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    _CHAT_REQUESTS[client_ip] = [t for t in _CHAT_REQUESTS[client_ip] if now - t < 60]
    if len(_CHAT_REQUESTS[client_ip]) >= _MAX_CHAT_PER_MINUTE:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many AI chat queries. Please wait a moment before sending another message."
        )
    _CHAT_REQUESTS[client_ip].append(now)

    history_dicts = [{"role": m.role, "content": m.content} for m in (req.history or [])]
    return query_groq_companion(req.message, history=history_dicts, context=req.context)


@app.get("/robots.txt", response_class=PlainTextResponse)
def robots_txt():
    """SEO Robots exclusion standard."""
    return """User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://ipo-intelligence.terminal/sitemap.xml
"""


@app.get("/sitemap.xml")
def sitemap_xml():
    """Dynamic XML Sitemap for search engines."""
    content = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://ipo-intelligence.terminal/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://ipo-intelligence.terminal/?tab=upcoming</loc>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://ipo-intelligence.terminal/?tab=trackrecord</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://ipo-intelligence.terminal/?tab=guide</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>
"""
    return Response(content=content, media_type="application/xml")


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    for fav_path in ["frontend/dist/favicon.svg", "frontend/public/favicon.svg"]:
        if os.path.exists(fav_path):
            return FileResponse(fav_path, media_type="image/svg+xml")
    return Response(status_code=204)


# Mount built static assets if present
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("api:app", host="0.0.0.0", port=port, log_level="info")
