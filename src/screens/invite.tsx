import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@/contexts/AuthContext';
import { getGame } from '@/lib/game-registry';
import { Users, Loader2, AlertCircle } from 'lucide-react';

export function InvitePage() {
  const { gameSlug, code } = useParams<{ gameSlug: string; code: string }>();
  const navigate = useNavigate();
  const { player } = useAuth();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const invite = useQuery((api as any).multiplayer?.getInvite, code ? { inviteCode: code } : 'skip' as any);

  const joinSession = useMutation((api as any).multiplayer?.joinSession);

  const game = invite?.gameId ? getGame(invite.gameId) : undefined;
  const isExpired = invite && invite.expiresAt < Date.now();
  const isMyInvite = invite && player && invite.fromId === player.playerId;

  const handleJoin = async () => {
    if (!player || !invite || !joinSession) return;
    setJoining(true);
    setError('');
    try {
      const result = await joinSession({
        inviteCode: code!,
        sessionToken: player.sessionToken,
      });
      if (result.error) {
        setError(result.error);
      } else if (result.sessionId) {
        navigate(`/play/${invite.gameId}`, {
          state: {
            stage: 1,
            multiplayer: true,
            sessionId: result.sessionId,
          },
        });
      }
    } catch (err) {
      setError('Failed to join game. The invite may have expired.');
    }
    setJoining(false);
  };

  if (!player) {
    const returnTo = `/invite/${gameSlug}/${code}`;
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="text-6xl mb-4">🍜</div>
        <h2 className="text-xl font-bold mb-2">Join a Game</h2>
        <p className="text-text-muted text-sm mb-6">Log in to accept this invite</p>
        <button
          onClick={() => navigate(`/auth?returnTo=${encodeURIComponent(returnTo)}`)}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90"
        >
          Log In / Sign Up
        </button>
      </div>
    );
  }

  if (invite === undefined) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="animate-spin text-accent mb-4" size={32} />
        <p className="text-text-muted text-sm">Loading invite...</p>
      </div>
    );
  }

  if (!invite || isExpired || invite.status !== 'pending') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="text-danger mb-4" size={48} />
        <h2 className="text-xl font-bold mb-2">Invite Not Found</h2>
        <p className="text-text-muted text-sm mb-6">
          This invite link has expired, was already used, or doesn't exist.
        </p>
        <button
          onClick={() => navigate('/games')}
          className="bg-accent text-bg font-bold px-6 py-2.5 rounded-xl hover:opacity-90"
        >
          Browse Games
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
      {/* Sender avatar + name bubble */}
      <div className="relative mb-5">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 border-2 border-accent/40 flex items-center justify-center text-4xl shadow-lg">
          {invite.fromAvatar}
        </div>
        <div className="absolute -bottom-2 -right-2 text-3xl">{game?.emoji || '🎮'}</div>
      </div>

      <p className="text-text-muted text-sm mb-1">You've been invited by</p>
      <h2 className="text-2xl font-bold text-text mb-1">{invite.fromName}</h2>
      <p className="text-text-muted text-sm mb-4">to play a game of</p>
      <div className="bg-accent/10 border border-accent/30 rounded-2xl px-6 py-3 mb-6">
        <p className="text-accent font-bold text-xl">{game?.name || invite.gameId}</p>
        {game?.description && (
          <p className="text-text-muted text-xs mt-1">{game.description}</p>
        )}
      </div>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {isMyInvite ? (
        <div className="space-y-3 w-full max-w-xs">
          <p className="text-text-muted text-sm">This is your own invite link — share it with a friend!</p>
          <button
            onClick={() => { navigator.clipboard.writeText(window.location.href); }}
            className="w-full bg-accent text-bg font-bold px-6 py-3 rounded-xl hover:opacity-90 active:scale-95"
          >
            Copy Link
          </button>
          <button
            onClick={() => navigate('/games')}
            className="block w-full text-text-muted text-sm hover:text-accent"
          >
            Back to Games
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full bg-accent text-bg font-bold px-8 py-3.5 rounded-xl text-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-accent/20"
          >
            {joining ? <Loader2 className="animate-spin" size={20} /> : <Users size={20} />}
            {joining ? 'Joining...' : 'Accept & Play'}
          </button>
          <button
            onClick={() => navigate('/games')}
            className="text-text-muted text-sm hover:text-accent transition-colors py-2"
          >
            Maybe later
          </button>
        </div>
      )}
    </div>
  );
}
