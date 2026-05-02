import React from "react";
import { ChevronDown, Star, Sparkles } from "lucide-react";

export function PlayScreen() {
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
    { id: 3, type: "down", emoji: "❓" },
    { id: 4, type: "down", emoji: "❓" },
    { id: 5, type: "down", emoji: "❓" },
    { id: 6, type: "matched", emoji: "🚀" },
    { id: 7, type: "matched", emoji: "🚀" },
    { id: 8, type: "down", emoji: "❓" },
    { id: 9, type: "comparing", emoji: "🌈" },
    { id: 10, type: "down", emoji: "❓" },
    { id: 11, type: "down", emoji: "❓" },
    { id: 12, type: "down", emoji: "❓" },
    { id: 13, type: "down", emoji: "❓" },
    { id: 14, type: "comparing", emoji: "🌈" },
    { id: 15, type: "down", emoji: "❓" },
    { id: 16, type: "down", emoji: "❓" },
  ];

  return (
    <div
      className="relative flex items-center justify-center min-h-screen bg-gray-900 overflow-hidden font-sans"
      style={{ color: theme.text }}
    >
      <div
        className="relative shadow-2xl overflow-hidden flex flex-col"
        style={{
          width: 390,
          height: 844,
          backgroundColor: theme.bg,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          borderRadius: "40px",
          border: "8px solid #000",
        }}
      >
        {/* Section 1: HUD */}
        <div
          className="flex items-center justify-between px-4 z-10"
          style={{ height: "80px", backgroundColor: theme.surface }}
        >
          <button
            className="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1"
            style={{ backgroundColor: theme.card, color: theme.text }}
          >
            ← Quit
          </button>

          <div className="flex flex-col items-center">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <span>🃏</span> Memory Match
            </h1>
            <button className="text-xs flex items-center gap-1 opacity-70">
              Stage 3 / 99 <ChevronDown size={14} />
            </button>
          </div>

          <div className="flex flex-col items-end">
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded-sm mb-0.5"
              style={{ backgroundColor: theme.warning, color: "#000" }}
            >
              2×🔥
            </span>
            <span
              className="text-xl font-black tabular-nums tracking-tight"
              style={{ color: theme.accent }}
            >
              350
            </span>
          </div>
        </div>

        {/* Section 2: Progress Bar */}
        <div className="h-[6px] w-full bg-black/40">
          <div
            className="h-full rounded-r-full"
            style={{
              width: "65%",
              backgroundColor: theme.accent,
              boxShadow: "0 0 10px #a78bfa",
            }}
          />
        </div>

        {/* Section 3: Game Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
          <div className="grid grid-cols-4 gap-3 w-full max-w-[340px] mx-auto z-10">
            {gridCards.map((card) => {
              let bg = theme.card;
              let border = "none";
              let shadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
              let opacity = 1;
              let content = card.emoji;
              let color = theme.text;

              if (card.type === "matched") {
                bg = "#ff007f33";
                border = "2px solid #ff007f";
                shadow = "0 0 15px #ff007f66";
                opacity = 0.7;
              } else if (card.type === "comparing") {
                bg = "#4ade8033";
                border = "2px solid #4ade80";
                shadow = "0 0 15px #4ade8066";
              } else if (card.type === "down") {
                bg = theme.surface;
                border = "1px solid " + theme.card;
                content = "❓";
                color = theme.accent;
              }

              return (
                <div
                  key={card.id}
                  className="rounded-xl flex items-center justify-center text-3xl"
                  style={{
                    height: "72px",
                    backgroundColor: bg,
                    border,
                    boxShadow: shadow,
                    opacity,
                    color,
                    cursor: "pointer",
                  }}
                >
                  {content}
                </div>
              );
            })}
          </div>

          {/* Feedback Message */}
          <div
            className="mt-8 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 animate-bounce shadow-lg z-10"
            style={{ backgroundColor: theme.surface, border: "1px solid " + theme.card }}
          >
            <span>✨</span>
            Match found!
            <span style={{ color: theme.accent }}>+50</span>
          </div>

          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
            <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-purple-600 blur-[80px]"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 rounded-full bg-blue-600 blur-[100px]"></div>
          </div>
        </div>

        {/* End of Game Overlay */}
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="relative w-[320px] rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center overflow-hidden"
            style={{
              backgroundColor: theme.surface,
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div className="absolute inset-0 pointer-events-none opacity-50">
              <Sparkles className="absolute top-4 left-4 text-yellow-400" size={16} />
              <Sparkles className="absolute top-8 right-6 text-pink-400" size={24} />
              <Sparkles className="absolute bottom-16 left-8 text-blue-400" size={20} />
              <Sparkles className="absolute bottom-8 right-10 text-green-400" size={14} />
            </div>

            <h2 className="text-2xl font-black mb-4 tracking-tight">🏆 Amazing!</h2>

            <div className="flex gap-2 mb-6">
              {[1, 2, 3].map((star) => (
                <Star
                  key={star}
                  size={40}
                  fill={theme.warning}
                  color={theme.warning}
                  className="drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                />
              ))}
            </div>

            <div
              className="text-5xl font-black tabular-nums tracking-tighter mb-2"
              style={{ color: theme.accent, textShadow: "0 0 20px #a78bfa66" }}
            >
              850 <span className="text-xl opacity-80">pts</span>
            </div>

            <div className="text-xs mb-4 opacity-60 font-medium">
              2× Bonus applied · 425 base score
            </div>

            <div
              className="text-sm font-bold px-3 py-1.5 rounded-lg mb-8 bg-black/20"
              style={{ color: theme.success }}
            >
              New best on Stage 3! +120 over previous
            </div>

            <div className="w-full flex gap-2 justify-center">
              <button
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white"
                style={{ backgroundColor: theme.accent }}
              >
                Play Again
              </button>
              <button
                className="flex-1 py-3 rounded-xl font-bold text-sm text-black"
                style={{ backgroundColor: theme.success }}
              >
                Stage 4 →
              </button>
            </div>

            <button
              className="mt-3 w-full py-2.5 rounded-xl font-semibold text-sm opacity-80"
              style={{ backgroundColor: theme.card, color: theme.text }}
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
