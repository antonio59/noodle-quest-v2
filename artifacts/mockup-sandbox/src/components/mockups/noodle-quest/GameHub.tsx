import React, { useState } from 'react';
import './_group.css';
import { Search, Home, Gamepad2, Trophy, MessageCircle, User } from 'lucide-react';

const GAMES = [
  { id: 1, name: 'Copy Cat', emoji: '🐱', desc: 'Repeat the sequence of sounds and colors.', levels: 12, stars: 3 },
  { id: 2, name: 'Memory Match', emoji: '🃏', desc: 'Find the matching pairs of cards.', levels: 24, stars: 2 },
  { id: 3, name: 'Number Ninja', emoji: '🔢', desc: 'Slice the numbers in the correct order.', levels: 15, stars: 1 },
  { id: 4, name: 'Focus Frenzy', emoji: '🔮', desc: 'Keep your eye on the glowing orb.', levels: 8, stars: 3 },
  { id: 5, name: 'Mirror Match', emoji: '🪞', desc: 'Draw the exact reflection of the shape.', levels: 20, stars: 0 },
  { id: 6, name: 'Attention Archery', emoji: '🏹', desc: 'Hit the target at the exact right moment.', levels: 30, stars: 2 },
  { id: 7, name: 'Steady Hands', emoji: '🎯', desc: 'Navigate the maze without touching walls.', levels: 10, stars: 3 },
  { id: 8, name: 'Pixel Paint', emoji: '🟦', desc: 'Color by numbers to reveal the picture.', levels: 50, stars: 1 },
  { id: 9, name: 'Flexibility Frames', emoji: '🔄', desc: 'Adapt to changing rules on the fly.', levels: 18, stars: 2 },
  { id: 10, name: 'Empathy Engine', emoji: '💝', desc: 'Match emotions to the scenarios.', levels: 14, stars: 3 },
  { id: 11, name: 'Story Builder', emoji: '📖', desc: 'Construct a narrative using picture cards.', levels: 22, stars: 0 },
  { id: 12, name: 'Quick Math', emoji: '🧮', desc: 'Solve equations before time runs out.', levels: 40, stars: 2 },
];

const FAVORITES = [
  { id: 1, name: 'Copy Cat', emoji: '🐱' },
  { id: 2, name: 'Memory', emoji: '🃏' },
  { id: 7, name: 'Steady', emoji: '🎯' },
];

const FILTERS = ['All', '🎯 Focus', '🧠 Memory', '✋ Motor', '🔄 Flexibility', '💝 Social', '📋 Sequence'];

export function GameHub() {
  const [activeTab, setActiveTab] = useState('Brain');
  const [activeFilter, setActiveFilter] = useState('All');

  return (
    <div className="flex justify-center bg-[#050505] min-h-screen font-sans">
      <div 
        className="w-full max-w-[390px] h-[844px] relative overflow-hidden flex flex-col"
        style={{ backgroundColor: '#0f0d1a', color: '#e2e8f0' }}
      >
        {/* Header / Top Tabs */}
        <header className="nq-glass-header pt-12 pb-3 px-4 sticky top-0 z-20">
          <h1 className="text-2xl font-black text-white mb-4 tracking-tight">Noodle Quest</h1>
          
          <div className="flex space-x-2">
            {[
              { id: 'Brain', icon: '🧠', label: 'Brain' },
              { id: 'Board', icon: '🎲', label: 'Board' },
              { id: 'Breathe', icon: '🌬️', label: 'Breathe' },
              { id: 'Tracks', icon: '🎵', label: 'Tracks' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                  activeTab === tab.id 
                    ? 'nq-tab-active text-[#a78bfa]' 
                    : 'bg-[#1a1730] text-slate-400 hover:bg-[#232040]'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto nq-hide-scrollbar pb-24 relative">
          
          {/* Ambient Background Glows */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#a78bfa] rounded-full mix-blend-screen filter blur-[100px] opacity-10 pointer-events-none"></div>
          <div className="absolute top-1/2 left-0 w-64 h-64 bg-[#c084fc] rounded-full mix-blend-screen filter blur-[100px] opacity-10 pointer-events-none"></div>

          <div className="p-4 space-y-6">
            
            {/* Search */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-[#a78bfa] transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search games..."
                className="w-full bg-[#1a1730] border border-[rgba(167,139,250,0.15)] rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#a78bfa] focus:ring-1 focus:ring-[#a78bfa] transition-all shadow-inner"
              />
            </div>

            {/* Favorites */}
            <div>
              <h2 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                <span className="text-[#a78bfa]">★</span> Jump Back In
              </h2>
              <div className="flex gap-3">
                {FAVORITES.map(fav => (
                  <button key={fav.id} className="flex flex-col items-center gap-2 group">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#232040] to-[#1a1730] border border-[rgba(167,139,250,0.2)] flex items-center justify-center text-3xl shadow-lg group-hover:border-[#a78bfa] transition-all transform group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(167,139,250,0.3)]">
                      <span className="nq-animate-float" style={{ animationDelay: `${fav.id * 0.2}s` }}>
                        {fav.emoji}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-400 group-hover:text-white transition-colors">{fav.name}</span>
                  </button>
                ))}
                <button className="flex flex-col items-center gap-2 group">
                  <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-[rgba(167,139,250,0.2)] flex items-center justify-center text-[#a78bfa] group-hover:border-[#a78bfa] group-hover:bg-[#1a1730] transition-all">
                    +
                  </div>
                  <span className="text-xs font-semibold text-slate-500">More</span>
                </button>
              </div>
            </div>

            {/* Categories */}
            <div className="flex overflow-x-auto gap-2 nq-hide-scrollbar pb-2 -mx-4 px-4">
              {FILTERS.map(filter => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    activeFilter === filter
                      ? 'bg-[#a78bfa] text-[#0f0d1a] shadow-[0_0_10px_rgba(167,139,250,0.4)]'
                      : 'bg-[#1a1730] text-slate-300 border border-[rgba(167,139,250,0.1)] hover:bg-[#232040]'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Games Grid */}
            <div className="grid grid-cols-2 gap-4">
              {GAMES.map(game => (
                <div key={game.id} className="nq-card rounded-2xl p-4 relative cursor-pointer group">
                  <div className="nq-card-glow"></div>
                  
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-[#1a1730] border border-[rgba(167,139,250,0.1)] flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform duration-300">
                      {game.emoji}
                    </div>
                    <div className="text-[10px] font-bold text-[#a78bfa] bg-[#232040] px-2 py-1 rounded-md border border-[rgba(167,139,250,0.2)]">
                      Lv {game.levels}
                    </div>
                  </div>
                  
                  <div className="relative z-10">
                    <h3 className="font-bold text-white text-sm mb-1 leading-tight">{game.name}</h3>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-snug mb-3 min-h-[30px]">{game.desc}</p>
                    
                    <div className="flex gap-1">
                      {[1, 2, 3].map(star => (
                        <svg 
                          key={star} 
                          className={`w-3 h-3 ${star <= game.stars ? 'text-yellow-400 drop-shadow-[0_0_2px_rgba(250,204,21,0.5)]' : 'text-[#1a1730]'}`} 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </main>

        {/* Bottom Nav */}
        <nav className="nq-bottom-nav absolute bottom-0 w-full px-6 py-4 flex justify-between items-center z-20 pb-8">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'games', icon: Gamepad2, label: 'Games', active: true },
            { id: 'ranks', icon: Trophy, label: 'Ranks' },
            { id: 'chat', icon: MessageCircle, label: 'Chat' },
            { id: 'profile', icon: User, label: 'Profile' },
          ].map(item => (
            <button key={item.id} className="flex flex-col items-center gap-1 group relative">
              <item.icon className={`w-6 h-6 transition-all ${item.active ? 'text-[#a78bfa] drop-shadow-[0_0_8px_rgba(167,139,250,0.5)]' : 'text-slate-500 group-hover:text-slate-300'}`} strokeWidth={item.active ? 2.5 : 2} />
              {item.active && (
                <div className="absolute -bottom-2 w-1 h-1 bg-[#a78bfa] rounded-full shadow-[0_0_5px_rgba(167,139,250,1)]"></div>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
