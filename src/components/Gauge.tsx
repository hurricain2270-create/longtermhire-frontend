// @ts-nocheck
import React from "react";

// 0% sits at the left horizon, 100% at the right horizon, and the last 20%
// runs below the line — so beating target is the only state where the needle
// drops past the horizon.
const CX = 75;
const CY = 80;
const R = 55;

const angleFor = (pct) => {
  const p = Math.max(0, Math.min(120, Number(pct) || 0));
  return p <= 100 ? 180 - p * 1.8 : -(p - 100) * 1.5;
};
const pointOn = (radius, deg) => {
  const rad = (deg * Math.PI) / 180;
  return [CX + radius * Math.cos(rad), CY - radius * Math.sin(rad)];
};
const arc = (fromPct, toPct) => {
  const [x1, y1] = pointOn(R, angleFor(fromPct));
  const [x2, y2] = pointOn(R, angleFor(toPct));
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
};

const BANDS = [
  { from: 0, to: 50, colour: "#d03b3b" },
  { from: 50, to: 70, colour: "#eb6834" },
  { from: 70, to: 90, colour: "#fab219" },
  { from: 90, to: 100, colour: "#0ca30c" },
];

const Gauge = ({
  pct = 0,
  value = "",
  caption = "",
  label = "",
  width = 230,
  height = 150,
  valueSize = 20,
  captionSize = 9,
  ariaLabel = "",
}) => {
  const over = pct > 100;
  const needle = width > 300 ? 45 : 45;
  const [nx, ny] = pointOn(needle, angleFor(pct));

  return (
    <div className="text-center">
      <svg width={width} height={height} viewBox="0 0 150 130" role="img"
        aria-label={ariaLabel || `${label} ${Math.round(pct)} percent`}>
        <line x1="12" y1={CY} x2="138" y2={CY} stroke="#2F2F31" strokeWidth="1" />

        {BANDS.map((b) => (
          <path key={b.from} d={arc(b.from, b.to)} fill="none" stroke={b.colour} strokeWidth="12" />
        ))}
        {/* The beyond-target stretch stays grey until it's earned. */}
        <path d={arc(100, 120)} fill="none" stroke="#2F2F31" strokeWidth="12" />
        {over && (
          <path d={arc(100, Math.min(120, pct))} fill="none" stroke="#7F77DD" strokeWidth="12" />
        )}

        <line x1={CX} y1={CY} x2={nx.toFixed(1)} y2={ny.toFixed(1)}
          stroke="#E5E5E5" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx={CX} cy={CY} r="6" fill="#E5E5E5" />

        <text x={CX} y="62" textAnchor="middle" fontSize={valueSize} fontWeight="500" fill="#E5E5E5">
          {value}
        </text>
        <text x={CX} y="122" textAnchor="middle" fontSize={captionSize}
          fill={over ? "#7F77DD" : "#6B7280"}>
          {caption}
        </text>
      </svg>
      {label ? (
        <p className="text-[#E5E5E5] font-[Inter] text-[14px] font-semibold mt-1">{label}</p>
      ) : null}
    </div>
  );
};

export default Gauge;
