import { useState, useEffect, createElement, Suspense } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Star, ChevronRight, ChevronDown, ArrowRight, Lock, Flag, Loader2, Copy, Check } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@/contexts/AuthContext';
import { getGameMeta, getGameComponent, getAllGames } from '@/lib/game-registry';
import { computeBonusTiers, getBonusTier, applyBonus } from '@/lib/bonus-multiplier';
import type { GameResult } from '@/types';
import { ReportIssueModal } from '@/components/ReportIssueModal';

export function PlayGame() {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();
  const { player } = useAuth();

  const stage = (location.state as any)?.stage ?? 1;
  const fromTab = (location.state as any)?.fromTab ?? 'brain';
  const isMultiplayer = (location.state as any)?.multiplayer ?? false;
  const joinerSessionId = (location.state as any)?.sessionId as string | undefined;

  const [currentStage, setCurrentStage] = useState(stage);
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [ended, setEnded] = useState<GameResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [nextStage, setNextStage] = useState<number | null>(null);
  const [numPlayers, setNumPlayers] = useState<number>(2);
  const [lobbyDone, setLobbyDone] = useState(false);
  const [showStagePicker, setShowStagePicker] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const saveScore = useMutation(api.games.saveScore);

  // Look up game metadata (no component import)
  const gameMeta = gameId ? getGameMeta(gameId) : undefined;

  // Fetch player's progress for this game to enable stage selection
  const playerProgress = useQuery(
    api.games.getPlayerProgress,
    player && gameId ? { playerId: player.playerId as any, gameId } : 'skip' as any,
  );
  const maxUnlocked = playerProgress?.maxUnlockedStage ?? 1;
  // Difficulty climbs automatically with player progress — no manual selection needed
  const aiDifficulty: 'easy' | 'medium' | 'hard' =
    maxUnlocked <= 3 ? 'easy' : maxUnlocked <= 8 ? 'medium' : 'hard';

  // Monthly bonus pool: the 3 least-played games globally earn 3×, next 3 earn 2×.
  const monthlyPlays = useQuery(api.games.getMonthlyPlayCounts, {});
  const bonusTiers = monthlyPlays
    ? computeBonusTiers(monthlyPlays.counts, getAllGames().map(g => g.id))
    : {};
  const bonusMultiplier = gameId ? bonusTiers[gameId] ?? 1 : 1;
  const bonusTier = getBonusTier(bonusMultiplier);

  // Retrieve pre-built lazy component (created at registration time, not during render)
  const GameComponent = gameId ? getGameComponent(gameId) : undefined;

  // Redirect if game not found
  useEffect(() => {
    if (!gameMeta) {
      navigate('/games', { replace: true });
    }
  }, [gameMeta, navigate]);

  const createInvite = useMutation(api.multiplayer.createInvite);
  const startSession = useMutation(api.multiplayer.startSession);
  const makeMove = useMutation(api.multiplayer.makeMove);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(joinerSessionId ?? null);
  const [creatingInvite, setCreatingInvite] = useState(false);

  // Auto-create an invite as soon as the host enters multiplayer mode
  useEffect(() => {
    if (!isMultiplayer || !player || inviteCode || sessionId || creatingInvite || joinerSessionId) return;
    if (!gameId) return;
    const minP = gameMeta?.minPlayers ?? 2;
    const maxP = gameMeta?.maxPlayers ?? 2;
    setCreatingInvite(true);
    createInvite({ gameId, fromId: player.playerId as any, minPlayers: minP, maxPlayers: maxP })
      .then((result: any) => {
        if (result && result.inviteCode) {
          setInviteCode(result.inviteCode as string);
          if (result.sessionId) setSessionId(result.sessionId as string);
        }
        setCreatingInvite(false);
      })
      .catch(() => setCreatingInvite(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMultiplayer, player?.playerId, gameId]);

  // Live lobby state — roster of players who've joined so far.
  const liveSession = useQuery(
    api.multiplayer.getSession,
    sessionId ? { sessionId: sessionId as any } : 'skip' as any,
  );

  if (!gameMeta || !gameId || !GameComponent) return null;

  const minPlayers = gameMeta.minPlayers ?? 2;
  const maxPlayers = gameMeta.maxPlayers ?? 2;
  // Lobby only appears for multi-player games so the user can choose how many AI opponents
  const showLobby = !lobbyDone && maxPlayers > 2 && !isMultiplayer;

  // Once the session is live, the normal GameComponent render path kicks in.
  const isLivePlaying = isMultiplayer && !!liveSession && liveSession.status === 'playing';
  const mySeat = liveSession?.players.find(
    p => player && p.id === (player.playerId as any),
  );

  // Joiner waiting-in-lobby screen: has sessionId, no inviteCode of their own,
  // and the session isn't playing yet.
  if (isMultiplayer && sessionId && !inviteCode && liveSession && liveSession.status !== 'playing') {
    const roster = liveSession.players ?? [];
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">{gameMeta.emoji}</div>
        <h2 className="text-2xl font-bold mb-2">{gameMeta.name}</h2>
        <p className="text-text-muted text-sm mb-5">
          Waiting for {liveSession.player1Name} to start the game...
        </p>
        <div className="w-full max-w-xs mb-6">
          <div className="text-xs font-semibold text-text-dim mb-2">
            {roster.length} of {liveSession.maxPlayers} joined
          </div>
          <div className="flex flex-col gap-1.5">
            {roster.map(seat => (
              <div
                key={seat.id}
                className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 text-left"
              >
                <span className="text-lg">{seat.avatar}</span>
                <span className="text-sm font-semibold flex-1">{seat.name}</span>
                {seat.seat === 1 && (
                  <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full font-bold">
                    Host
                  </span>
                )}
                {player && seat.id === (player.playerId as any) && (
                  <span className="text-[10px] bg-success/20 text-success px-2 py-0.5 rounded-full font-bold">
                    You
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={() => navigate('/games')}
          className="text-text-muted text-sm hover:text-text transition-colors"
        >
          <ArrowLeft size={14} className="inline mr-1" /> Back to Games
        </button>
      </div>
    );
  }

  // Multiplayer invite flow — generating link (auto-triggered by useEffect above)
  if (isMultiplayer && !inviteCode && !isLivePlaying) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">{gameMeta.emoji}</div>
        <h2 className="text-2xl font-bold mb-2">{gameMeta.name}</h2>
        <p className="text-text-muted text-sm mb-6">Setting up your game room...</p>
        <Loader2 className="animate-spin text-accent" size={36} />
        <button
          onClick={() => navigate(`/games?tab=board`)}
          className="text-text-muted text-xs hover:text-text transition-colors mt-8"
        >
          <ArrowLeft size={13} className="inline mr-1" /> Back to Games
        </button>
      </div>
    );
  }

  if (isMultiplayer && inviteCode && !isLivePlaying) {
    const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;
    const handleCopy = () => {
      navigator.clipboard.writeText(inviteUrl)
        .then(() => { setHasCopied(true); setTimeout(() => setHasCopied(false), 2500); })
        .catch(() => {});
    };
    const handleShare = () => {
      if (navigator.share) {
        navigator.share({ title: `Play ${gameMeta.name}!`, text: `Join me for ${gameMeta.name} on Noodle Quest!`, url: inviteUrl }).catch(() => {});
      } else {
        handleCopy();
      }
    };

    const roster = liveSession?.players ?? [];
    const joinedCount = roster.length;
    const canStart = joinedCount >= minPlayers;
    const roomFull = joinedCount >= maxPlayers;
    const isHost = player && liveSession && liveSession.player1Id === (player.playerId as any);

    const handleStart = async () => {
      if (!sessionId || !player) return;
      try {
        await startSession({ sessionId: sessionId as any, playerId: player.playerId as any });
      } catch {
        // ignore — next poll will reflect state
      }
    };

    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-3">{gameMeta.emoji}</div>
        <h2 className="text-2xl font-bold mb-1">{gameMeta.name}</h2>
        <p className="text-text-muted text-sm mb-4">Share this link with your friend to start playing!</p>
        <div className="bg-card rounded-xl px-5 py-4 mb-3 w-full max-w-xs">
          <div className="text-3xl font-mono font-bold text-accent tracking-widest mb-2">{inviteCode}</div>
          <div className="text-[11px] text-text-muted break-all leading-relaxed">{inviteUrl}</div>
        </div>
        <div className="flex gap-2 mb-5 w-full max-w-xs">
          <button
            onClick={handleCopy}
            className={`flex-1 flex items-center justify-center gap-1.5 font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 ${
              hasCopied ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-card text-text hover:bg-card-hover'
            }`}
          >
            {hasCopied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy Link</>}
          </button>
          <button onClick={handleShare} className="flex-1 bg-accent text-bg font-bold px-4 py-2.5 rounded-xl hover:opacity-90 active:scale-95">
            Share
          </button>
        </div>

        {maxPlayers > 2 && (
          <div className="w-full max-w-xs mb-5">
            <div className="text-xs font-semibold text-text-dim mb-2">
              {joinedCount} of {maxPlayers} joined{canStart ? '' : ` · need ${minPlayers}`}
            </div>
            <div className="flex flex-col gap-1.5">
              {roster.map(seat => (
                <div
                  key={seat.id}
                  className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 text-left"
                >
                  <span className="text-lg">{seat.avatar}</span>
                  <span className="text-sm font-semibold flex-1">{seat.name}</span>
                  {seat.seat === 1 && (
                    <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full font-bold">
                      Host
                    </span>
                  )}
                </div>
              ))}
              {Array.from({ length: Math.max(0, minPlayers - joinedCount) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center gap-2 bg-card/40 rounded-lg px-3 py-2 text-left border border-dashed border-white/10"
                >
                  <span className="text-lg opacity-40">◌</span>
                  <span className="text-sm text-text-muted italic">Waiting for player...</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {maxPlayers > 2 && isHost ? (
          <button
            onClick={handleStart}
            disabled={!canStart}
            className={`font-bold px-6 py-2.5 rounded-xl mb-4 transition ${
              canStart
                ? 'bg-success text-bg hover:opacity-90 active:scale-95'
                : 'bg-card text-text-muted cursor-not-allowed'
            }`}
          >
            {canStart ? `Start Game (${joinedCount} players)` : `Need ${minPlayers - joinedCount} more`}
          </button>
        ) : (
          <p className="text-text-dim text-xs mb-4 animate-pulse">
            {roomFull ? 'Starting...' : 'Waiting for opponent to join...'}
          </p>
        )}

        <button
          onClick={() => navigate(`/games?tab=board`)}
          className="text-text-muted text-sm hover:text-text transition-colors"
        >
          <ArrowLeft size={14} className="inline mr-1" /> Back to Games
        </button>
      </div>
    );
  }

  // Pre-game lobby: only shown for multi-player games so user can pick number of AI opponents
  if (showLobby) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">{gameMeta.emoji}</div>
        <h2 className="text-2xl font-bold mb-2">{gameMeta.name}</h2>
        <p className="text-text-muted text-sm mb-6 max-w-xs">{gameMeta.description}</p>

        <div className="w-full max-w-xs mb-6">
          <h3 className="text-sm font-semibold text-text-dim mb-3">How many players?</h3>
          <div className="flex gap-2 justify-center">
            {Array.from({ length: maxPlayers - 1 }, (_, i) => i + 2).map(n => (
              <button
                key={n}
                onClick={() => setNumPlayers(n)}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                  numPlayers === n
                    ? 'bg-accent text-bg'
                    : 'bg-card text-text hover:bg-card-hover'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-text-dim mt-2 text-center">
            You + {numPlayers - 1} AI opponent{numPlayers > 2 ? 's' : ''}
          </p>
        </div>

        <button
          onClick={() => setLobbyDone(true)}
          className="bg-accent text-bg font-bold px-10 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95 mb-4"
        >
          Play!
        </button>

        <button
          onClick={() => navigate(`/games${fromTab !== 'brain' ? `?tab=${fromTab}` : ''}`)}
          className="text-text-muted text-sm hover:text-text transition-colors"
        >
          <ArrowLeft size={14} className="inline mr-1" /> Back to Games
        </button>
      </div>
    );
  }

  const handleEnd = async (result: GameResult) => {
    // Guarantee minimum 10 points for participation, then apply under-played bonus.
    const baseScore = Math.max(result.score, 10);
    const finalScore = applyBonus(baseScore, bonusMultiplier);
    const finalResult = { ...result, score: finalScore };

    setEnded(finalResult);
    setSaving(true);

    if (player && saveScore) {
      try {
        await saveScore({
          playerId: player.playerId as any,
          gameId,
          stage: currentStage,
          score: finalScore,
          stars: result.stars,
        });
      } catch (err) {
        // save failed silently
      }
    }
    setSaving(false);

    // Auto-advance on success (2+ stars) after a brief pause
    if (result.stars >= 2 && currentStage < gameMeta.stages) {
      setNextStage(currentStage + 1);
      setTimeout(() => {
        setEnded(null);
        setScore(0);
        setProgress(0);
        setCurrentStage(currentStage + 1);
        setNextStage(null);
        setMessage('');
      }, 2200);
    } else if (result.stars > 0 && currentStage < gameMeta.stages) {
      setNextStage(currentStage + 1);
    }
  };

  const renderStars = (count: number) => (
    <div className="flex justify-center gap-2 my-4">
      {[1, 2, 3].map(i => (
        <Star
          key={i}
          size={36}
          className={i <= count ? 'text-warning' : 'text-card-hover'}
          fill={i <= count ? 'currentColor' : 'none'}
        />
      ))}
    </div>
  );

  const goBackToGames = () => {
    navigate(`/games${fromTab !== 'brain' ? `?tab=${fromTab}` : ''}`);
  };

  if (ended) {
    const prevBestEntry = playerProgress?.stages?.find(s => s.stage === currentStage);
    const prevBest = prevBestEntry?.highScore ?? 0;
    const isNewBest = ended.score > prevBest;
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className={`text-6xl mb-4 ${ended.stars >= 2 ? 'animate-[celebrate_0.4s_ease]' : ''}`}>
          {ended.stars === 3 ? '🏆' : ended.stars === 2 ? '🎉' : '👏'}
        </div>
        <h2 className="text-2xl font-bold mb-2">
          {ended.stars === 3 ? 'Amazing!' : ended.stars === 2 ? 'Great Job!' : 'Good Effort!'}
        </h2>
        {renderStars(ended.stars)}
        <p className="text-accent text-2xl font-bold mb-1">{ended.score}</p>
        {bonusTier && (
          <p className={`text-xs font-semibold mb-1 ${bonusTier.color}`}>
            {bonusTier.label} applied · {bonusTier.multiplier}× multiplier
          </p>
        )}
        <div className="text-xs mb-3 min-h-[18px]">
          {isNewBest && prevBest > 0 ? (
            <span className="text-success font-semibold">
              New best on Stage {currentStage}! +{ended.score - prevBest} over previous
            </span>
          ) : isNewBest ? (
            <span className="text-success font-semibold">New best on Stage {currentStage}!</span>
          ) : (
            <span className="text-text-muted">
              Stage {currentStage} · Best: {prevBest}
            </span>
          )}
        </div>
        {saving && <p className="text-text-muted text-xs mb-2">Saving...</p>}
        <p className="text-text-muted text-sm mb-4 max-w-xs">{ended.summary}</p>
        {ended.stars >= 2 && nextStage && (
          <p className="text-accent text-sm mb-4 animate-pulse">Advancing to Stage {nextStage}...</p>
        )}
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            onClick={() => {
              setEnded(null);
              setScore(0);
              setProgress(0);
              setNextStage(null);
            }}
            className="bg-accent text-bg font-bold px-6 py-2.5 rounded-xl hover:opacity-90 active:scale-95"
          >
            Play Again
          </button>
          {nextStage && (
            <button
              onClick={() => {
                setEnded(null);
                setScore(0);
                setProgress(0);
                setNextStage(null);
                setCurrentStage(nextStage);
              }}
              className="bg-success text-bg font-bold px-6 py-2.5 rounded-xl hover:opacity-90 active:scale-95 flex items-center gap-1"
            >
              Stage {nextStage} <ChevronRight size={16} />
            </button>
          )}
          <button
            onClick={goBackToGames}
            className="bg-card text-text font-bold px-6 py-2.5 rounded-xl hover:bg-card-hover active:scale-95 flex items-center gap-1"
          >
            <ArrowLeft size={16} /> Back to {fromTab === 'breathe' ? 'Breathe' : fromTab === 'board' ? 'Board' : fromTab === 'tracks' ? 'Tracks' : 'Games'}
          </button>
          <button
            onClick={() => navigate('/games')}
            className="bg-card text-text-muted font-bold px-6 py-2.5 rounded-xl hover:bg-card-hover active:scale-95 flex items-center gap-1"
          >
            All Games <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 bg-surface border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={goBackToGames}
            className="flex items-center gap-1.5 text-text-muted hover:text-text bg-card hover:bg-card-hover px-3 py-2 rounded-xl transition-colors active:scale-95"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-semibold">Quit</span>
          </button>
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1.5 text-text-muted hover:text-warning bg-card hover:bg-card-hover px-3 py-2 rounded-xl transition-colors active:scale-95"
            title="Report an issue"
          >
            <Flag size={16} />
            <span className="text-sm font-semibold hidden sm:inline">Report</span>
          </button>
        </div>
        <button
          onClick={() => maxUnlocked > 1 && setShowStagePicker(!showStagePicker)}
          className="text-center px-2 py-1 rounded-lg hover:bg-card/40 transition-colors"
          aria-label={maxUnlocked > 1 ? 'Change stage' : 'Stage selector'}
        >
          <div className="font-semibold text-sm">{gameMeta.emoji} {gameMeta.name}</div>
          <div className="text-text-muted text-xs flex items-center justify-center gap-1">
            <span>Stage {currentStage}/{gameMeta.stages}</span>
            <ChevronDown
              size={12}
              className={`transition-transform ${
                maxUnlocked > 1 ? 'opacity-80' : 'opacity-25'
              } ${showStagePicker ? 'rotate-180' : ''}`}
            />
          </div>
        </button>
        <div className="flex items-center gap-2 min-w-[60px] justify-end pr-2">
          {bonusTier && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-card border border-white/5 ${bonusTier.color}`}
              title={`Score multiplied by ${bonusTier.multiplier}× for trying this game`}
            >
              {bonusTier.label}
            </span>
          )}
          <div className="text-accent font-bold">{score}</div>
        </div>
      </div>

      {showStagePicker && maxUnlocked > 1 && (
        <div className="bg-surface border-b border-white/5 p-2 flex-shrink-0">
          <div className="flex gap-1 flex-wrap justify-center">
            {Array.from({ length: gameMeta.stages }, (_, i) => i + 1).map(s => {
              const unlocked = s <= maxUnlocked;
              const isCurrent = s === currentStage;
              return (
                <button
                  key={s}
                  disabled={!unlocked}
                  onClick={() => {
                    setCurrentStage(s);
                    setScore(0);
                    setProgress(0);
                    setEnded(null);
                    setMessage('');
                    setShowStagePicker(false);
                  }}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-accent text-bg'
                      : unlocked
                        ? 'bg-card text-text hover:bg-card-hover'
                        : 'bg-card/50 text-text-muted/30'
                  }`}
                >
                  {unlocked ? s : <Lock size={10} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="h-2 bg-card flex-shrink-0 border-b border-white/5">
        <div
          className="h-full bg-accent transition-all duration-300 rounded-r"
          style={{
            width: `${Math.min(progress * 100, 100)}%`,
            boxShadow: progress > 0 ? '0 0 8px var(--color-accent, #a78bfa)' : 'none',
          }}
        />
      </div>

      {message && (
        <div className="text-center text-text-dim text-sm py-2 px-4">{message}</div>
      )}

      <div className="flex-1 overflow-hidden">
        <Suspense fallback={
          <div className="h-full flex items-center justify-center">
            <div className="text-4xl animate-pulse">{gameMeta.emoji}</div>
          </div>
        }>
          {GameComponent && createElement(GameComponent, {
            key: `${gameId}-${currentStage}-${numPlayers}-${sessionId ?? 'solo'}`,
            stage: currentStage,
            onScore: (pts: number) => setScore(s => s + pts),
            onProgress: setProgress,
            onMessage: setMessage,
            onEnd: handleEnd,
            multiplayerState: isLivePlaying && liveSession && mySeat
              ? {
                  sessionId: sessionId ?? '',
                  playerNumber: mySeat.seat,
                  currentPlayer: liveSession.currentPlayer,
                  boardState: liveSession.boardState,
                  opponentName: liveSession.players.find(p => p.seat !== mySeat.seat)?.name ?? '',
                  opponentAvatar: liveSession.players.find(p => p.seat !== mySeat.seat)?.avatar ?? '',
                  players: liveSession.players,
                  status: liveSession.status as 'waiting' | 'lobby' | 'playing' | 'finished',
                  winner: liveSession.winner,
                }
              : undefined,
            onMultiplayerMove: (move: unknown) => {
              if (!sessionId || !player) return;
              makeMove({
                sessionId: sessionId as any,
                playerId: player.playerId as any,
                move,
              }).catch(() => {});
            },
            aiDifficulty,
            numPlayers,
          })}
        </Suspense>
      </div>

      {showReportModal && gameMeta && (
        <ReportIssueModal
          gameId={gameMeta.id}
          gameName={gameMeta.name}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
