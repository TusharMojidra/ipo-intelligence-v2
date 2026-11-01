import os
import datetime
import numpy as np
import pandas as pd
import requests

DEFAULT_CACHE = 'data/raw/nifty_daily.csv'


def fetch_nifty_history(cache_path=DEFAULT_CACHE, force_refresh=False):
    """Fetch daily Nifty 50 (^NSEI) historical prices from Yahoo Finance with disk caching."""
    if os.path.exists(cache_path) and not force_refresh:
        df = pd.read_csv(cache_path)
        df['Date'] = pd.to_datetime(df['Date'].astype(str).str.split(' ').str[0], format='%Y-%m-%d', errors='coerce')
        return df.dropna(subset=['Date']).sort_values('Date').reset_index(drop=True)

    os.makedirs(os.path.dirname(cache_path), exist_ok=True)
    headers = {'User-Agent': 'Mozilla/5.0'}
    # 2009-01-01 to 2026-06-01
    url = 'https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?period1=1230768000&period2=1780000000&interval=1d'
    
    response = requests.get(url, headers=headers, timeout=15)
    response.raise_for_status()
    payload = response.json()

    chart_res = payload['chart']['result'][0]
    timestamps = chart_res['timestamp']
    quotes = chart_res['indicators']['quote'][0]

    dates = [datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d') for ts in timestamps]
    closes = quotes.get('close', [])
    opens = quotes.get('open', [])
    highs = quotes.get('high', [])
    lows = quotes.get('low', [])
    volumes = quotes.get('volume', [])

    df = pd.DataFrame({
        'Date': dates,
        'Open': opens,
        'High': highs,
        'Low': lows,
        'Close': closes,
        'Volume': volumes,
    }).dropna(subset=['Close'])

    df['Date'] = pd.to_datetime(df['Date'], format='%Y-%m-%d')
    df = df.drop_duplicates(subset=['Date']).sort_values('Date').reset_index(drop=True)
    df.to_csv(cache_path, index=False)
    print(f"Cached {len(df)} daily Nifty 50 bars to {cache_path}")
    return df


def compute_market_indicators(nifty_df):
    """Calculate pre-listing market momentum, volatility, and regime signals from Nifty 50 daily bars."""
    df = nifty_df.copy()
    df['Date'] = pd.to_datetime(df['Date'].astype(str).str.split(' ').str[0], format='%Y-%m-%d', errors='coerce')
    df = df.dropna(subset=['Date']).sort_values('Date').reset_index(drop=True)
    
    close = df['Close']
    daily_ret = close.pct_change()

    # Short-term momentum (5 trading days ~ 1 calendar week)
    df['Nifty_5d_return'] = (close - close.shift(5)) / close.shift(5) * 100.0

    # Medium-term momentum (21 trading days ~ 1 calendar month / 30 days)
    df['Nifty_30d_return'] = (close - close.shift(21)) / close.shift(21) * 100.0

    # 30-day annualized volatility (percentage)
    df['Nifty_30d_volatility'] = daily_ret.rolling(21, min_periods=10).std() * np.sqrt(252) * 100.0

    # 52-week peak distance (252 trading days)
    peak_52w = close.rolling(252, min_periods=50).max()
    df['Nifty_52w_dist'] = (close - peak_52w) / peak_52w * 100.0

    # Bull regime filter: price above 200-day simple moving average
    sma_200 = close.rolling(200, min_periods=50).mean()
    df['Nifty_Bull_Regime'] = (close >= sma_200).astype(int)

    # Fill earliest edge NaNs with neutral values
    df['Nifty_5d_return'] = df['Nifty_5d_return'].fillna(0.0)
    df['Nifty_30d_return'] = df['Nifty_30d_return'].fillna(0.0)
    df['Nifty_30d_volatility'] = df['Nifty_30d_volatility'].fillna(df['Nifty_30d_volatility'].median())
    df['Nifty_52w_dist'] = df['Nifty_52w_dist'].fillna(0.0)
    df['Nifty_Bull_Regime'] = df['Nifty_Bull_Regime'].fillna(1)

    return df[['Date', 'Close', 'Nifty_5d_return', 'Nifty_30d_return',
               'Nifty_30d_volatility', 'Nifty_52w_dist', 'Nifty_Bull_Regime']]


def merge_market_features(ipo_df, nifty_df=None):
    """Merge trailing market signals into IPO dataframe without future lookahead.
    
    For an IPO on date T, matches market indicators of the preceding trading day (T_market < T_ipo)
    to guarantee zero listing-day lookahead leakage.
    """
    if nifty_df is None:
        raw_nifty = fetch_nifty_history()
        nifty_df = compute_market_indicators(raw_nifty)
    else:
        nifty_df = compute_market_indicators(nifty_df)

    out = ipo_df.copy()
    out['Date_clean'] = out['Date'].astype(str).str.split(' ').str[0]
    out['Date_dt'] = pd.to_datetime(out['Date_clean'], format='mixed', errors='coerce')

    nifty_df = nifty_df.copy()
    nifty_df['Date_dt'] = pd.to_datetime(nifty_df['Date'])

    # Preserve original order
    out['orig_order'] = np.arange(len(out))

    out_sorted = out.dropna(subset=['Date_dt']).sort_values('Date_dt').reset_index(drop=True)
    nifty_sorted = nifty_df.sort_values('Date_dt').reset_index(drop=True)

    # merge_asof with allow_exact_matches=False ensures we take trading day strictly before IPO listing day
    merged = pd.merge_asof(
        out_sorted,
        nifty_sorted.drop(columns=['Date']),
        on='Date_dt',
        direction='backward',
        allow_exact_matches=False
    )

    # Sort back to original order
    merged = merged.sort_values('orig_order').reset_index(drop=True)
    merged = merged.drop(columns=['Date_clean', 'Date_dt', 'orig_order', 'Close'], errors='ignore')

    # Fill any missing from first date
    for col in ['Nifty_5d_return', 'Nifty_30d_return', 'Nifty_30d_volatility', 'Nifty_52w_dist']:
        merged[col] = merged[col].fillna(merged[col].median())
    merged['Nifty_Bull_Regime'] = merged['Nifty_Bull_Regime'].fillna(1).astype(int)

    return merged
