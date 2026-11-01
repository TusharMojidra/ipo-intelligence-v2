import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

import pandas as pd
from src.unified_eval import unified_evaluation


def main():
    data_path = os.path.join(BASE_DIR, 'data', 'processed', 'cleaned_ipo_data.csv')
    df = pd.read_csv(data_path)
    print(f"Loaded {len(df)} IPOs")

    figures_dir = os.path.join(BASE_DIR, 'reports', 'figures')
    summary, range_preds_df = unified_evaluation(
        df, outdir=figures_dir, split_year=2023
    )

    print("\n" + "=" * 70)
    print("UNIFIED EVALUATION SUMMARY")
    print("=" * 70)
    print(f"Split year: {summary['split_year']}, Test IPOs: {summary['test_n']}")
    print(
        "Test class balance: neg="
        f"{summary['test_classes']['neg']}, "
        f"hot={summary['test_classes']['hot']}"
    )
    print()
    print("--- 1. BINARY CLASSIFIER (Pre-IPO Direction: Gain > 0) ---")
    for k, v in summary['classifier'].items():
        print(f"  {k}: {v}")
    print()
    print("--- 2. RANGE / BUCKET PREDICTOR (Listing Band Hit-Rate) ---")
    for k, v in summary['range_bucket_predictor'].items():
        print(f"  {k}: {v}")
    print()
    print("--- 3. POINT REGRESSOR BENCHMARKS ---")
    for k, v in summary['point_regression'].items():
        print(f"  {k}: {v}")
    print()

    # Save results
    out = os.path.join(BASE_DIR, 'reports')
    os.makedirs(out, exist_ok=True)
    pd.DataFrame([summary]).to_csv(
        os.path.join(out, 'unified_eval_results.csv'), index=False
    )
    print(f"Saved results to {out}/unified_eval_results.csv")


if __name__ == '__main__':
    main()
