# IPO Subscription & Listing Gain Predictor

A machine-learning project that predicts two things for an Indian IPO:

1. **Subscription tier** (Low / Medium / High) — from pre-IPO details only
2. **Listing gain (%)** — after bidding closes, from subscription figures

It includes a full data-science pipeline (cleaning → EDA → feature engineering → modelling →
evaluation) plus a Streamlit dashboard and a terminal demo.

## Tech stack

Python, pandas, NumPy, scikit-learn, XGBoost, SHAP, Streamlit, Plotly/Altair, Matplotlib, Seaborn.

## Quick start

```bash
pip install -r requirements.txt

# 1. Terminal predictor
python predict_ipo.py

# 2. Streamlit dashboard
streamlit run app.py

# 3. Full data-science pipeline (clean → EDA → train → evaluate)
python main.py
```

The trained models are cached to `models/ipo_models.joblib` and are re-trained only when the
cleaned dataset changes, so the app starts instantly after the first run.

## How to use the app

**Step 1 — pre-IPO details** (known before the IPO opens): issue size, offer price, year.
→ gives the predicted subscription tier and the chance of each tier.

**Step 2 — subscription details** (known after bidding closes): QIB, HNI, RII, total
subscription in times.
→ gives the predicted listing gain with a typical error range.

## Project structure

```
app.py                 Streamlit dashboard (dark/light themes, charts, SHAP explainer)
predict_ipo.py         Terminal predictor + shared model training/caching logic
main.py                Full pipeline: load → clean → engineer → EDA → model → evaluate
build_report.py        Generates the HTML backtest / summary reports
requirements.txt       Python dependencies

src/
  data_loader.py           CSV loading
  preprocessing.py         clean_data, drop_unusable_rows,
                           fill_missing_values, winsorize_outliers
  feature_engineering.py   add_log_features, add_subscription_class
  eda.py                   Exploratory data analysis + figures
  models_classification.py Subscription-tier models (LogReg, SVM, RandomForest)
  models_regression.py     Listing-gain models (Linear, Ridge, Huber, ...)
  experiments.py           Experiment sweeps
  experiments2.py          Additional experiment sweeps

data/
  raw/ipo_data.csv                 Original dataset
  processed/cleaned_ipo_data.csv   Cleaned + feature-engineered dataset

models/ipo_models.joblib    Cached trained models
notebooks/                  Exploration notebooks
reports/figures/            Evaluation figures and metric summaries (CSV + PNG)
docs/                       Backtest reports, technical guide, code explanation
.streamlit/config.toml      Dashboard theme (dark)
```

## Approach notes

- Heavy-tailed features (issue size, offer price, subscription multiples) are `log1p`
  transformed before scaling.
- The subscription tier target is derived from total subscription using quantile-style
  cut-offs, then treated as a 3-class problem.
- The listing-gain model deliberately uses a robust regressor because extreme gains
  (e.g. listing-day spikes) distort ordinary least squares.
- Cached models are invalidated with a fingerprint (hash) of the cleaned dataset, so editing
  the data transparently triggers a retrain.
- Reported expectations: tier accuracy ≈ 61%, listing-gain R² ≈ 0.30 (error ≈ ±18 points).
  These are rough estimates on noisy financial data — **not financial advice**.

## Licence

For educational / portfolio purposes.
