import React, { useState } from "react";
import { ChevronDown, Star, Sparkles, X } from "lucide-react";

const theme = {
  bg: "#0f0d1a",
  surface: "#1a1730",
  card: "#232040",
  accent: "#a78bfa",
  success: "#4ade80",
  warning: "#fbbf24",
  text: "#e2e0f0",
};

const gridCards = [
  { id: 1, type: "matched", emoji: "🦄" },
  { id: 2, type: "matched", emoji: "🦄" },
  { id: 3, type: "down" },
  { id: 4, type: "down" },
  { id: 5, type: "down" },
  { id: 6, type: "matched", emoji: "🚀" },
  { id: 7, type: "matched", emoji: "🚀" },
  { id: 8, type: "down" },
  { id: 9, type: "comparing", emoji: "🌈" },
  { id: 10, type: "down" },
  { id: 11, type: "down" },
  { id: 12, type: "down" },
  { id: 13, type: "down" },
  { id: 14, type: "comparing", emoji: "🌈" },
  { id: 15, type: "down" },
  { id: 16, type: "down" },
];

function GameCard({ card }: { card: (typeof gridCards)[0] }) {
  let bg = theme.card;
  let border = "1px solid " + theme.surface;
  let shadow = "none";
  let content: React.ReactNode = "?";
  let textColor = theme.accent;

  if (card.type === "matched") {
    bg = "#ff007f22";
    border = "2px solid #ff007f";
    shadow = "0 0 12px #ff007f55";
    content = card.emoji;
    textColor = "#fff";
  } else if (card.type === "comparing") {
    bg = "#4ade8022";
    border = "2px solid #4ade80";
    shadow = "0 0 12px #4ade8055";
    content = card.emoji;
    textColor = "#fff";
  }

  return (
    <div
      className="rounded-xl flex items-center justify-center text-2xl font-bold select-none"
      style={{
        height: 64,
        backgroundColor: bg,
        border,
        boxShadow: shadow,
        color: textColor,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {content}
    </div>
  );
}

function WinOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-[300px] rounded-3xl p-6 text-center flex flex-col items-center overflow-hidden"
        style={{
          backgroundColor: theme.surface,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 opacity-50 hover:opacity-100"
          style={{ color: theme.text }}
        >
          <X size={16} />
        </button>

        <div className="absolute inset-0 pointer-events-none opacity-40">
          <Sparkles className="absolute top-4 left-6 text-yellow-400" size={14} />
          <Sparkles className="absolute top-6 right-8 text-pink-400" size={20} />
          <Sparkles className="absolute bottom-14 left-8 text-blue-400" size={16} />
          <Sparkles className="absolute bottom-10 right-6 text-green-400" size={12} />
        </div>

        <div className="text-3xl mb-1">🏆</div>
        <h2 className="text-xl font-black mb-4 tracking-tight" style={{ color: theme.text }}>
          Amazing!
        </h2>

        <div className="flex gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <Star
              key={s}
              size={36}
              fill={theme.warning}
              color={theme.warning}
              style={{ filter: "drop-shadow(0 0 8px rgba(251,191,36,0.5))" }}
            />
          ))}
        </div>

        <div
          className="text-4xl font-black tabular-nums tracking-tighter mb-1"
          style={{ color: theme.accent }}
        >
          850 <span className="text-base opacity-70 font-bold">pts</span>
        </div>
        <div className="text-xs mb-3 opacity-50">2× Bonus · 425 base score</div>

        <div
          className="text-xs font-semibold px-3 py-1.5 rounded-lg mb-5 w-full"
          style={{ backgroundColor: "#4ade8018", color: theme.success, border: "1px solid #4ade8033" }}
        >
          New best on Stage 3! +120 over previous
        </div>

        <div className="w-full flex gap-2">
          <button
            className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white"
            style={{ backgroundColor: theme.accent }}
          >
            Play Again
          </button>
          <button
            className="flex-1 py-2.5 rounded-xl font-bold text-sm"
            style={{ backgroundColor: theme.success, color: "#0f0d1a" }}
          >
            Stage 4 →
          </button>
        </div>
        <button
          className="mt-2 w-full py-2 rounded-xl text-sm opacity-60 hover:opacity-90"
          style={{ color: theme.text }}
        >
          ← Back to Hub
        </button>
      </div>
    </div>
  );
}

export function PlayScreen() {
  const [showOverlay, setShowOverlay] = useState(false);

  return (
    <div
      className="flex items-center justify-center min-h-screen font-sans"
      style={{ backgroundColor: "#0a0814", color: theme.text }}
    >
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          width: 390,
          height: 840,
          backgroundColor: theme.bg,
          borderRadius: 36,
          border: "6px solid #111",
          boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* HUD */}
        <div
          className="flex items-center justify-between px-4 flex-shrink-0"
          style={{ height: 72, backgroundColor: theme.surface }}
        >
          <button
            className="px-3 py-1.5 rounded-full text-sm font-medium"
            style={{ backgroundColor: theme.card, color: theme.text }}
          >
            ← Quit
          </button>

          <div className="flex flex-col items-center gap-0.5">
            <span className="text-base font-bold">🃏 Memory Match</span>
            <button className="text-xs opacity-50 flex items-center gap-0.5">
              Stage 3 / 99 <ChevronDown size={12} />
            </button>
          </div>

          <div className="flex flex-col items-end">
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded mb-0.5"
              style={{ backgroundColor: theme.warning, color: "#000" }}
            >
              2× 🔥
            </span>
            <span className="text-lg font-black" style={{ color: theme.accent }}>
              350
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full flex-shrink-0" style={{ backgroundColor: "#00000066" }}>
          <div
            className="h-full rounded-r-full"
            style={{
              width: "65%",
              backgroundColor: theme.accent,
              boxShadow: "0 0 8px #a78bfa",
            }}
          />
        </div>

        {/* Game area */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-4 relative">
          {/* Atmosphere glows */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="absolute top-8 left-8 w-28 h-28 rounded-full opacity-20"
              style={{ backgroundColor: "#a78bfa", filter: "blur(60px)" }}
            />
            <div
              className="absolute bottom-8 right-8 w-36 h-36 rounded-full opacity-15"
              style={{ backgroundColor: "#3b82f6", filter: "blur(80px)" }}
            />
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-4 gap-2.5 w-full z-10">
            {gridCards.map((card) => (
              <GameCard key={card.id} card={card} />
            ))}
          </div>

          {/* Match found toast */}
          <div
            className="mt-5 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 z-10"
            style={{
              backgroundColor: theme.surface,
              border: "1px solid " + theme.card,
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            ✨ Match found!
            <span style={{ color: theme.accent }}>+50</span>
          </div>
        </div>

        {/* Tap to see win screen button */}
        <div
          className="flex-shrink-0 flex justify-center pb-4 z-10"
          style={{ backgroundColor: theme.bg }}
        >
          <button
            onClick={() => setShowOverlay(true)}
            className="px-5 py-2 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: theme.card,
              color: theme.accent,
              border: "1px solid " + theme.accent + "44",
            }}
          >
            Preview Win Screen →
          </button>
        </div>

        {/* Win overlay — shown on demand */}
        {showOverlay && <WinOverlay onClose={() => setShowOverlay(false)} />}
      </div>
    </div>
  );
}
