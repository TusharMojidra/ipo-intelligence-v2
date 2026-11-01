import numpy as np
import pandas as pd

SUBSCRIPTION_COLS = ['QIB', 'HNI', 'RII', 'Total']


def add_listing_gain(df):
    """Compute Listing Gain (%) if the column is not already present in the data."""
    if 'Listing Gain' in df.columns:
        return df
    df["Listing Gain"] = ((df["List Price"] - df["Offer Price"]) / df["Offer Price"]) * 100
    return df


def add_subscription_class(df, low=2.0, high=10.0):
    """Categorize the continuous Total subscription into Low / Medium / High classes.

    Low    : Total <  low      (under / lightly subscribed)
    Medium : low <= Total < high
    High   : Total >= high     (hot IPO)
    """
    def classify(x):
        if x < low:
            return 'Low'
        if x < high:
            return 'Medium'
        return 'High'

    df['Subscription_Class'] = df['Total'].apply(classify)
    return df


def add_log_features(df):
    """log1p transforms for the heavily right-skewed subscription and size columns.
    Recent IPOs are far more oversubscribed (median 26x vs 8x before 2024), so the
    log scale compresses those extremes and helps the models generalise across time."""
    for c in SUBSCRIPTION_COLS:
        df[f'log_{c}'] = np.log1p(df[c])
    df['log_Issue_Size'] = np.log1p(df['Issue_Size(crores)'])
    df['log_Offer_Price'] = np.log1p(df['Offer Price'])
    return df


def add_demand_ratios(df):
    """Share-of-demand features (the top predictors in similar published projects)."""
    total_demand = df[SUBSCRIPTION_COLS].sum(axis=1).replace(0, np.nan)
    df['QIB_share'] = df['QIB'] / total_demand
    df['RII_share'] = df['RII'] / total_demand
    df['HNI_to_QIB'] = df['HNI'] / df['QIB'].replace(0, np.nan)
    df['Issue_Price_Ratio'] = df['Issue_Size(crores)'] / df['Offer Price'].replace(0, np.nan)
    return df


def add_pre_ipo_features(df):
    """Add pre-IPO known features used for the binary Hot/Not_Hot classification.

    Only features known BEFORE the IPO opens:
      - Month               : extraction from the Date column (YYYY-MM-DD)
      - Issue_Shares        : Issue_Size * 10^7 / Offer Price
    Plus the existing log transforms.
    """
    out = df.copy()

    # Month: extract from ISO date (YYYY-MM-DD)
    out['Month'] = out['Date'].astype(str).str.split('-').str[1].astype(int)

    # Issue_Shares: total shares offered (Issue_Size in crores -> shares) / offer price
    out['Issue_Shares'] = out['Issue_Size(crores)'] * 10_000_000 / out['Offer Price'].replace(0, np.nan)

    # Binary target: Hot (>= 5x total subscription) vs Not_Hot (< 5x)
    out['Hot'] = (out['Total'] >= 5.0).astype(int)

    # Keep the log features too (used as baseline comparison)
    out = add_log_features(out)
    out = add_demand_ratios(out)
    return out


def add_arena_v2_features(df):
    """Arena v2: pre-IPO-known feature types to break ceiling.
    No List Price / CMP leakage. All derivable from cleaned_ipo_data.csv.
    """
    out = df.copy()
    out = add_log_features(out)
    out = add_demand_ratios(out)

    out['Month'] = out['Date'].astype(str).str.split('-').str[1].astype(int)
    out['Quarter'] = ((out['Month'] - 1) // 3 + 1).astype(int)
    out['log_Issue_Size_x_log_Offer_Price'] = out['log_Issue_Size'] * out['log_Offer_Price']

    # temporal regime (drift 2010-22 train vs 2024-26 test)
    out['Year_norm'] = (out['Year'] - 2010) / 16.0
    out['Post2020'] = (out['Year'] >= 2020).astype(int)
    out['Post2023'] = (out['Year'] >= 2024).astype(int)

    # subscription shape
    q = out[['QIB', 'HNI', 'RII']].replace(0, np.nan)
    out['sub_std'] = q.std(axis=1).fillna(0)
    out['sub_range'] = (q.max(axis=1) - q.min(axis=1)).fillna(0)
    out['QIB_minus_HNI'] = out['QIB'] - out['HNI']
    out['RII_vs_inst'] = out['RII'] / (out['QIB'] + out['HNI']).replace(0, np.nan)
    out['RII_vs_inst'] = out['RII_vs_inst'].fillna(0)
    out['Total_x_QIB_share'] = out['Total'] * out['QIB_share'].fillna(0)

    # size / price structure
    out['Issue_Shares'] = out['Issue_Size(crores)'] * 10_000_000 / out['Offer Price'].replace(0, np.nan)
    out['Issue_Shares'] = out['Issue_Shares'].replace([np.inf, -np.inf], np.nan).fillna(0)
    out['log_Issue_Shares'] = np.log1p(out['Issue_Shares'].clip(lower=0))
    out['Size_bucket'] = pd.cut(out['Issue_Size(crores)'], bins=[-np.inf, 400, 1000, np.inf],
                                labels=[0, 1, 2]).astype(float)
    out['Price_bucket'] = pd.cut(out['Offer Price'], bins=[-np.inf, 150, 400, np.inf],
                                 labels=[0, 1, 2]).astype(float)

    # sector proxy from name keywords (no sector column in data)
    name = out['IPO_Name'].fillna('').str.lower()
    def sector(n):
        if any(k in n for k in ['bank', 'financ', 'insurance', 'nbfc', 'capital', 'credit', 'asset', 'microfin']): return 'Finance'
        if any(k in n for k in ['tech', 'software', 'digital', 'info', 'labs', 'solutions', 'systems', 'data']): return 'Tech'
        if any(k in n for k in ['pharma', 'health', 'hospital', 'lab', 'bio', 'care', 'drug']): return 'Pharma'
        if any(k in n for k in ['infra', 'construct', 'road', 'rail', 'cement', 'realty', 'housing', 'estate']): return 'Infra'
        if any(k in n for k in ['power', 'energy', 'solar', 'green', 'oil', 'gas', 'renew']): return 'Energy'
        if any(k in n for k in ['food', 'retail', 'consumer', 'fashion', 'apparel', 'restaurant', 'hotel']): return 'Consumer'
        if any(k in n for k in ['auto', 'motor', 'electrical', 'engineer', 'industr', 'steel', 'metal', 'chem']): return 'Industrial'
        return 'Other'
    out['Sector'] = name.apply(sector)
    for s in ['Finance', 'Tech', 'Pharma', 'Infra', 'Energy', 'Consumer', 'Industrial']:
        out[f'Sector_{s}'] = (out['Sector'] == s).astype(int)
    if 'Subscription_Class' in out.columns:
        out['SubClass_Med'] = (out['Subscription_Class'] == 'Medium').astype(int)
        out['SubClass_High'] = (out['Subscription_Class'] == 'High').astype(int)
    return out


def add_market_regime_features(df):
    """Enrich IPO dataset with trailing Nifty 50 momentum, volatility, and regime signals."""
    from src.market_data_fetcher import merge_market_features
    return merge_market_features(df)


def add_trailing_ipo_sentiment(df):
    """Enrich IPO dataset with trailing primary market appetite and congestion signals.
    Strictly uses preceding IPOs in time to prevent lookahead leakage.
    """
    out = df.copy()
    out['Date_dt'] = pd.to_datetime(out['Date'].astype(str).str.split(' ').str[0], format='mixed', errors='coerce')
    out['orig_order'] = np.arange(len(out))
    out = out.sort_values('Date_dt').reset_index(drop=True)

    # 1. Trailing 5 IPO average listing gain (shifted by 1 so current IPO is excluded)
    if 'Listing Gain' in out.columns:
        out['Trailing_5_Avg_Gain'] = out['Listing Gain'].shift(1).rolling(5, min_periods=1).mean().fillna(out['Listing Gain'].median())
    else:
        out['Trailing_5_Avg_Gain'] = 0.0

    # 2. Trailing 30-day primary market issuance congestion
    ipo_counts = []
    dates = out['Date_dt'].values
    for i in range(len(out)):
        current_date = dates[i]
        past_mask = (dates < current_date) & (dates >= current_date - np.timedelta64(30, 'D'))
        ipo_counts.append(int(past_mask.sum()))
    out['Trailing_30d_IPO_Count'] = ipo_counts

    # 3. Issue size vs prevailing annual median
    annual_medians = out.groupby('Year')['Issue_Size(crores)'].transform('median')
    out['Issue_Size_vs_Annual_Median'] = out['Issue_Size(crores)'] / annual_medians.replace(0, np.nan)
    out['Issue_Size_vs_Annual_Median'] = out['Issue_Size_vs_Annual_Median'].fillna(1.0)

    out = out.sort_values('orig_order').reset_index(drop=True)
    out = out.drop(columns=['Date_dt', 'orig_order'], errors='ignore')
    return out


def add_phase2_features(df):
    """Full Phase 2 feature engineering: base transforms, demand ratios, market regime, & trailing waves."""
    out = df.copy()
    out = add_listing_gain(out)
    out = add_log_features(out)
    out = add_demand_ratios(out)
    out = add_pre_ipo_features(out)
    out = add_arena_v2_features(out)
    out = add_market_regime_features(out)
    out = add_trailing_ipo_sentiment(out)
    return out


def add_all_features(df):
    """Backwards-compatible alias."""
    return add_demand_ratios(add_log_features(df))


ARENA_V2_FEATURES = [
    'log_QIB', 'log_HNI', 'log_RII', 'log_Total', 'log_Issue_Size', 'log_Offer_Price',
    'QIB_share', 'RII_share', 'HNI_to_QIB', 'Month',
    'log_Issue_Size_x_log_Offer_Price',
    'Quarter', 'Year_norm', 'Post2020', 'Post2023',
    'sub_std', 'sub_range', 'QIB_minus_HNI', 'RII_vs_inst', 'Total_x_QIB_share',
    'log_Issue_Shares', 'Size_bucket', 'Price_bucket',
    'Sector_Finance', 'Sector_Tech', 'Sector_Pharma', 'Sector_Infra',
    'Sector_Energy', 'Sector_Consumer', 'Sector_Industrial',
    'SubClass_Med', 'SubClass_High',
]


def add_binary_target(df, threshold=5.0):
    """Add the binary Hot/Not_Hot target to the dataframe (backwards compatible)."""
    df = df.copy()
    df['Hot'] = (df['Total'] >= threshold).astype(int)
    return df
