/**
 * Pure Deterministic Rule-Based IPO Safety & Risk Audit Engine
 * 100% Offline, Zero Third-Party Dependencies, Zero Latency.
 */

export interface SafetyCheckItem {
  id: string;
  title: string;
  category: 'Capital Flow' | 'Anchor Quota' | 'Issue Scale' | 'Market Climate';
  status: 'safe' | 'caution' | 'neutral';
  headline: string;
  explanation: string;
  metricLabel: string;
  metricValue: string;
}

export interface SafetyAuditResult {
  score: number; // 0 to 4
  maxScore: number;
  overallRating: 'LOW RISK' | 'MODERATE' | 'ELEVATED CAUTION';
  ratingColor: string;
  ratingBg: string;
  ratingBorder: string;
  summaryAdvice: string;
  checks: SafetyCheckItem[];
}

export interface SafetyAuditInput {
  companyName: string;
  issueSize: number; // in Crores
  offerPrice: number; // in Rs
  freshIssue?: number; // Crores (optional)
  ofs?: number; // Crores (optional)
  qibQuota?: string | number; // e.g. "75%" or 75
  nifty30dReturn?: number; // percentage
  niftyVolatility?: number; // annualized percentage
}

export function evaluateIpoSafety(input: SafetyAuditInput): SafetyAuditResult {
  const checks: SafetyCheckItem[] = [];
  let score = 0;

  // --- CHECK 1: Promoter Cash-Out vs Growth Capital (OFS vs Fresh Issue) ---
  const issueSize = Math.max(1, input.issueSize);
  let ofsRatio = 0.5; // default 50/50 if not specified
  let freshRatio = 0.5;

  if (input.freshIssue !== undefined && input.ofs !== undefined && (input.freshIssue + input.ofs) > 0) {
    const total = input.freshIssue + input.ofs;
    freshRatio = input.freshIssue / total;
    ofsRatio = input.ofs / total;
  }

  const freshPct = Math.round(freshRatio * 100);
  const ofsPct = Math.round(ofsRatio * 100);

  if (ofsRatio >= 0.70) {
    checks.push({
      id: 'ofs-cashout',
      title: 'Capital Flow & Promoter Exit',
      category: 'Capital Flow',
      status: 'caution',
      headline: 'Heavy Promoter Cash-Out (OFS > 70%)',
      explanation: 'Over 70% of IPO funds go directly to exiting investors rather than entering the company to fund expansion or pay down debt.',
      metricLabel: 'Promoter Exit (OFS)',
      metricValue: `${ofsPct}% of IPO`,
    });
  } else if (freshRatio >= 0.60) {
    score += 1;
    checks.push({
      id: 'fresh-growth',
      title: 'Capital Flow & Growth Focus',
      category: 'Capital Flow',
      status: 'safe',
      headline: 'Growth Capital Dominant (Fresh > 60%)',
      explanation: 'Majority of raised proceeds will be retained on the company balance sheet to fund new factories, working capital, or debt repayment.',
      metricLabel: 'Fresh Capital',
      metricValue: `${freshPct}% of IPO`,
    });
  } else {
    score += 0.5;
    checks.push({
      id: 'balanced-flow',
      title: 'Capital Flow Balance',
      category: 'Capital Flow',
      status: 'neutral',
      headline: 'Balanced Proceeds Split',
      explanation: 'Healthy mix between early investor liquidity and new company growth capital.',
      metricLabel: 'Fresh / OFS Split',
      metricValue: `${freshPct}% / ${ofsPct}%`,
    });
  }

  // --- CHECK 2: Institutional Anchor Quota (QIB Allocation) ---
  let qibNum = 50;
  if (typeof input.qibQuota === 'string') {
    const parsed = parseFloat(input.qibQuota.replace('%', ''));
    if (!isNaN(parsed)) qibNum = parsed;
  } else if (typeof input.qibQuota === 'number') {
    qibNum = input.qibQuota;
  }

  if (qibNum >= 70) {
    score += 1;
    checks.push({
      id: 'qib-high',
      title: 'Institutional Anchor Buffer',
      category: 'Anchor Quota',
      status: 'safe',
      headline: 'High Institutional Anchor Buffer (≥70% QIB)',
      explanation: 'Large institutional allocation (mutual funds & sovereign wealth) creates an anchor holding base, dampening panic selling on debut.',
      metricLabel: 'QIB Quota',
      metricValue: `${qibNum}% of Issue`,
    });
  } else if (qibNum < 50) {
    checks.push({
      id: 'qib-low',
      title: 'Institutional Anchor Buffer',
      category: 'Anchor Quota',
      status: 'caution',
      headline: 'Low Institutional Anchor Quota (<50% QIB)',
      explanation: 'High retail/HNI allocation increases exposure to speculative day-1 flipping and higher post-open price volatility.',
      metricLabel: 'QIB Quota',
      metricValue: `${qibNum}% of Issue`,
    });
  } else {
    score += 0.5;
    checks.push({
      id: 'qib-standard',
      title: 'Institutional Anchor Buffer',
      category: 'Anchor Quota',
      status: 'neutral',
      headline: 'Standard 50% QIB Allocation',
      explanation: 'Balanced regulatory quota with standard anchor book backing.',
      metricLabel: 'QIB Quota',
      metricValue: `${qibNum}% of Issue`,
    });
  }

  // --- CHECK 3: Issue Scale & Float Digestion ---
  if (issueSize >= 5000) {
    checks.push({
      id: 'scale-mega',
      title: 'Issue Scale & Liquidity Digestion',
      category: 'Issue Scale',
      status: 'caution',
      headline: 'Mega Issue Scale (≥₹5,000 Cr)',
      explanation: 'Massive capital supply requires deep market liquidity to absorb on debut day. Mega IPOs historically exhibit modest percentage pops.',
      metricLabel: 'Issue Size',
      metricValue: `₹${issueSize.toLocaleString('en-IN')} Cr`,
    });
  } else if (issueSize < 500) {
    score += 1;
    checks.push({
      id: 'scale-compact',
      title: 'Issue Scale & Float Momentum',
      category: 'Issue Scale',
      status: 'safe',
      headline: 'Agile Compact Float (<₹500 Cr)',
      explanation: 'Smaller capital base enables rapid post-listing momentum if initial secondary market buying interest emerges.',
      metricLabel: 'Issue Size',
      metricValue: `₹${issueSize.toLocaleString('en-IN')} Cr`,
    });
  } else {
    score += 1;
    checks.push({
      id: 'scale-balanced',
      title: 'Issue Scale & Float Balance',
      category: 'Issue Scale',
      status: 'safe',
      headline: 'Optimal Mid-Sized Capital Scale',
      explanation: 'Well-proportioned issue size for broad domestic mutual fund and retail participation.',
      metricLabel: 'Issue Size',
      metricValue: `₹${issueSize.toLocaleString('en-IN')} Cr`,
    });
  }

  // --- CHECK 4: Macro Market Climate & Volatility ---
  const niftyReturn = input.nifty30dReturn ?? 2.5;
  const niftyVol = input.niftyVolatility ?? 13.5;

  if (niftyReturn >= 1.5 && niftyVol <= 16.0) {
    score += 1;
    checks.push({
      id: 'macro-bull',
      title: 'Market Climate & Nifty Momentum',
      category: 'Market Climate',
      status: 'safe',
      headline: 'Supportive Market Climate (Rising Tide)',
      explanation: 'Positive Nifty 50 30-day momentum with low volatility creates favorable debut conditions across the primary market.',
      metricLabel: 'Nifty 30d Return',
      metricValue: `+${niftyReturn.toFixed(1)}% (Vol: ${niftyVol.toFixed(1)}%)`,
    });
  } else if (niftyReturn < -1.5 || niftyVol >= 18.0) {
    checks.push({
      id: 'macro-storm',
      title: 'Market Climate & Volatility',
      category: 'Market Climate',
      status: 'caution',
      headline: 'Market Turbulence & Headwinds',
      explanation: 'Elevated market volatility or consolidating index creates debut price pressure, regardless of individual company strength.',
      metricLabel: 'Nifty Climate',
      metricValue: `${niftyReturn.toFixed(1)}% (Vol: ${niftyVol.toFixed(1)}%)`,
    });
  } else {
    score += 0.5;
    checks.push({
      id: 'macro-neutral',
      title: 'Market Climate Stability',
      category: 'Market Climate',
      status: 'neutral',
      headline: 'Stable Market Climate',
      explanation: 'Normal market volatility provides an orderly backdrop for price discovery on debut.',
      metricLabel: 'Nifty Climate',
      metricValue: `${niftyReturn >= 0 ? '+' : ''}${niftyReturn.toFixed(1)}% (Vol: ${niftyVol.toFixed(1)}%)`,
    });
  }

  // Final Health Rating
  let overallRating: 'LOW RISK' | 'MODERATE' | 'ELEVATED CAUTION' = 'LOW RISK';
  let ratingColor = 'text-emerald-400';
  let ratingBg = 'bg-emerald-500/10';
  let ratingBorder = 'border-emerald-500/30';
  let summaryAdvice = 'Strong offering fundamentals with healthy institutional buffering and favorable market alignment.';

  if (score >= 3) {
    overallRating = 'LOW RISK';
    ratingColor = 'text-emerald-400';
    ratingBg = 'bg-emerald-500/10';
    ratingBorder = 'border-emerald-500/30';
    summaryAdvice = 'Strong offering fundamentals with healthy institutional buffering and favorable market alignment.';
  } else if (score >= 2) {
    overallRating = 'MODERATE';
    ratingColor = 'text-amber-400';
    ratingBg = 'bg-amber-500/10';
    ratingBorder = 'border-amber-500/30';
    summaryAdvice = 'Balanced issue structure with minor caution flags. Monitor final subscription demand closely before bidding.';
  } else {
    overallRating = 'ELEVATED CAUTION';
    ratingColor = 'text-rose-400';
    ratingBg = 'bg-rose-500/10';
    ratingBorder = 'border-rose-500/30';
    summaryAdvice = 'Multiple caution flags detected (e.g. heavy promoter cash-out or adverse market volatility). Strict risk management advised.';
  }

  return {
    score: Math.round(score * 10) / 10,
    maxScore: 4,
    overallRating,
    ratingColor,
    ratingBg,
    ratingBorder,
    summaryAdvice,
    checks,
  };
}
