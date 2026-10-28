import { contourPaths, mulberry32 } from "./geometry";
import { STAGES } from "./stages";

const NEAR = contourPaths(11, 10, 70, 38);
const FAR = contourPaths(29, 8, 190, 74);
const GROUND = contourPaths(53, 9, 60, 46);

const STARS = (() => {
  const rand = mulberry32(7);
  return Array.from({ length: 42 }, (_, i) => ({
    x: +(rand() * 100).toFixed(2),
    y: +(rand() * 100).toFixed(2),
    r: +(0.5 + rand() * 0.9).toFixed(2),
    o: +(0.16 + rand() * 0.38).toFixed(2),
    layer: i % 3,
  }));
})();

export type SatKind = "doc" | "shield" | "data" | "check";

/**
 * Evidence satellites. `rh` is the hero orbit radius as a fraction of the hero
 * orbit; `rj` the radius (px) when they gather around the active stage.
 */
export const SATS: Array<{ kind: SatKind; speed: number; phase: number; rh: number; rj: number; tilt: number }> = [
  { kind: "doc", speed: 0.17, phase: 0.4, rh: 0.42, rj: 58, tilt: 14 },
  { kind: "shield", speed: -0.12, phase: 2.3, rh: 0.58, rj: 74, tilt: -20 },
  { kind: "data", speed: 0.1, phase: 4.1, rh: 0.74, rj: 92, tilt: 32 },
  { kind: "check", speed: -0.14, phase: 5.2, rh: 1.14, rj: 112, tilt: -8 },
  { kind: "doc", speed: 0.08, phase: 1.3, rh: 1.26, rj: 128, tilt: 22 },
  { kind: "data", speed: -0.09, phase: 3.4, rh: 1.38, rj: 100, tilt: -30 },
  { kind: "shield", speed: 0.07, phase: 5.9, rh: 1.5, rj: 136, tilt: 6 },
  { kind: "doc", speed: -0.11, phase: 0.9, rh: 0.9, rj: 84, tilt: -14 },
  { kind: "check", speed: 0.13, phase: 3.0, rh: 0.5, rj: 66, tilt: 40 },
];

function SatGlyph({ kind }: { kind: SatKind }) {
  switch (kind) {
    case "doc":
      return (
        <>
          <rect x="-6" y="-8" width="12" height="16" rx="2" fill="rgba(213,200,255,.16)" stroke="#D5C8FF" strokeOpacity=".7" strokeWidth=".9" />
          <path d="M-3 -3H3M-3 0H3M-3 3H1" stroke="#D5C8FF" strokeOpacity=".7" strokeWidth=".9" />
        </>
      );
    case "shield":
      return (
        <path d="M0 -8L7 -5V1C7 5 3.5 7.5 0 9C-3.5 7.5 -7 5 -7 1V-5Z" fill="rgba(125,227,244,.12)" stroke="#7DE3F4" strokeOpacity=".75" strokeWidth=".9" />
      );
    case "data":
      return (
        <>
          <path d="M0 -8L7 -4V4L0 8L-7 4V-4Z" fill="rgba(200,229,248,.12)" stroke="#C8E5F8" strokeOpacity=".7" strokeWidth=".9" />
          <circle r="1.6" fill="#C8E5F8" fillOpacity=".8" />
        </>
      );
    default:
      return (
        <>
          <circle r="7" fill="rgba(110,231,183,.12)" stroke="#6EE7B7" strokeOpacity=".7" strokeWidth=".9" />
          <path d="M-3 .5L-.8 2.8L3.4 -2.2" fill="none" stroke="#6EE7B7" strokeOpacity=".85" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
  }
}

/**
 * Static markup of the approval universe. Every moving part carries a
 * `data-u` hook; the journey's animation loop is the only thing that moves
 * them, so the whole scene stays on one shared scroll/time model.
 */
export function UniverseSvg() {
  return (
    <svg
      data-u="svg"
      className="uj-svg"
      viewBox="0 0 1440 900"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="uj-route" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#A7A5F5" />
          <stop offset=".55" stopColor="#F2BFE0" />
          <stop offset="1" stopColor="#C8E5F8" />
        </linearGradient>
        <radialGradient id="uj-core">
          <stop offset="0" stopColor="#FAF7FF" stopOpacity=".95" />
          <stop offset=".3" stopColor="#F2BFE0" stopOpacity=".55" />
          <stop offset="1" stopColor="#7667C8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="uj-halo">
          <stop offset="0" stopColor="#9B8CF0" stopOpacity=".62" />
          <stop offset=".5" stopColor="#7667C8" stopOpacity=".2" />
          <stop offset="1" stopColor="#7667C8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="uj-node-halo">
          <stop offset="0" stopColor="#D5C8FF" stopOpacity=".5" />
          <stop offset="1" stopColor="#D5C8FF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="uj-end-glow">
          <stop offset="0" stopColor="#6EE7B7" stopOpacity=".38" />
          <stop offset=".5" stopColor="#6EE7B7" stopOpacity=".1" />
          <stop offset="1" stopColor="#6EE7B7" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="uj-packet-glow">
          <stop offset="0" stopColor="#FAF7FF" stopOpacity=".6" />
          <stop offset=".4" stopColor="#F2BFE0" stopOpacity=".22" />
          <stop offset="1" stopColor="#F2BFE0" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* depth layers: faint stars */}
      {[0, 1, 2].map((layer) => (
        <g key={layer} data-u="stars" data-layer={layer}>
          {STARS.filter((star) => star.layer === layer).map((star, i) => (
            <circle key={i} cx={`${star.x}%`} cy={`${star.y}%`} r={star.r} fill="#D5C8FF" opacity={star.o} />
          ))}
        </g>
      ))}

      {/* topographic contours */}
      <g data-u="contour-ground">
        {GROUND.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#A7A5F5" strokeOpacity={0.07 + (i % 3 === 0 ? 0.05 : 0)} strokeWidth={i % 3 === 0 ? 1.1 : 0.8} />
        ))}
      </g>
      <g data-u="contour-far">
        {FAR.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#A7A5F5" strokeOpacity={0.08 + (i % 3) * 0.015} strokeWidth="1" />
        ))}
      </g>
      <g data-u="contour-near">
        {NEAR.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#D5C8FF" strokeOpacity={0.12 + (i % 4 === 0 ? 0.08 : 0)} strokeWidth={i % 4 === 0 ? 1.2 : 0.9} />
        ))}
      </g>

      {/* hub orbit decor */}
      <g data-u="hub-decor">
        <g data-u="hub-rings">
          {[0, 1, 2, 3].map((i) => (
            <ellipse key={i} data-u="ring" data-k={i} rx="100" ry="50" fill="none" stroke="#D5C8FF" strokeOpacity={i < 2 ? 0.5 : 0.28} strokeWidth="1" strokeDasharray={i % 2 ? "1 7" : "none"} />
          ))}
          <ellipse data-u="wave" rx="40" ry="20" fill="none" stroke="#F2BFE0" strokeWidth="1.2" opacity="0" />
        </g>
      </g>

      {/* spokes and route */}
      <g data-u="spokes">
        {STAGES.map((_, i) => (
          <path key={i} data-u="spoke" d="M0 0" fill="none" stroke="#A7A5F5" strokeWidth="1" strokeDasharray="1 6" strokeLinecap="round" opacity="0" />
        ))}
      </g>
      <path data-u="route-closure" d="M0 0" fill="none" stroke="#D5C8FF" strokeOpacity=".5" strokeWidth="1.4" strokeDasharray="2 8" strokeLinecap="round" />
      <path data-u="route-base" d="M0 0" fill="none" stroke="#D5C8FF" strokeOpacity=".7" strokeWidth="1.7" strokeDasharray="2 8" strokeLinecap="round" />
      <path data-u="route-glow" d="M0 0" fill="none" stroke="#F2BFE0" strokeOpacity=".2" strokeWidth="9" strokeLinecap="round" />
      <path data-u="route-lit" d="M0 0" fill="none" stroke="url(#uj-route)" strokeWidth="2.4" strokeLinecap="round" />
      <path data-u="comet" d="M0 0" fill="none" stroke="#F2BFE0" strokeWidth="2.6" strokeLinecap="round" opacity=".9" />

      {/* decision endpoint: restrained terminal glow */}
      <g data-u="endcap" opacity="0">
        <circle r="78" fill="url(#uj-end-glow)" />
        <circle r="31" fill="none" stroke="#6EE7B7" strokeOpacity=".5" strokeWidth="1" />
        <circle r="43" fill="none" stroke="#6EE7B7" strokeOpacity=".32" strokeWidth="1" strokeDasharray="2 6" />
        <path d="M30 0H66" stroke="#6EE7B7" strokeOpacity=".55" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M66 -9V9" stroke="#6EE7B7" strokeOpacity=".85" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* satellites */}
      <g data-u="sats">
        {SATS.map((sat, i) => (
          <g key={i} data-u="sat">
            <SatGlyph kind={sat.kind} />
          </g>
        ))}
      </g>

      {/* hub */}
      <g data-u="hub">
        <circle data-u="hub-halo" r="170" fill="url(#uj-halo)" />
        <g data-u="hub-core">
          <circle r="54" fill="url(#uj-core)" />
          <circle r="27" fill="#1a1340" stroke="#F2BFE0" strokeOpacity=".85" strokeWidth="1.6" />
          <path transform="scale(1.35)" d="M-9 7H9M-6.5 7V-1.5M-2.2 7V-1.5M2.2 7V-1.5M6.5 7V-1.5M-10 -2L0 -8.5L10 -2Z" fill="none" stroke="#FAF7FF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <text data-u="hub-label" y="70" textAnchor="middle" fontSize="10" letterSpacing="2.4" fill="#D5C8FF" fillOpacity=".8">
          INSTITUTIONAL HUB
        </text>
      </g>

      {/* stage nodes */}
      <g data-u="nodes">
        {STAGES.map((stage, i) => (
          <g key={stage.label} data-u="node" data-i={i}>
            <circle data-r="ripple" r="17" fill="none" strokeWidth="1.5" opacity="0" />
            <circle data-r="pulse" r="26" fill="none" strokeWidth="1" opacity="0" />
            <circle data-r="halo" r="40" fill="url(#uj-node-halo)" />
            <circle data-r="body" r="17" fill="#1d1744" strokeWidth="1.8" />
            <text data-r="num" textAnchor="middle" dy=".35em" fontSize="12.5" fontWeight="600" fill="#D5C8FF">
              {i + 1}
            </text>
            <path data-r="check" d="M-6 .5L-2 4.4L6.2 -4.2" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0" />
            <text data-r="label" textAnchor="middle" fontSize="11" letterSpacing="1.6" fill="#D5C8FF" fillOpacity=".85" stroke="#0e0a22" strokeOpacity=".85" strokeWidth="3.5" paintOrder="stroke" strokeLinejoin="round">
              {stage.label.toUpperCase()}
            </text>
          </g>
        ))}
      </g>

      {/* submission packet */}
      <g data-u="packet">
        <circle r="34" fill="url(#uj-packet-glow)" />
        <g data-r="bob">
          <rect x="-9" y="-11" width="18" height="22" rx="3" fill="#FAF7FF" />
          <path d="M3 -11L9 -5H3Z" fill="#D5C8FF" />
          <path d="M-5 0H5M-5 4H2" stroke="#7667C8" strokeWidth="1.4" strokeLinecap="round" />
        </g>
        <text data-r="label" x="0" y="34" textAnchor="middle" fontSize="9" letterSpacing="1.4" fill="#FAF7FF" fillOpacity=".92" stroke="#0e0a22" strokeOpacity=".9" strokeWidth="3.5" paintOrder="stroke" strokeLinejoin="round">
          APP-2026-0148 · SIMULATED
        </text>
      </g>
    </svg>
  );
}
