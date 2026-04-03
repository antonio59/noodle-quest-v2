import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllGames } from '@/lib/game-registry';
import { LogOut, Star, Gamepad2, Zap, Trophy, Medal } from 'lucide-react';

const ALL_AVATARS = [
  '🦊','🐱','🐶','🦁','🐼','🐨','🦄','🐸','🐙','🦋',
  '🐢','🦖','🐧','🦜','🐝','🐛','🐞','🦀','🐳','🐬',
  '🦩','🐿️','🦔','🐇','🦥','🦦','🦨','🦫','🦬','🦣',
  '🦕','🐊','🐅','🐆','🦍','🦧','🐘','🦛','🦏','🐪',
];

const BADGES = [
  { id: 'first_game',   name: 'First Steps',      emoji: '👣',  desc: 'Play your first game' },
  { id: 'first_star',   name: 'Star Collector',   emoji: '⭐',  desc: 'Earn your first star' },
  { id: 'star_10',      name: 'Rising Star',      emoji: '🌟',  desc: 'Earn 10 stars' },
  { id: 'star_30',      name: 'Superstar',        emoji: '✨',  desc: 'Earn 30 stars' },
  { id: 'star_60',      name: 'Legend',           emoji: '👑',  desc: 'Earn 60 stars' },
  { id: 'star_100',     name: 'GOAT',             emoji: '🏆',  desc: 'Earn 100 stars' },
  { id: 'star_200',     name: 'Mythical',         emoji: '🐉',  desc: 'Earn 200 stars' },
  { id: 'star_500',     name: 'Immortal',         emoji: '💎',  desc: 'Earn 500 stars' },
  { id: 'perfect',      name: 'Perfectionist',    emoji: '🎯',  desc: 'Get 3 stars on any game' },
  { id: 'perfect_5',    name: 'Sharp Shooter',    emoji: '🏹',  desc: 'Get 3 stars on 5 games' },
  { id: 'perfect_10',   name: 'Flawless',         emoji: '💯',  desc: 'Get 3 stars on 10 games' },
  { id: 'games_5',      name: 'Gamer',            emoji: '🎮',  desc: 'Play 5 different games' },
  { id: 'games_10',     name: 'Addict',           emoji: '🔥',  desc: 'Play 10 different games' },
  { id: 'games_all',    name: 'Completionist',    emoji: '🎉',  desc: 'Play all brain games' },
  { id: 'stage_5',      name: 'Getting There',    emoji: '📈',  desc: 'Reach stage 5 in any game' },
  { id: 'stage_10',     name: 'Marathon',         emoji: '🏃',  desc: 'Reach stage 10 in any game' },
  { id: 'stage_15',     name: 'Endurance',        emoji: '🏋️',  desc: 'Reach stage 15 in any game' },
  { id: 'stage_20',     name: 'Ultimate',         emoji: '🌈',  desc: 'Reach stage 20 in any game' },
  { id: 'streak_3',     name: 'On Fire',          emoji: '🔥',  desc: 'Play 3 games in a row' },
  { id: 'streak_7',     name: 'Unstoppable',      emoji: '⚡',  desc: 'Play 7 games in a row' },
  { id: 'challenger',   name: 'Challenger',       emoji: '⚔️',  desc: 'Send your first challenge' },
  { id: 'champion',     name: 'Champion',         emoji: '🥇',  desc: 'Win 5 challenges' },
  { id: 'social',       name: 'Social Butterfly', emoji: '🦋',  desc: 'Send 10 chat messages' },
  { id: 'explorer',     name: 'Explorer',         emoji: '🗺️',  desc: 'Try every game category' },
];

interface PlayerStats {
  totalStars: number;
  gamesPlayed: number;
  streak: number;
  maxStage: number;
  threeStars: number;
}

export function Profile() {
  const { player, logout, updateAvatar } = useAuth();
  const games = getAllGames();
  const [takenAvatars, setTakenAvatars] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<PlayerStats>({ totalStars: 0, gamesPlayed: 0, streak: 0, maxStage: 0, threeStars: 0 });
  const [earnedBadges, setEarnedBadges] = useState<Set<string>>(new Set());

  // Fetch stats from Convex
  const fetchStats = useCallback(async () => {
    if (!player) return;
    try {
      const scoresRes = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
        body: JSON.stringify({
          path: 'games:getPlayerStats',
          format: 'convex_encoded_json',
          args: [{ playerId: player.playerId }],
        }),
      });
      const scoresData = await scoresRes.json();

      const lbRes = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
        body: JSON.stringify({
          path: 'games:getLeaderboard',
          format: 'convex_encoded_json',
          args: [{}],
        }),
      });
      const lbData = await lbRes.json();

      let totalStars = 0;
      let gamesPlayed = 0;
      let maxStage = 0;
      let threeStars = 0;

      if (scoresData.value) {
        totalStars = scoresData.value.totalStars || 0;
        gamesPlayed = scoresData.value.gamesPlayed || 0;
        maxStage = scoresData.value.maxStage || 0;
        threeStars = scoresData.value.threeStars || 0;
      }

      if (lbData.value) {
        const me = lbData.value.find((p: Record<string, unknown>) => p.playerName === player.name);
        if (me) {
          totalStars = (me.totalStars as number) || totalStars;
          gamesPlayed = (me.gamesPlayed as number) || gamesPlayed;
        }
      }

      const streak = gamesPlayed > 0 ? Math.min(gamesPlayed, 7) : 0;
      setStats({ totalStars, gamesPlayed, streak, maxStage, threeStars });

      const earned = new Set<string>();
      if (gamesPlayed >= 1) earned.add('first_game');
      if (totalStars >= 1) earned.add('first_star');
      if (totalStars >= 10) earned.add('star_10');
      if (totalStars >= 30) earned.add('star_30');
      if (totalStars >= 60) earned.add('star_60');
      if (totalStars >= 100) earned.add('star_100');
      if (totalStars >= 200) earned.add('star_200');
      if (totalStars >= 500) earned.add('star_500');
      if (threeStars >= 1) earned.add('perfect');
      if (threeStars >= 5) earned.add('perfect_5');
      if (threeStars >= 10) earned.add('perfect_10');
      if (gamesPlayed >= 5) earned.add('games_5');
      if (gamesPlayed >= 10) earned.add('games_10');
      if (gamesPlayed >= games.length) earned.add('games_all');
      if (maxStage >= 5) earned.add('stage_5');
      if (maxStage >= 10) earned.add('stage_10');
      if (maxStage >= 15) earned.add('stage_15');
      if (maxStage >= 20) earned.add('stage_20');
      if (streak >= 3) earned.add('streak_3');
      if (streak >= 7) earned.add('streak_7');
      setEarnedBadges(earned);
    } catch { /* offline */ }
  }, [player, games.length]);

  useEffect(() => {
    if (!player) return;
    const timer = setTimeout(fetchStats, 0);
    return () => clearTimeout(timer);
  }, [player, games.length, fetchStats]);

  useEffect(() => {
    const fetchTaken = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
          body: JSON.stringify({
            path: 'auth:searchPlayers',
            format: 'convex_encoded_json',
            args: [{ query: '', currentPlayerId: player?.playerId || 'x' }],
          }),
        });
        const data = await res.json();
        if (data.value) {
          const taken = new Set<string>();
          data.value.forEach((p: { avatar: string }) => taken.add(p.avatar));
          setTakenAvatars(taken);
        }
      } catch { /* offline */ }
    };
    if (player) fetchTaken();
  }, [player]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5">
        {/* Player Card */}
        <div className="bg-gradient-to-br from-accent/20 to-card rounded-2xl p-6 text-center mb-6 border border-accent/10">
          <div className="text-6xl mb-3">{player?.avatar || '🎮'}</div>
          <h2 className="text-2xl font-bold">{player?.name}</h2>
          <p className="text-text-muted text-sm">Player</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { icon: Star, label: 'Stars', value: stats.totalStars, color: 'text-warning' },
            { icon: Zap, label: 'Streak', value: stats.streak, color: 'text-success' },
            { icon: Gamepad2, label: 'Games', value: stats.gamesPlayed, color: 'text-accent' },
            { icon: Trophy, label: 'Max Stage', value: stats.maxStage, color: 'text-primary' },
          ].map(s => (
            <div key={s.label} className="bg-card rounded-xl p-3 text-center">
              <s.icon className={`mx-auto mb-1 ${s.color}`} size={18} />
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-text-muted text-[10px]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Avatar picker */}
        <div className="bg-card rounded-xl p-4 mb-6">
          <h3 className="text-sm font-bold text-text-dim mb-1">Change Avatar</h3>
          <p className="text-text-muted text-xs mb-3">Avatars in use by others are dimmed</p>
          <div className="flex flex-wrap gap-2">
            {ALL_AVATARS.map(a => {
              const isCurrent = player?.avatar === a;
              const isTaken = takenAvatars.has(a) && !isCurrent;
              return (
                <button
                  key={a}
                  onClick={() => !isTaken && updateAvatar(a)}
                  disabled={isTaken}
                  className={`text-xl p-1.5 rounded-lg transition-all ${
                    isCurrent
                      ? 'bg-accent-soft ring-2 ring-accent scale-110'
                      : isTaken
                        ? 'opacity-20 cursor-not-allowed'
                        : 'opacity-60 hover:opacity-100 hover:scale-110'
                  }`}
                  title={isTaken ? 'In use by another player' : isCurrent ? 'Your avatar' : 'Select'}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-card rounded-xl p-4 mb-6">
          <h3 className="text-sm font-bold text-text-dim mb-1 flex items-center gap-2">
            <Medal size={16} className="text-warning" /> Achievements ({earnedBadges.size}/{BADGES.length})
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {BADGES.map(badge => {
              const isEarned = earnedBadges.has(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`rounded-xl p-2 text-center transition-opacity ${
                    isEarned ? 'bg-accent-soft/50 ring-1 ring-accent/20' : 'opacity-30'
                  }`}
                  title={badge.desc}
                >
                  <div className="text-xl mb-0.5">{isEarned ? badge.emoji : '🔒'}</div>
                  <div className="text-[10px] font-semibold text-text-dim truncate">{badge.name}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-danger/10 text-danger font-semibold py-3 rounded-xl hover:bg-danger/20 transition-colors active:scale-95 border border-danger/20"
        >
          <LogOut size={18} /> Log Out
        </button>
      </div>
    </div>
  );
}
