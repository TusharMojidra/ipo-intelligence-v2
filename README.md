---
title: IPO Intelligence Terminal
emoji: 📈
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# IPO Intelligence Terminal V2.0 (NSE / BSE)

> **Institutional-grade, zero-dependency, 100% offline IPO intelligence platform for Indian Mainboard & SME offerings.**  
> Built with Quantitative Machine Learning (XGBoost, Random Forest, Quantile Gradient Boosting, Huber Regressor) + React 19 Hardware-Accelerated Terminal.

For complete in-depth architectural and mathematical documentation, read:  
👉 **[PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)**

---

## Highlights & Accuracy Track Record

- **Zero Target Leakage:** Strictly isolates pre-IPO features; zero exposure to listing prices.
- **Phase 1 Pre-IPO Directional Classifier (Voting Ensemble):**
  - **86.4% Recall on Profitable Debuts** (127 of 147 winning IPOs correctly caught in advance).
  - **63.3% Out-of-Time Directional Accuracy** on 210 unseen debuts ($Year > 2023$).
- **Phase 2 Post-Subscription Corridor Forecaster (Quantile Regression):**
  - **79.4% Out-of-Time 80% Corridor Hit Rate** (4 out of every 5 IPOs land inside predicted $[Lower, Upper]$ range).
  - **16.6% Huber MAE** (vs. 24.3% on standard OLS).
- **Automated Red Flag & Safety Audit:** 4-axis rule-based expert engine evaluating promoter exit ratios, institutional anchor buffers, mega-scale digestion, and Nifty momentum.
- **Capital Flow Analyzer:** Bi-color visual breakdown of Fresh Issue (company growth capital) vs. Offer for Sale (promoter cash-out).
- **60 FPS What-If Demand Sensitivity:** Real-time hardware-accelerated dial meter simulating institutional squeezes and retail panic.
- **One-Click Dossier Export:** Instant Print/PDF (clean white A4 media print), Markdown clipboard summary, and raw JSON export.

---

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt
npm install --prefix frontend

# 2. Build production frontend
npm run build --prefix frontend

# 3. Launch Web Terminal on http://127.0.0.1:8000
python run_app.py
```
*(On Windows, you can also double-click `start_app.bat`).*

---

## Directory Structure

```
IPO_VERSION2.0/
├── api.py                     # FastAPI backend (Phase 1/2 inference, auth, feedback & upcoming IPOs)
├── run_app.py                 # Desktop launcher & Uvicorn daemon (LAN/mobile access enabled)
├── run_unified_eval.py        # CLI evaluation benchmark suite
├── requirements.txt           # Python dependencies
├── start_app.bat              # Windows batch launcher
├── PROJECT_DOCUMENTATION.md   # Complete technical & architectural documentation
├── README.md                  # Project overview & quickstart
├── backend/                   # Authentication, user data, SQLite db & email service
│   ├── db.py                  # SQLAlchemy session & SQLite database setup
│   ├── models.py              # User, Session & FeedbackSubmission ORM models
│   ├── schemas.py             # Pydantic schemas for auth & feedback
│   ├── security.py            # Password hashing & JWT token handling
│   ├── email_service.py       # SMTP notification service for feedback
│   └── routers/               # Modular FastAPI sub-routers (auth, user_data)
├── data/
│   ├── raw/                   # Raw historical IPOs & daily Nifty 50 data
│   │   ├── ipo_data.csv       # Audited historical Indian IPO records
│   │   └── nifty_daily.csv    # Historical Nifty 50 daily bars for market regime calculation
│   └── processed/             # Cleaned feature-engineered dataset
│       └── cleaned_ipo_data.csv
├── src/
│   ├── companion_engine.py    # AI Market Companion with Groq LLM integration
│   ├── data_loader.py         # CSV loading utilities
│   ├── feature_engineering.py # Log transforms, float digestion & macro regimes
│   ├── market_data_fetcher.py # Daily Nifty historical prices & indicators
│   ├── models_classification_v2.py # Phase 1 XGBoost + RF ensemble
│   ├── models_regression.py   # Phase 2 Quantile & Huber regressors
│   ├── upcoming_ipo_fetcher.py# Live DRHP scraper & upcoming pipeline
│   └── unified_eval.py        # Unified evaluation benchmark harness
├── reports/                   # Model evaluation benchmarks, metrics & figures
│   ├── unified_eval_results.csv
│   └── figures/               # Prediction plots, feature importance & historical tracking
├── tests/                     # 73 automated Pytest unit, security & integration tests
└── frontend/                  # React 19 + TypeScript + Vite 6 Terminal
    ├── src/
    │   ├── App.tsx            # Main state & in-place accordion container
    │   ├── components/        # Terminal cards, dial gauge, modal & pipeline
    │   ├── context/           # React Auth context & token persistence
    │   └── utils/             # Heuristic safety engine & 60 FPS simulator
    └── dist/                  # Production static assets
```

---
*For questions or detailed metrics, refer to [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md).*
