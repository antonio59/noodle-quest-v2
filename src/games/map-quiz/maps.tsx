import type { MapProps } from './types';

function SolvedLabels({ solvedIds, showLabels, showLocations, answers }: MapProps) {
  if (!showLabels && !showLocations) return null;
  return (
    <>
      {answers.map(a => {
        if (!solvedIds.has(a.id)) return null;
        const sx = a.x;
        const sy = a.y * 0.5;
        return (
          <g key={a.id}>
            {showLocations && (
              <circle
                cx={sx}
                cy={sy}
                r={1.2}
                fill="var(--color-accent, #a78bfa)"
                stroke="var(--color-background, #0f0d1a)"
                strokeWidth={0.3}
              />
            )}
            {showLabels && (
              <text
                x={sx}
                y={sy - 2}
                textAnchor="middle"
                fill="var(--color-accent, #a78bfa)"
                fontSize={3}
                fontWeight={700}
                style={{ textShadow: '0 0 2px var(--color-background, #0f0d1a)' }}
              >
                {a.label}
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}

function MapWrapper({ children, solvedIds, showLabels, showLocations, answers }: MapProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 100 50"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
      style={{ background: 'var(--color-surface, #1a1730)' }}
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="0.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {children}
      <SolvedLabels solvedIds={solvedIds} showLabels={showLabels} showLocations={showLocations} answers={answers} />
    </svg>
  );
}

/* ── World Map (simplified Mercator-style) ── */
export function WorldMap(props: MapProps) {
  return (
    <MapWrapper {...props}>
      {/* Ocean */}
      <rect width={100} height={50} fill="var(--color-surface, #1a1730)" />
      {/* Grid lines */}
      {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(x => (
        <line key={`v${x}`} x1={x} y1={0} x2={x} y2={50} stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.03} strokeWidth={0.2} />
      ))}
      {[10, 20, 30, 40].map(y => (
        <line key={`h${y}`} x1={0} y1={y} x2={100} y2={y} stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.03} strokeWidth={0.2} />
      ))}
      {/* North America */}
      <path d="M 5,5 L 28,5 L 32,12 L 30,18 L 24,22 L 18,20 L 12,16 L 5,12 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Greenland */}
      <path d="M 30,2 L 38,2 L 40,6 L 36,8 L 30,6 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* South America */}
      <path d="M 22,24 L 32,24 L 35,32 L 33,42 L 28,46 L 24,40 L 21,32 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Europe */}
      <path d="M 42,6 L 52,6 L 55,10 L 54,14 L 48,16 L 44,14 L 41,10 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Africa */}
      <path d="M 42,16 L 56,16 L 58,24 L 56,34 L 50,40 L 44,36 L 40,26 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Asia */}
      <path d="M 54,6 L 88,6 L 92,12 L 90,22 L 82,26 L 72,28 L 62,24 L 56,16 L 54,10 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* India */}
      <path d="M 64,20 L 70,20 L 72,26 L 68,30 L 64,26 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Southeast Asia / Indonesia */}
      <path d="M 72,28 L 82,28 L 84,32 L 78,34 L 72,32 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Japan */}
      <path d="M 86,14 L 90,14 L 89,18 L 85,16 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Australia */}
      <path d="M 78,34 L 90,34 L 92,42 L 86,44 L 78,42 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* New Zealand */}
      <path d="M 94,38 L 96,38 L 95,42 L 93,40 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Antarctica */}
      <path d="M 10,46 L 90,46 L 90,49 L 10,49 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* UK islands */}
      <path d="M 44,10 L 46,10 L 45,12 L 43,11 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Madagascar */}
      <path d="M 58,32 L 60,32 L 59,36 L 57,34 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Sri Lanka */}
      <path d="M 68,28 L 70,28 L 69,30 L 67,29 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Philippines */}
      <path d="M 78,24 L 82,24 L 81,28 L 77,26 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Papua New Guinea */}
      <path d="M 86,30 L 90,30 L 89,34 L 85,32 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
    </MapWrapper>
  );
}

/* ── Africa Map ── */
export function AfricaMap(props: MapProps) {
  return (
    <MapWrapper {...props}>
      <rect width={100} height={50} fill="var(--color-surface, #1a1730)" />
      {/* Africa continent */}
      <path d="M 20,5 L 55,5 L 62,20 L 58,35 L 48,45 L 38,42 L 28,32 L 22,20 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Madagascar */}
      <path d="M 62,30 L 64,30 L 63,36 L 61,34 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Canary Islands area */}
      <path d="M 15,10 L 17,10 L 16,12 L 14,11 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Cape Verde */}
      <path d="M 12,18 L 14,18 L 13,20 L 11,19 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Seychelles */}
      <path d="M 66,28 L 68,28 L 67,30 L 65,29 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Comoros */}
      <path d="M 62,32 L 64,32 L 63,34 L 61,33 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Mauritius */}
      <path d="M 66,36 L 68,36 L 67,38 L 65,37 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
    </MapWrapper>
  );
}

/* ── Oceania Map ── */
export function OceaniaMap(props: MapProps) {
  return (
    <MapWrapper {...props}>
      <rect width={100} height={50} fill="var(--color-surface, #1a1730)" />
      {/* Australia */}
      <path d="M 15,15 L 45,15 L 48,30 L 42,40 L 30,42 L 18,35 L 14,25 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* New Zealand */}
      <path d="M 52,30 L 56,30 L 55,36 L 51,34 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Papua New Guinea */}
      <path d="M 38,8 L 48,8 L 50,14 L 44,16 L 38,14 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Fiji */}
      <path d="M 58,22 L 62,22 L 61,26 L 57,24 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Solomon Islands */}
      <path d="M 48,16 L 54,16 L 53,20 L 47,18 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Vanuatu */}
      <path d="M 52,20 L 56,20 L 55,24 L 51,22 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* New Caledonia */}
      <path d="M 48,26 L 52,26 L 51,30 L 47,28 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Samoa */}
      <path d="M 68,20 L 72,20 L 71,24 L 67,22 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Tonga */}
      <path d="M 70,26 L 74,26 L 73,30 L 69,28 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Micronesia area */}
      <path d="M 65,5 L 75,5 L 74,10 L 66,9 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Palau */}
      <path d="M 58,8 L 62,8 L 61,12 L 57,10 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Marshall Islands */}
      <path d="M 70,4 L 76,4 L 75,8 L 69,7 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Kiribati */}
      <path d="M 75,10 L 82,10 L 81,15 L 74,13 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Tuvalu */}
      <path d="M 62,16 L 66,16 L 65,20 L 61,18 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Nauru */}
      <path d="M 58,12 L 60,12 L 59,14 L 57,13 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
    </MapWrapper>
  );
}

/* ── Antarctica Map ── */
export function AntarcticaMap(props: MapProps) {
  return (
    <MapWrapper {...props}>
      <rect width={100} height={50} fill="var(--color-surface, #1a1730)" />
      {/* Antarctica landmass */}
      <path d="M 10,10 L 90,10 L 95,25 L 85,40 L 50,45 L 20,40 L 5,25 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Antarctic Peninsula */}
      <path d="M 22,8 L 28,8 L 26,14 L 20,12 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Ross Sea area notch */}
      <path d="M 72,18 L 78,18 L 76,26 L 70,24 Z" fill="var(--color-surface, #1a1730)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
    </MapWrapper>
  );
}

/* ── UK Map ── */
export function UkMap(props: MapProps) {
  return (
    <MapWrapper {...props}>
      <rect width={100} height={50} fill="var(--color-surface, #1a1730)" />
      {/* Great Britain */}
      <path d="M 20,10 L 35,8 L 42,15 L 40,28 L 32,35 L 24,32 L 18,22 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Ireland */}
      <path d="M 10,12 L 18,12 L 20,20 L 16,26 L 10,24 L 8,18 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Northern Ireland */}
      <path d="M 16,12 L 20,12 L 19,16 L 15,15 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Isle of Man */}
      <path d="M 22,18 L 24,18 L 23,20 L 21,19 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Wales */}
      <path d="M 26,22 L 30,22 L 29,28 L 25,26 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Scotland */}
      <path d="M 28,4 L 36,4 L 38,12 L 32,14 L 26,10 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Shetland */}
      <path d="M 34,2 L 36,2 L 35,4 L 33,3 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Orkney */}
      <path d="M 32,6 L 34,6 L 33,8 L 31,7 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
      {/* Jersey / Guernsey area */}
      <path d="M 30,34 L 32,34 L 31,36 L 29,35 Z" fill="var(--color-card, #232040)" stroke="var(--color-foreground, #e2e0f0)" strokeOpacity={0.1} strokeWidth={0.2} />
    </MapWrapper>
  );
}
