import os

# Fix OpenBLAS threading issue on Windows: set env vars before numpy import
os.environ.setdefault('OPENBLAS_NUM_THREADS', '1')
os.environ.setdefault('OMP_NUM_THREADS', '1')

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support,
    mean_absolute_error, mean_squared_error, r2_score
)

# Import feature engineering and model builders from existing modules
from src.feature_engineering import (
    add_listing_gain, add_phase2_features
)
from src.models_classification_v2 import (
    PRE_IPO_FEATURES, run_binary_classification
)
from src.models_regression import (
    FEATURES, run_regression, run_range_regression
)

SPLIT_YEAR = 2023


def build_binary_target(df):
    """Hot = gain > 0 (upward move); Not_Hot = gain <= 0."""
    df = df.copy()
    df = add_listing_gain(df)
    df['gain'] = df['Listing Gain']
    df['y_hot'] = (df['gain'] > 0).astype(int)
    return df


def eval_binary_classifier(y_true, y_pred):
    """Return classification metrics dict."""
    acc = accuracy_score(y_true, y_pred)
    prec, rec, f1, _ = precision_recall_fscore_support(
        y_true, y_pred, average=None, zero_division=0
    )
    return {
        'accuracy': round(acc, 4),
        'precision_0': round(prec[0], 4),
        'recall_0': round(rec[0], 4),
        'f1_0': round(f1[0], 4),
        'precision_1': round(prec[1], 4),
        'recall_1': round(rec[1], 4),
        'f1_1': round(f1[1], 4),
    }


def eval_regression(y_true, y_pred):
    """Return regression metrics dict."""
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)
    dir_acc = float(np.mean(np.sign(y_pred) == np.sign(y_true)))
    return {
        'mae': round(mae, 4),
        'rmse': round(rmse, 4),
        'r2': round(r2, 4),
        'direction_accuracy': round(dir_acc, 4),
    }


def unified_evaluation(df, outdir='reports/figures', split_year=SPLIT_YEAR):
    """Full unified evaluation: Phase 2 binary classifier + range bucket predictor + point regressor."""
    os.makedirs(outdir, exist_ok=True)

    # Pre-process full Phase 2 features (Macro regime + Trailing primary sentiment + issue structure)
    df = add_phase2_features(df)
    df = build_binary_target(df)

    # --- 1. Binary classifier (direction: up vs down using pre-IPO features) ---
    clf_summary, clf_info = run_binary_classification(
        df, outdir=outdir, split_year=split_year, plot_cm=True, save_csv=True
    )
    clf_metrics = eval_binary_classifier(clf_info['y_test'], clf_info['y_pred'])

    # --- 2. Range / Bucket Predictor (Quantile 10th-90th & Corridors) ---
    range_summary, range_preds_df, range_metrics = run_range_regression(
        df, outdir=outdir, split_year=split_year, use_extra_features=True
    )

    # --- 3. Point Regressor Benchmarks (Huber / Linear / DT / RF / GBR) ---
    reg_summary, reg_best_y_pred = run_regression(
        df, outdir=outdir, split_year=split_year, use_extra_features=True
    )

    data_reg = df.dropna(subset=FEATURES + ['Listing Gain']).copy()
    test_reg_mask = data_reg['Year'] > split_year
    y_test_reg = data_reg.loc[test_reg_mask, 'Listing Gain'].values

    reg_metrics = eval_regression(y_test_reg, reg_best_y_pred)
    best_reg_name = reg_summary['MAE'].idxmin() if 'MAE' in reg_summary.columns else 'Huber Regression'
    reg_metrics['model'] = best_reg_name

    # Combined summary
    summary = {
        'split_year': split_year,
        'test_n': int(len(clf_info['y_test'])),
        'test_classes': {
            'neg': int((clf_info['y_test'] <= 0).sum()),
            'hot': int((clf_info['y_test'] > 0).sum()),
        },
        'classifier': clf_metrics,
        'range_bucket_predictor': range_metrics,
        'point_regression': reg_metrics,
    }

    return summary, range_preds_df
