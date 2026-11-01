export interface ModelVote {
  name: string;
  type: string;
  prediction: string;
  value: number;
  status: string;
  description: string;
  role: string;
}

export interface PredictionResult {
  company_name: string;
  direction: string;
  hot_probability: number;
  expected_gain: number;
  expected_median: number;
  range_lower: number;
  range_upper: number;
  predicted_range: string;
  range_span: number;
  verdict: string;
  verdict_badge: string;
  verdict_color: 'emerald' | 'cyan' | 'rose';
  action_advice: string;
  models_breakdown: ModelVote[];
  benchmarks: Record<string, number>;
  corridor_10: [number, number];
  corridor_15: [number, number];
  key_drivers: string[];
  market_regime: string;
  is_phase2_available?: boolean;
  phase2_notice?: string;
}

export interface UpcomingIPO {
  id: string;
  company_name: string;
  symbol: string;
  issue_size: number;
  offer_price: number;
  price_band: string;
  category: 'Mainboard' | 'SME' | string;
  exchange: string;
  open_date: string;
  close_date: string;
  listing_date: string;
  status: 'Upcoming' | 'Bidding Open' | 'Bidding Closed' | 'Allotment Awaited' | 'Pre-IPO Filed' | string;
  sector?: string;
  lead_manager?: string;
  gmp?: string;
  gmp_percent?: number;
  lot_size?: number;
  fresh_issue?: number;
  ofs?: number;
  retail_quota?: string;
  qib_quota?: string;
  hni_quota?: string;
  qib?: number;
  hni?: number;
  rii?: number;
  total?: number;
  predicted_gain?: number;
  predicted_range?: string;
  pred_lower?: number;
  pred_upper?: number;
  hot_probability?: number;
  is_phase2_available?: boolean;
  market_context?: {
    nifty_30d_return: number;
    nifty_volatility: number;
    nifty_5d_return: number;
    nifty_bull_regime: number;
    trailing_5_gain: number;
    trailing_ipo_count: number;
    as_of_date?: string;
  };
}

export interface HistoricalItem {
  Date: string;
  IPO_Name: string;
  Actual_Gain: number;
  Pred_Lower: number;
  Pred_Median: number;
  Pred_Upper: number;
  Predicted_Range: string;
  In_Bucket_80: boolean;
  In_Corridor_10: boolean;
  In_Corridor_15: boolean;
}

export interface PresetIPO {
  name: string;
  size: number;
  price: number;
  qib: number;
  hni: number;
  rii: number;
  total: number;
  nifty30: number;
  vol: number;
  trailingGain: number;
}

export interface QIBCurvePoint {
  qib: number;
  expected_gain: number;
  range_lower: number;
  range_upper: number;
  hot_probability: number;
}

export interface NiftyShockPoint {
  nifty_30d_return: number;
  expected_gain: number;
  direction: string;
  regime: string;
}

export interface SensitivityResult {
  company_name: string;
  base_expected_gain: number;
  qib_curve: QIBCurvePoint[];
  shock_matrix: NiftyShockPoint[];
}

export interface UserProfile {
  id: number;
  email: string;
  full_name?: string | null;
  phone_number?: string | null;
  avatar_url?: string | null;
  auth_provider?: string;
  role: string;
  is_active: boolean;
  is_verified?: boolean;
  phone_verified?: boolean;
  created_at: string;
}

export interface WatchlistItem {
  id: number;
  company_name: string;
  symbol?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface SavedSimulationItem {
  id: number;
  title: string;
  inputs: Record<string, any>;
  results: Record<string, any>;
  created_at: string;
}

