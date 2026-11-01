import React from 'react';

interface ListingDialGaugeProps {
  expectedGain: number;
  rangeLower: number;
  rangeUpper: number;
  verdictColor: 'emerald' | 'cyan' | 'rose';
}

export const ListingDialGauge: React.FC<ListingDialGaugeProps> = ({
  expectedGain,
  rangeLower,
  rangeUpper,
  verdictColor,
}) => {
  // Map value from -20% to +100% to -90deg to +90deg
  const minVal = -20;
  const maxVal = 100;
  const clamp = (v: number) => Math.max(minVal, Math.min(maxVal, v));

  const valToAngle = (v: number) => {
    const fraction = (clamp(v) - minVal) / (maxVal - minVal);
    return -90 + fraction * 180;
  };

  const needleAngle = valToAngle(expectedGain);

  // SVG Geometry for 240x135 viewbox
  const cx = 120;
  const cy = 115;
  const r = 85;

  return (
    <div className="relative flex flex-col items-center justify-center pt-2">
      <svg width="240" height="130" viewBox="0 0 240 130" className="overflow-visible" aria-hidden="true" role="presentation">
        <defs>
          {/* Main Dial Gradient Arc */}
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F43F5E" />
            <stop offset="20%" stopColor="#F59E0B" />
            <stop offset="50%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Dial Background Track */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="var(--dial-track, #131926)"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Active Gradient Arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="10"
          strokeLinecap="round"
          filter="url(#gaugeGlow)"
          opacity="0.85"
        />

        {/* Tick Marks */}
        {[-20, 0, 25, 50, 75, 100].map((tick) => {
          const angle = valToAngle(tick);
          const rad = (angle - 90) * (Math.PI / 180);
          const x1 = cx + (r - 10) * Math.cos(rad);
          const y1 = cy + (r - 10) * Math.sin(rad);
          const lx = cx + (r - 28) * Math.cos(rad);
          const ly = cy + (r - 28) * Math.sin(rad);

          return (
            <g key={tick}>
              <line x1={x1} y1={y1} x2={cx + (r - 18) * Math.cos(rad)} y2={cy + (r - 18) * Math.sin(rad)} stroke="var(--dial-tick, #374151)" strokeWidth="1.5" />
              <text
                x={lx}
                y={ly + 3}
                fill="#6B7280"
                fontSize="8"
                fontFamily="JetBrains Mono"
                textAnchor="middle"
              >
                {tick >= 0 ? `+${tick}` : tick}%
              </text>
            </g>
          );
        })}

        {/* Smooth Hardware-Accelerated CSS Needle */}
        <g
          className="motion-safe:transition-transform duration-700 ease-out"
          style={{
            transform: `rotate(${needleAngle}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
          }}
        >
          {/* Needle stem */}
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - r + 8}
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            filter="drop-shadow(0 0 6px rgba(6,182,212,0.8))"
          />
          {/* Needle Center Hub */}
          <circle cx={cx} cy={cy} r="7" fill="#04060A" stroke="#22D3EE" strokeWidth="2.5" />
          <circle cx={cx} cy={cy} r="3" fill="#22D3EE" />
        </g>
      </svg>

      {/* Central Value Readout */}
      <div className="-mt-3 text-center">
        <div className="transition-colors duration-300">
          <span
            className={`text-3xl font-extrabold font-mono tracking-tight ${
              expectedGain >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {expectedGain >= 0 ? '+' : ''}{expectedGain.toFixed(1)}%
          </span>
        </div>
        <span className="text-[11px] font-mono text-zinc-400 block -mt-0.5">
          Expected Listing Day Gain
        </span>
      </div>
    </div>
  );
};
