import os

os.environ.setdefault('OPENBLAS_NUM_THREADS', '1')
os.environ.setdefault('OMP_NUM_THREADS', '1')

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import pandas as pd
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix,
    f1_score, precision_score, recall_score
)
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from xgboost import XGBClassifier

from src.feature_engineering import (
    add_listing_gain, add_pre_ipo_features, add_phase2_features
)

# Pre-IPO features only:
# Includes issue structure + Phase 2 macroeconomic and trailing primary market signals.
# Strictly known before IPO listing date (zero future leakage).
PRE_IPO_FEATURES = [
    'log_Issue_Size',
    'log_Offer_Price',
    'Year',
    'Issue_Shares',
    'Month',
    # Phase 2 Market & Primary Sentiment Features
    'Nifty_30d_return',
    'Nifty_5d_return',
    'Nifty_30d_volatility',
    'Nifty_52w_dist',
    'Nifty_Bull_Regime',
    'Trailing_5_Avg_Gain',
    'Trailing_30d_IPO_Count',
    'Issue_Size_vs_Annual_Median',
]

# Binary target: Hot = gain > 0 (upward move); Not_Hot = gain <= 0
TARGET = 'y_hot'
SPLIT_YEAR = 2023


def build_target(df):
    df = df.copy()
    df = add_listing_gain(df)
    df['gain'] = df['Listing Gain']
    df['y_hot'] = (df['gain'] > 0).astype(int)
    return df


def run_binary_classification(df, outdir='reports/figures', split_year=SPLIT_YEAR,
                              plot_cm=True, save_csv=True):
    os.makedirs(outdir, exist_ok=True)
    if 'Nifty_30d_return' not in df.columns or 'Trailing_5_Avg_Gain' not in df.columns:
        df = add_phase2_features(df)
    else:
        df = add_pre_ipo_features(df)
    df = build_target(df)
    data = df.dropna(subset=PRE_IPO_FEATURES + [TARGET]).copy()
    X = data[PRE_IPO_FEATURES]
    y = data[TARGET]
    train_mask = data['Year'] <= split_year
    X_train, X_test = X[train_mask], X[~train_mask]
    y_train, y_test = y[train_mask], y[~train_mask]

    print()
    print('=' * 70)
    print('TASK C: BINARY CLASSIFICATION (Phase 2 Voting Ensemble: XGB + RF)')
    print('Direction accuracy: predicts gain > 0 vs gain <= 0')
    print(f'Features ({len(PRE_IPO_FEATURES)}): {PRE_IPO_FEATURES}')
    print(f'Target:   gain > 0 (Hot) vs gain <= 0 (Not_Hot)')
    print(f'Train: {len(X_train)} IPOs (year <= {split_year}) | '
          f'Test:  {len(X_test)} IPOs (year > {split_year}) - out-of-time split')
    print(f'Class balance (train): Hot={int(y_train.sum())}, Not_Hot={int((1 - y_train).sum())}')
    print('=' * 70)

    pos = int(y_train.sum())
    neg = int((1 - y_train).sum())
    spw = neg / max(pos, 1)

    xgb = XGBClassifier(
        n_estimators=200, max_depth=4, learning_rate=0.03,
        scale_pos_weight=spw, random_state=42, eval_metric='logloss', n_jobs=1,
    )
    rf = RandomForestClassifier(
        n_estimators=300, max_depth=8, min_samples_leaf=3,
        class_weight='balanced_subsample', random_state=42, n_jobs=1,
    )

    model = VotingClassifier(
        estimators=[('xgb', xgb), ('rf', rf)], voting='soft',
    )
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
    recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
    f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)

    print()
    print('--- Results (test: year > ' + str(split_year) + ') ---')
    print(f'Accuracy : {accuracy:.4f}')
    print(f'Precision: {precision:.4f}')
    print(f'Recall   : {recall:.4f}')
    print(f'F1-Score : {f1:.4f}')
    print()
    print('Classification report:')
    print(classification_report(y_test, y_pred, target_names=['Not_Hot', 'Hot'], zero_division=0))

    results_df = X_test.copy()
    results_df['Actual'] = y_test.values
    results_df['Predicted'] = y_pred
    if save_csv:
        results_df.to_csv(outdir + '/binary_predictions.csv', index=False)

    cm = confusion_matrix(y_test, y_pred, labels=[0, 1])
    if plot_cm:
        plt.figure(figsize=(6, 5))
        plt.imshow(cm, interpolation='nearest', cmap='Blues')
        plt.title('Confusion Matrix - Voting Ensemble (Phase 2 Pre-IPO)')
        plt.colorbar()
        tick_marks = [0, 1]
        plt.xticks(tick_marks, ['Not_Hot', 'Hot'])
        plt.yticks(tick_marks, ['Not_Hot', 'Hot'])
        for i in range(2):
            for j in range(2):
                plt.text(j, i, str(cm[i, j]), ha='center', va='center',
                         color='white' if cm[i, j] > cm.max() / 2 else 'black')
        plt.xlabel('Predicted')
        plt.ylabel('Actual')
        plt.tight_layout()
        plt.savefig(outdir + '/cm_ensemble_binary.png', dpi=150)
        plt.close()

    xgb_est = model.named_estimators_['xgb']
    imp = pd.Series(xgb_est.feature_importances_, index=PRE_IPO_FEATURES).sort_values(ascending=False)
    print()
    print('XGBoost feature importance (ensemble sub-model):')
    print(imp.round(4).to_string())

    # Plot feature importance
    try:
        plt.figure(figsize=(8, 6))
        imp.sort_values().plot(kind='barh', color='steelblue')
        plt.title('Pre-IPO Directional Classifier - Feature Importance (Phase 2)')
        plt.xlabel('XGBoost Relative Importance')
        plt.tight_layout()
        plt.savefig(outdir + '/phase2_classifier_feature_importance.png', dpi=150)
        plt.close()
    except Exception as e:
        pass

    summary = pd.DataFrame([{
        'Model': 'VotingEnsemble_Phase2_binary',
        'Best_Params': 'Voting(XGB n_est=200,depth=4,lr=0.03 + RF n_est=300,depth=8), soft voting',
        'Accuracy': accuracy,
        'Precision': precision,
        'Recall': recall,
        'F1': f1,
    }])
    if save_csv:
        summary.to_csv(outdir + '/binary_classification_summary.csv', index=False)

        comp_path = outdir + '/new_model_comparison.csv'
        row = pd.DataFrame([{
            'Model': 'VotingEnsemble_Phase2_binary',
            'Target': 'gain>0 / gain<=0',
            'Features': ','.join(PRE_IPO_FEATURES),
            'Accuracy': round(accuracy, 4),
            'Precision': round(precision, 4),
            'Recall': round(recall, 4),
            'F1': round(f1, 4),
        }])
        if os.path.exists(comp_path):
            existing = pd.read_csv(comp_path)
            existing = pd.concat([existing, row], ignore_index=True)
        else:
            existing = row
        existing.to_csv(comp_path, index=False)

    if save_csv:
        print()
        print('Saved: ' + outdir + '/binary_predictions.csv')
        print('Saved: ' + outdir + '/binary_classification_summary.csv')
        print('Saved: ' + outdir + '/new_model_comparison.csv')
        print('Saved: ' + outdir + '/phase2_classifier_feature_importance.png')
    if plot_cm:
        print('Saved: ' + outdir + '/cm_ensemble_binary.png')

    return summary, {
        'accuracy': accuracy, 'precision': precision, 'recall': recall, 'f1': f1,
        'X_train': X_train, 'X_test': X_test, 'y_train': y_train, 'y_test': y_test,
        'y_pred': y_pred,
    }
