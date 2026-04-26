import React from "react";

interface PatientCharacterProps {
  completedCount: number;
  healingIdx: number | null;
}

const SPARKLE_POS = [
  { x: 121, y: 267 },
  { x: 28, y: 156 },
  { x: 90, y: 51 },
  { x: 106, y: 57 },
  { x: 116, y: 233 },
  { x: 61, y: 76 },
];

function HealSparkle({ x, y }: { x: number; y: number }) {
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <g>
      {angles.map((deg, i) => {
        const r = (deg * Math.PI) / 180;
        const x2 = x + Math.cos(r) * 27;
        const y2 = y + Math.sin(r) * 27;
        return (
          <line
            key={i}
            x1={x} y1={y} x2={x2} y2={y2}
            stroke={i % 2 === 0 ? "#FFD700" : "hsl(215, 78%, 48%)"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="0 27"
            style={{ animation: `apexRay 0.7s ease-out ${i * 0.04}s forwards` }}
          />
        );
      })}
      <circle cx={x} cy={y} r="7" fill="#FFD700"
        style={{ animation: "apexRay 0.7s ease-out forwards" }} />
      <circle cx={x} cy={y} r="18" fill="none" stroke="hsl(215, 78%, 48%)" strokeWidth="2.5"
        style={{ animation: "apexRing 0.85s ease-out forwards", transformOrigin: `${x}px ${y}px` }} />
    </g>
  );
}

const PatientCharacter = ({ completedCount, healingIdx }: PatientCharacterProps) => {
  const all = completedCount >= 6;
  const isHealed = (i: number) => completedCount > i;
  const isHealing = (i: number) => healingIdx === i;

  const mouth = all
    ? "M 72 80 Q 90 96 108 80"
    : completedCount >= 4
    ? "M 74 80 Q 90 92 106 80"
    : completedCount >= 2
    ? "M 77 82 L 103 82"
    : "M 75 76 Q 90 65 105 76";

  const lBrow = completedCount < 3
    ? "M 63 41 Q 75 35 82 41"
    : "M 63 43 Q 75 43 82 43";
  const rBrow = completedCount < 3
    ? "M 98 41 Q 105 35 117 41"
    : "M 98 43 Q 105 43 117 43";

  const charAnim = all
    ? "apexJump 0.75s ease-in-out 3, apexBob 3.5s ease-in-out infinite 2.3s"
    : "apexBob 3.5s ease-in-out infinite";

  const injStyle = (i: number): React.CSSProperties => ({
    opacity: isHealing(i) ? 0 : 1,
    transition: isHealing(i) ? "opacity 0.45s ease" : "none",
  });

  return (
    <svg viewBox="0 0 180 286" width={155} height={233} style={{ overflow: "visible", display: "block" }}>
      <g style={{ animation: charAnim }}>
        {/* Pants / legs */}
        <path d="M 72,184 L 64,268" stroke="#1B3968" strokeWidth="26" strokeLinecap="round" fill="none" />
        <path d="M 108,184 L 116,268" stroke="#1B3968" strokeWidth="22" strokeLinecap="round" fill="none" />

        {/* Shoes */}
        <ellipse cx="59" cy="272" rx="22" ry="10" fill="#0D1020" />
        <ellipse cx="120" cy="272" rx="22" ry="10" fill="#0D1020" />
        <ellipse cx="55" cy="269" rx="10" ry="4" fill="#1A2040" opacity={0.5} />
        <ellipse cx="116" cy="269" rx="10" ry="4" fill="#1A2040" opacity={0.5} />

        {/* White coat (torso) */}
        <rect x="46" y="106" width="88" height="82" rx="24" fill="#DDE6F0" />
        <path d="M 90,108 L 73,124 L 90,140 L 107,124 Z" fill="#4A82C8" />
        <rect x="56" y="143" width="18" height="14" rx="3" fill="none" stroke="#B8C8D8" strokeWidth="1.2" />
        <circle cx="90" cy="163" r="2.5" fill="#A8B8C8" />
        <circle cx="90" cy="178" r="2.5" fill="#A8B8C8" />

        {/* Arms */}
        {isHealed(1) && (
          <>
            <path d="M 48,122 Q 30,155 34,186" stroke="#FFD0BC" strokeWidth="22" strokeLinecap="round" fill="none" />
            <circle cx="34" cy="186" r="12" fill="#FFD0BC" />
          </>
        )}
        <path d="M 132,122 Q 150,155 146,186" stroke="#FFD0BC" strokeWidth="22" strokeLinecap="round" fill="none" />
        <circle cx="146" cy="186" r="12" fill="#FFD0BC" />

        {/* Neck */}
        <rect x="80" y="99" width="24" height="13" rx="6" fill="#FFD0BC" />

        {/* Head */}
        <circle cx="90" cy="62" r="42" fill="#FFD0BC" />
        <circle cx="49" cy="64" r="11" fill="#FFD0BC" />
        <circle cx="49" cy="64" r="6.5" fill="#F2A88E" />
        <circle cx="131" cy="64" r="11" fill="#FFD0BC" />
        <circle cx="131" cy="64" r="6.5" fill="#F2A88E" />

        {/* Hair */}
        <path d="M 48,56 Q 50,4 90,2 Q 130,4 132,56 Q 119,22 90,20 Q 61,22 48,56" fill="#3E2410" />
        <path d="M 48,56 Q 44,46 47,36" fill="none" stroke="#3E2410" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M 132,56 Q 136,46 133,36" fill="none" stroke="#3E2410" strokeWidth="3.5" strokeLinecap="round" />

        {/* Eyes */}
        <circle cx="74" cy="60" r="9" fill="white" />
        <circle cx="106" cy="60" r="9" fill="white" />
        <circle cx="76" cy="61" r="5.5" fill="#2A1808" />
        <circle cx="108" cy="61" r="5.5" fill="#2A1808" />
        <circle cx="78" cy="58" r="2" fill="white" />
        <circle cx="110" cy="58" r="2" fill="white" />

        {/* Eyebrows */}
        <path d={lBrow} fill="none" stroke="#331A08" strokeWidth="2.8" strokeLinecap="round" />
        <path d={rBrow} fill="none" stroke="#331A08" strokeWidth="2.8" strokeLinecap="round" />

        {/* Nose */}
        <ellipse cx="90" cy="71" rx="4" ry="3" fill="#E89A78" />

        {/* Mouth */}
        <path d={mouth} fill="none" stroke="#C05848" strokeWidth="2.8" strokeLinecap="round" />

        {/* Blush */}
        <ellipse cx="62" cy="76" rx="9" ry="6" fill="#FF9090" opacity={all ? 0.38 : 0.1} />
        <ellipse cx="118" cy="76" rx="9" ry="6" fill="#FF9090" opacity={all ? 0.38 : 0.1} />

        {/* ── INJURIES ── */}

        {/* 1 · Crutch + ankle cast */}
        {!isHealed(0) && (
          <g style={injStyle(0)}>
            <rect x="136" y="126" width="22" height="9" rx="4" fill="#B89650" />
            <line x1="147" y1="134" x2="153" y2="274" stroke="#7A5C10" strokeWidth="5" strokeLinecap="round" />
            <line x1="140" y1="152" x2="160" y2="152" stroke="#7A5C10" strokeWidth="5" strokeLinecap="round" />
            <line x1="149" y1="274" x2="161" y2="274" stroke="#7A5C10" strokeWidth="5" strokeLinecap="round" />
            <rect x="109" y="264" width="25" height="14" rx="4" fill="white" stroke="#DDDDDD" strokeWidth="0.8" />
          </g>
        )}

        {/* 2 · Arm sling */}
        {!isHealed(1) && (
          <g style={injStyle(1)}>
            <path d="M 48,122 Q 30,150 40,170" stroke="#FFD0BC" strokeWidth="22" strokeLinecap="round" fill="none" />
            <path d="M 88,110 L 25,154 L 44,172 Z" fill="#6EC0DD" opacity={0.9} />
            <path d="M 88,110 L 25,154 L 44,172 Z" fill="none" stroke="#4AAAC8" strokeWidth="1.5" />
            <path d="M 30,152 Q 26,162 36,170" stroke="#EBEBEB" strokeWidth="18" strokeLinecap="round" fill="none" />
          </g>
        )}

        {/* 3 · Head bandage */}
        {!isHealed(2) && (
          <g style={injStyle(2)}>
            <rect x="46" y="46" width="88" height="15" rx="5" fill="white" stroke="#DDDDDD" strokeWidth="0.8" />
            <circle cx="72" cy="53" r="5.5" fill="#E84444" />
            <circle cx="72" cy="53" r="3" fill="#C02222" />
            <line x1="54" y1="46" x2="54" y2="61" stroke="#E4E4E4" strokeWidth="1" />
            <line x1="70" y1="46" x2="70" y2="61" stroke="#E4E4E4" strokeWidth="1" />
            <line x1="94" y1="46" x2="94" y2="61" stroke="#E4E4E4" strokeWidth="1" />
            <line x1="118" y1="46" x2="118" y2="61" stroke="#E4E4E4" strokeWidth="1" />
          </g>
        )}

        {/* 4 · Black eye */}
        {!isHealed(3) && (
          <ellipse cx="107" cy="59" rx="14" ry="11" fill="#7040A0"
            style={{
              opacity: isHealing(3) ? 0 : 0.46,
              transition: isHealing(3) ? "opacity 0.45s ease" : "none",
            }}
          />
        )}

        {/* 5 · Knee bandage */}
        {!isHealed(4) && (
          <g style={injStyle(4)}>
            <rect x="106" y="225" width="25" height="27" rx="5" fill="white" stroke="#DDDDDD" strokeWidth="0.8" />
            <line x1="106" y1="233" x2="131" y2="233" stroke="#E4E4E4" strokeWidth="1" />
            <line x1="106" y1="240" x2="131" y2="240" stroke="#E4E4E4" strokeWidth="1" />
            <line x1="106" y1="247" x2="131" y2="247" stroke="#E4E4E4" strokeWidth="1" />
          </g>
        )}

        {/* 6 · Cheek plaster */}
        {!isHealed(5) && (
          <g style={injStyle(5)}>
            <rect x="53" y="72" width="26" height="13" rx="3" fill="#F2C8A0" />
            <rect x="63" y="72" width="10" height="13" rx="1" fill="white" opacity={0.8} />
            <line x1="55" y1="72" x2="55" y2="85" stroke="#E0B888" strokeWidth="0.8" />
            <line x1="77" y1="72" x2="77" y2="85" stroke="#E0B888" strokeWidth="0.8" />
          </g>
        )}

        {/* Healing sparkle burst */}
        {healingIdx !== null && (
          <HealSparkle x={SPARKLE_POS[healingIdx].x} y={SPARKLE_POS[healingIdx].y} />
        )}

        {/* Victory crown */}
        {all && (
          <path
            d="M 64,13 L 70,2 L 80,11 L 90,0 L 100,11 L 110,2 L 116,13"
            fill="none" stroke="#FFD700" strokeWidth="3.2"
            strokeLinejoin="round" strokeLinecap="round"
            style={{ animation: "apexCrown 2s ease-in-out infinite" }}
          />
        )}
      </g>
    </svg>
  );
};

export default PatientCharacter;
