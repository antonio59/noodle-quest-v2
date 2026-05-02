import React from "react";
import { Star, Play, Users } from "lucide-react";

export function GameCards() {
  return (
    <div className="min-h-screen bg-[#0f0d1a] text-[#e2e0f0] p-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-16">
        <div>
          <h1 className="text-4xl font-bold mb-4 tracking-tight text-white">Improved Game Cards</h1>
          <p className="text-[#a78bfa] text-lg">Hover to see glowing accents and play interactions.</p>
        </div>

        {/* Row 1 - Brain Game Cards */}
        <section>
          <h2 className="text-2xl font-semibold mb-8 border-b border-[#232040] pb-4">Brain Game Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1: Copy Cat */}
            <div className="group relative bg-[#232040] rounded-3xl p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(167,139,250,0.3)] border border-[#a78bfa]/20 overflow-hidden cursor-pointer flex flex-col items-center text-center">
              <div className="absolute top-4 right-4 flex gap-2">
                <span className="bg-amber-500/20 text-[#fbbf24] px-3 py-1 rounded-full text-xs font-bold border border-[#fbbf24]/30 shadow-[0_0_10px_rgba(251,191,36,0.3)] animate-pulse">
                  2× Bonus!
                </span>
              </div>
              <div className="absolute top-4 left-4">
                <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-xs font-semibold border border-purple-500/30">
                  Memory
                </span>
              </div>

              <div className="text-[64px] mb-4 mt-6 leading-none group-hover:scale-110 transition-transform duration-300">🐱</div>
              <h3 className="text-2xl font-bold mb-2">Copy Cat</h3>
              <p className="text-[#e2e0f0]/60 text-sm mb-6">Repeat the growing sequence of colors and sounds.</p>
              
              <div className="flex gap-1 mb-4">
                <Star className="w-6 h-6 fill-[#fbbf24] text-[#fbbf24]" />
                <Star className="w-6 h-6 fill-[#fbbf24] text-[#fbbf24]" />
                <Star className="w-6 h-6 text-[#fbbf24]/30" />
              </div>

              <div className="text-sm font-medium text-[#a78bfa]">Level 12</div>

              {/* Hover Play Button Overlay */}
              <div className="absolute inset-0 bg-[#0f0d1a]/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
                <button className="bg-[#a78bfa] text-white rounded-full p-4 transform translate-y-8 group-hover:translate-y-0 transition-all duration-300 hover:scale-110 hover:shadow-[0_0_20px_rgba(167,139,250,0.6)] flex items-center gap-2 pr-6 font-bold">
                  <Play className="fill-current" />
                  Play Now
                </button>
              </div>
            </div>

            {/* Card 2: Focus Frenzy */}
            <div className="group relative bg-[#232040] rounded-3xl p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(56,189,248,0.3)] border border-sky-400/20 overflow-hidden cursor-pointer flex flex-col items-center text-center">
              <div className="absolute top-4 left-4">
                <span className="bg-sky-500/20 text-sky-300 px-3 py-1 rounded-full text-xs font-semibold border border-sky-500/30">
                  Focus
                </span>
              </div>

              <div className="text-[64px] mb-4 mt-6 leading-none group-hover:scale-110 transition-transform duration-300">🔮</div>
              <h3 className="text-2xl font-bold mb-2">Focus Frenzy</h3>
              <p className="text-[#e2e0f0]/60 text-sm mb-6">Find the matching symbols before time runs out.</p>
              
              <div className="flex gap-1 mb-4">
                <Star className="w-6 h-6 fill-[#fbbf24] text-[#fbbf24]" />
                <Star className="w-6 h-6 fill-[#fbbf24] text-[#fbbf24]" />
                <Star className="w-6 h-6 fill-[#fbbf24] text-[#fbbf24]" />
              </div>

              <div className="text-sm font-medium text-sky-400">Level 5</div>

              {/* Hover Play Button Overlay */}
              <div className="absolute inset-0 bg-[#0f0d1a]/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
                <button className="bg-sky-500 text-white rounded-full p-4 transform translate-y-8 group-hover:translate-y-0 transition-all duration-300 hover:scale-110 hover:shadow-[0_0_20px_rgba(56,189,248,0.6)] flex items-center gap-2 pr-6 font-bold">
                  <Play className="fill-current" />
                  Play Now
                </button>
              </div>
            </div>

            {/* Card 3: Emotion Volcano */}
            <div className="group relative bg-[#232040] rounded-3xl p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] border border-pink-500/20 overflow-hidden cursor-pointer flex flex-col items-center text-center">
              <div className="absolute top-4 left-4">
                <span className="bg-pink-500/20 text-pink-300 px-3 py-1 rounded-full text-xs font-semibold border border-pink-500/30">
                  Social
                </span>
              </div>
              <div className="absolute top-4 right-4">
                <span className="bg-[#4ade80]/20 text-[#4ade80] px-3 py-1 rounded-full text-xs font-bold border border-[#4ade80]/30">
                  NEW
                </span>
              </div>

              <div className="text-[64px] mb-4 mt-6 leading-none group-hover:scale-110 transition-transform duration-300 grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100">🌋</div>
              <h3 className="text-2xl font-bold mb-2">Emotion Volcano</h3>
              <p className="text-[#e2e0f0]/60 text-sm mb-6">Identify feelings before they erupt.</p>
              
              <div className="flex gap-1 mb-4">
                <Star className="w-6 h-6 fill-[#fbbf24] text-[#fbbf24]" />
                <Star className="w-6 h-6 text-[#fbbf24]/30" />
                <Star className="w-6 h-6 text-[#fbbf24]/30" />
              </div>

              <div className="text-sm font-medium text-pink-400">Unplayed</div>

              {/* Hover Play Button Overlay */}
              <div className="absolute inset-0 bg-[#0f0d1a]/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
                <button className="bg-pink-500 text-white rounded-full p-4 transform translate-y-8 group-hover:translate-y-0 transition-all duration-300 hover:scale-110 hover:shadow-[0_0_20px_rgba(236,72,153,0.6)] flex items-center gap-2 pr-6 font-bold">
                  <Play className="fill-current" />
                  Start Game
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* Row 2 - Board Game Cards */}
        <section>
          <h2 className="text-2xl font-semibold mb-8 border-b border-[#232040] pb-4">Board Game Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 4: Chess */}
            <div className="group relative bg-[#232040] rounded-3xl p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(167,139,250,0.3)] border border-[#a78bfa]/20 flex flex-col items-center">
              <div className="absolute top-4 right-4 flex gap-2 text-xs text-[#a78bfa] bg-[#1a1730] px-3 py-1.5 rounded-full items-center">
                <Users size={14} className="mr-1" /> vs AI / Friend
              </div>

              <div className="text-[64px] mb-4 mt-8 leading-none">♔</div>
              <h3 className="text-2xl font-bold mb-2 text-center">Chess</h3>
              <p className="text-[#e2e0f0]/60 text-sm mb-8 text-center px-4">Classic strategy game of kings and queens.</p>
              
              <div className="mt-auto w-full">
                <p className="text-xs text-center text-[#e2e0f0]/50 mb-3 uppercase tracking-wider font-semibold">Select Difficulty</p>
                <div className="flex gap-2 justify-center">
                  <button className="flex-1 bg-[#4ade80]/10 hover:bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30 rounded-xl py-2 text-sm font-semibold transition-colors">
                    Easy
                  </button>
                  <button className="flex-1 bg-[#a78bfa]/10 hover:bg-[#a78bfa]/20 text-[#a78bfa] border border-[#a78bfa]/30 rounded-xl py-2 text-sm font-semibold transition-colors">
                    Medium
                  </button>
                  <button className="flex-1 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30 rounded-xl py-2 text-sm font-semibold transition-colors">
                    Hard
                  </button>
                </div>
              </div>
            </div>

            {/* Card 5: UNO */}
            <div className="group relative bg-[#232040] rounded-3xl p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(239,68,68,0.3)] border border-red-500/20 flex flex-col items-center">
              <div className="absolute top-4 right-4 flex gap-2 text-xs text-red-400 bg-[#1a1730] px-3 py-1.5 rounded-full items-center">
                <Users size={14} className="mr-1" /> 2-4 Players
              </div>

              <div className="text-[64px] mb-4 mt-8 leading-none">🃏</div>
              <h3 className="text-2xl font-bold mb-2 text-center">UNO</h3>
              <p className="text-[#e2e0f0]/60 text-sm mb-8 text-center px-4">Be the first to get rid of all your cards.</p>
              
              <div className="mt-auto w-full">
                <p className="text-xs text-center text-[#e2e0f0]/50 mb-3 uppercase tracking-wider font-semibold">Select Difficulty</p>
                <div className="flex gap-2 justify-center">
                  <button className="flex-1 bg-[#4ade80]/10 hover:bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30 rounded-xl py-2 text-sm font-semibold transition-colors">
                    Easy
                  </button>
                  <button className="flex-1 bg-[#a78bfa]/10 hover:bg-[#a78bfa]/20 text-[#a78bfa] border border-[#a78bfa]/30 rounded-xl py-2 text-sm font-semibold transition-colors">
                    Medium
                  </button>
                  <button className="flex-1 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30 rounded-xl py-2 text-sm font-semibold transition-colors">
                    Hard
                  </button>
                </div>
              </div>
            </div>

            {/* Card 6: Scrabble */}
            <div className="group relative bg-[#232040] rounded-3xl p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(251,191,36,0.3)] border border-amber-500/20 flex flex-col items-center">
              <div className="absolute top-4 right-4 flex gap-2 text-xs text-amber-400 bg-[#1a1730] px-3 py-1.5 rounded-full items-center">
                <Users size={14} className="mr-1" /> 2-4 Players
              </div>

              <div className="text-[64px] mb-4 mt-8 leading-none">🔤</div>
              <h3 className="text-2xl font-bold mb-2 text-center">Scrabble</h3>
              <p className="text-[#e2e0f0]/60 text-sm mb-8 text-center px-4">Build words to score points against opponents.</p>
              
              <div className="mt-auto w-full">
                <p className="text-xs text-center text-[#e2e0f0]/50 mb-3 uppercase tracking-wider font-semibold">Select Difficulty</p>
                <div className="flex gap-2 justify-center">
                  <button className="flex-1 bg-[#4ade80]/10 hover:bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30 rounded-xl py-2 text-sm font-semibold transition-colors">
                    Easy
                  </button>
                  <button className="flex-1 bg-[#a78bfa]/10 hover:bg-[#a78bfa]/20 text-[#a78bfa] border border-[#a78bfa]/30 rounded-xl py-2 text-sm font-semibold transition-colors">
                    Medium
                  </button>
                  <button className="flex-1 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30 rounded-xl py-2 text-sm font-semibold transition-colors">
                    Hard
                  </button>
                </div>
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}
