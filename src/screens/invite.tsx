import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@/contexts/AuthContext';
import { getGame } from '@/lib/game-registry';
import { Users, Loader2, AlertCircle } from 'lucide-react';

export function InvitePage() {
  const { code } = useParams<{ code: string }>();
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
        playerId: player.playerId as any,
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
    const returnTo = `/invite/${code}`;
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
    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
      <div className="text-6xl mb-4">{game?.emoji || '🎮'}</div>
      <h2 className="text-2xl font-bold mb-2">Game Invite</h2>
      <p className="text-text-dim mb-1">
        <span className="font-semibold">{invite.fromAvatar} {invite.fromName}</span> invited you to play
      </p>
      <p className="text-accent font-bold text-lg mb-6">{game?.name || invite.gameId}</p>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {isMyInvite ? (
        <div className="space-y-3">
          <p className="text-text-muted text-sm">This is your invite link. Share it with a friend!</p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
            }}
            className="bg-accent text-bg font-bold px-6 py-2.5 rounded-xl hover:opacity-90"
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
        <div className="space-y-3">
          <button
            onClick={handleJoin}
            disabled={joining}
            className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            {joining ? <Loader2 className="animate-spin" size={20} /> : <Users size={20} />}
            {joining ? 'Joining...' : 'Accept & Play'}
          </button>
          <button
            onClick={() => navigate('/games')}
            className="text-text-muted text-sm hover:text-accent"
          >
            Decline
          </button>
        </div>
      )}
    </div>
  );
}
