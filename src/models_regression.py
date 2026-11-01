import os

os.environ.setdefault('OPENBLAS_NUM_THREADS', '1')
os.environ.setdefault('OMP_NUM_THREADS', '1')

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import (GradientBoostingRegressor, RandomForestClassifier,
                              RandomForestRegressor, VotingClassifier, VotingRegressor)
from sklearn.linear_model import HuberRegressor, LinearRegression
from sklearn.metrics import (accuracy_score, classification_report,
                             mean_absolute_error, mean_squared_error, r2_score)
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.tree import DecisionTreeRegressor
from xgboost import XGBClassifier, XGBRegressor

from src.feature_engineering import (
    add_log_features, add_demand_ratios, add_phase2_features
)

# --- Features (pre-listing-known only; zero List Price leakage) ---
FEATURES_BASE = [
    'log_QIB', 'log_HNI', 'log_RII', 'log_Total',
    'log_Issue_Size', 'log_Offer_Price'
]
FEATURES_EXTRA = [
    'QIB_share', 'RII_share', 'HNI_to_QIB', 'Month',
    'log_Issue_Size_x_log_Offer_Price',
    # Phase 2 Market & Trailing Wave Signals
    'Nifty_30d_return',
    'Nifty_5d_return',
    'Nifty_30d_volatility',
    'Nifty_52w_dist',
    'Nifty_Bull_Regime',
    'Trailing_5_Avg_Gain',
    'Trailing_30d_IPO_Count',
    'Issue_Size_vs_Annual_Median',
]
FEATURES = FEATURES_BASE + FEATURES_EXTRA
TARGET = 'Listing Gain'
SPLIT_YEAR = 2023  # out-of-time split: train on IPOs up to this year, test on later ones
CV_SPLITS = 3


def _directional_accuracy(y_true, y_pred):
    """Fraction of IPOs where predicted sign of Listing Gain matches actual."""
    return float(np.mean((np.sign(y_true)) == np.sign(y_pred)))


def run_regression(df, outdir="reports/figures", split_year=SPLIT_YEAR,
                   use_extra_features=True):
    """Predict Listing Gain (%) point-estimate with an OUT-OF-TIME split.

    Huber / Linear / DT / RF / GBR baselines.
    """
    os.makedirs(outdir, exist_ok=True)

    if 'Nifty_30d_return' not in df.columns or 'Trailing_5_Avg_Gain' not in df.columns:
        df = add_phase2_features(df)
    else:
        df = add_log_features(df)
        df = add_demand_ratios(df)

    features = FEATURES if use_extra_features else FEATURES_BASE
    data = df.dropna(subset=features + [TARGET]).copy()
    X = data[features]
    y = data[TARGET]

    # Out-of-time split
    train_mask = data['Year'] <= split_year
    X_train, X_test = X[train_mask], X[~train_mask]
    y_train, y_test = y[train_mask], y[~train_mask]

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    tscv = TimeSeriesSplit(n_splits=CV_SPLITS)

    models = {
        'Huber Regression': (HuberRegressor(max_iter=5000),
                             {'alpha': [1e-2], 'epsilon': [1.35]}),
        'Linear Regression': (LinearRegression(), {}),
        'Decision Tree': (DecisionTreeRegressor(random_state=42),
                          {'max_depth': [5, None]}),
        'Random Forest': (RandomForestRegressor(random_state=42),
                          {'n_estimators': [200], 'max_depth': [None, 10]}),
        'Gradient Boosting': (GradientBoostingRegressor(random_state=42),
                              {'n_estimators': [200], 'learning_rate': [0.05]}),
        # Saved model: models/ipo_models.joblib
        'XGBoost': (None, {}),
        'Voting (XGB+RF)': (None, {}),
    }

    result_rows = []
    best_mae = float('inf')
    best_model_name = None
    best_y_pred = None

    for name, (model, params) in models.items():
        if model is None:
            print()
            print(f'[{name}] SKIPPED (use saved models/ipo_models.joblib)')
            print()
            continue

        print()
        print(f'--- Training: {name} ---')
        if params:
            gs = GridSearchCV(model, params, cv=tscv,
                              scoring='neg_mean_absolute_error',
                              n_jobs=1, verbose=0)
            gs.fit(X_train_s, y_train)
            model = gs.best_estimator_
            print(f'Best params: {gs.best_params_} | MAE: {-gs.best_score_:.3f}')
        else:
            model.fit(X_train_s, y_train)

        y_pred = model.predict(X_test_s)
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)
        dir_acc = _directional_accuracy(y_test, y_pred)

        print(f'MAE: {mae:.3f} | RMSE: {rmse:.3f} | R2: {r2:.4f} | DirAcc: {dir_acc:.4f}')

        result_rows.append({
            'Model': name,
            'MAE': round(mae, 3),
            'RMSE': round(rmse, 3),
            'R2': round(r2, 4),
            'Directional Accuracy': round(dir_acc, 4),
        })

        if mae < best_mae:
            best_mae = mae
            best_model_name = name
            best_y_pred = y_pred

    summary = pd.DataFrame(result_rows).set_index('Model')
    print()
    print('=== REGRESSION SUMMARY ===')
    print(summary.round(4).to_string())

    summary.to_csv(f'{outdir}/regression_summary.csv')

    if best_y_pred is not None:
        print(f'\nBest model: {best_model_name} (MAE: {best_mae:.3f})')

    return summary, best_y_pred


def run_range_regression(df, outdir="reports/figures", split_year=SPLIT_YEAR,
                         use_extra_features=True):
    """Predict realistic Listing Gain Range [Lower, Upper] using Quantile Regression.

    Instead of guessing a single decimal, this predicts an expected listing range band
    (10th to 90th percentile) plus tighter investor corridors, evaluating actual Bucket Accuracy (Hit Rate).
    """
    os.makedirs(outdir, exist_ok=True)

    if 'Nifty_30d_return' not in df.columns or 'Trailing_5_Avg_Gain' not in df.columns:
        df = add_phase2_features(df)
    else:
        df = add_log_features(df)
        df = add_demand_ratios(df)

    features = FEATURES if use_extra_features else FEATURES_BASE
    data = df.dropna(subset=features + [TARGET]).copy()
    X = data[features]
    y = data[TARGET]

    train_mask = data['Year'] <= split_year
    X_train, X_test = X[train_mask], X[~train_mask]
    y_train, y_test = y[train_mask].values, y[~train_mask].values
    test_meta = data[~train_mask].copy()

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    print()
    print("=" * 70)
    print("TASK D: LISTING GAIN RANGE PREDICTOR (Phase 2 Quantile Regression)")
    print(f"Features ({len(features)}): {features}")
    print(f"Train: {len(X_train)} IPOs (year <= {split_year}) | Test: {len(X_test)} IPOs (year > {split_year})")
    print("Predicting target band: Lower (10th%) to Upper (90th%)")
    print("=" * 70)

    lower_model = GradientBoostingRegressor(
        loss='quantile', alpha=0.10, n_estimators=150,
        max_depth=3, learning_rate=0.05, random_state=42
    )
    median_model = GradientBoostingRegressor(
        loss='quantile', alpha=0.50, n_estimators=150,
        max_depth=3, learning_rate=0.05, random_state=42
    )
    upper_model = GradientBoostingRegressor(
        loss='quantile', alpha=0.90, n_estimators=150,
        max_depth=3, learning_rate=0.05, random_state=42
    )

    lower_model.fit(X_train_s, y_train)
    median_model.fit(X_train_s, y_train)
    upper_model.fit(X_train_s, y_train)

    pred_lower = lower_model.predict(X_test_s)
    pred_median = median_model.predict(X_test_s)
    pred_upper = upper_model.predict(X_test_s)

    # Ensure monotonic ordering: lower <= median <= upper
    pred_lower = np.minimum(pred_lower, pred_median)
    pred_upper = np.maximum(pred_upper, pred_median)

    in_bucket_80 = (y_test >= pred_lower) & (y_test <= pred_upper)
    in_corridor_10 = (y_test >= pred_median - 10.0) & (y_test <= pred_median + 10.0)
    in_corridor_15 = (y_test >= pred_median - 15.0) & (y_test <= pred_median + 15.0)

    bucket_acc_80 = float(np.mean(in_bucket_80))
    bucket_acc_10 = float(np.mean(in_corridor_10))
    bucket_acc_15 = float(np.mean(in_corridor_15))
    avg_span = float(np.mean(pred_upper - pred_lower))
    center_mae = float(mean_absolute_error(y_test, pred_median))
    dir_acc = _directional_accuracy(y_test, pred_median)

    print()
    print("--- Range / Bucket Evaluation Results ---")
    print(f"Bucket Accuracy (80% Confidence Band): {bucket_acc_80 * 100:.2f}% (Hit Rate)")
    print(f"Bucket Accuracy (±10% Investor Corridor): {bucket_acc_10 * 100:.2f}%")
    print(f"Bucket Accuracy (±15% Investor Corridor): {bucket_acc_15 * 100:.2f}%")
    print(f"Average Predicted Range Span:           {avg_span:.2f}% points")
    print(f"Center Prediction (Median) MAE:         {center_mae:.2f}%")
    print(f"Center Directional Accuracy:            {dir_acc * 100:.2f}%")

    preds_df = pd.DataFrame({
        'Date': test_meta['Date'].values if 'Date' in test_meta.columns else np.nan,
        'IPO_Name': test_meta['IPO_Name'].values if 'IPO_Name' in test_meta.columns else [f'IPO_{i}' for i in range(len(y_test))],
        'Actual_Gain': np.round(y_test, 2),
        'Pred_Lower': np.round(pred_lower, 2),
        'Pred_Median': np.round(pred_median, 2),
        'Pred_Upper': np.round(pred_upper, 2),
        'Predicted_Range': [f"{l:+.1f}% to {u:+.1f}%" for l, u in zip(pred_lower, pred_upper)],
        'In_Bucket_80': in_bucket_80,
        'In_Corridor_10': in_corridor_10,
        'In_Corridor_15': in_corridor_15,
    })

    preds_path = os.path.join(outdir, 'range_predictions.csv')
    preds_df.to_csv(preds_path, index=False)
    print(f"Saved: {preds_path}")

    # Plot range visualization
    try:
        plt.figure(figsize=(12, 6))
        n_plot = min(40, len(preds_df))
        plot_df = preds_df.iloc[-n_plot:].reset_index(drop=True)
        x_axis = np.arange(n_plot)

        plt.fill_between(x_axis, plot_df['Pred_Lower'], plot_df['Pred_Upper'],
                         color='skyblue', alpha=0.4, label='Predicted Range [10% to 90%]')
        plt.plot(x_axis, plot_df['Pred_Median'], color='navy', linestyle='--', linewidth=1.5, label='Predicted Median')
        plt.scatter(x_axis, plot_df['Actual_Gain'], color='crimson', zorder=5, s=35, label='Actual Listing Gain')

        plt.axhline(0, color='gray', linestyle=':', linewidth=1)
        plt.title(f'Phase 2 Listing Gain Range Forecast (Recent {n_plot} Test IPOs)\nBucket Hit Rate: {bucket_acc_80*100:.1f}%', fontsize=12)
        plt.xlabel('Test IPO Index (Chronological)')
        plt.ylabel('Listing Gain (%)')
        plt.legend(loc='upper right')
        plt.tight_layout()
        plot_path = os.path.join(outdir, 'range_forecast_plot.png')
        plt.savefig(plot_path, dpi=150)
        plt.close()
        print(f"Saved: {plot_path}")
    except Exception as e:
        print(f"Could not generate plot: {e}")

    # Plot median regressor feature importances
    try:
        imp_series = pd.Series(median_model.feature_importances_, index=features).sort_values()
        plt.figure(figsize=(9, 6))
        imp_series.plot(kind='barh', color='teal')
        plt.title('Listing Gain Regressor - Feature Importance (Phase 2)')
        plt.xlabel('Relative Importance')
        plt.tight_layout()
        imp_path = os.path.join(outdir, 'phase2_range_feature_importance.png')
        plt.savefig(imp_path, dpi=150)
        plt.close()
        print(f"Saved: {imp_path}")
    except Exception as e:
        pass

    range_summary = pd.DataFrame([{
        'Model': 'Quantile_Gradient_Boosting_Phase2',
        'Bucket_Accuracy_80': round(bucket_acc_80, 4),
        'Bucket_Accuracy_Corridor_10': round(bucket_acc_10, 4),
        'Bucket_Accuracy_Corridor_15': round(bucket_acc_15, 4),
        'Avg_Range_Span': round(avg_span, 2),
        'Center_MAE': round(center_mae, 3),
        'Directional_Accuracy': round(dir_acc, 4),
    }])
    range_summary.to_csv(os.path.join(outdir, 'range_summary.csv'), index=False)

    range_metrics = {
        'bucket_accuracy_80': round(bucket_acc_80, 4),
        'bucket_accuracy_corridor_10': round(bucket_acc_10, 4),
        'bucket_accuracy_corridor_15': round(bucket_acc_15, 4),
        'avg_range_span': round(avg_span, 2),
        'center_mae': round(center_mae, 3),
        'direction_accuracy': round(dir_acc, 4),
    }

    return range_summary, preds_df, range_metrics
