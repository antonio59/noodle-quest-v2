import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@/contexts/AuthContext';
import { X, Gamepad2, Brain, Puzzle } from 'lucide-react';

interface RequestGameModalProps {
  onClose: () => void;
}

const TYPES = [
  { id: 'brain', label: 'Brain training', icon: Brain, color: 'text-violet-400' },
  { id: 'board', label: 'Board / strategy', icon: Puzzle, color: 'text-amber-400' },
  { id: 'other', label: 'Something else', icon: Gamepad2, color: 'text-sky-400' },
];

export function RequestGameModal({ onClose }: RequestGameModalProps) {
  const { player } = useAuth();
  const createGameRequest = useMutation(api.reports.createGameRequest);
  const [gameType, setGameType] = useState('brain');
  const [gameName, setGameName] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!gameName.trim()) return;
    setSending(true);
    try {
      await createGameRequest({
        gameName: gameName.trim(),
        description: description.trim(),
        playerId: player?.playerId as any,
        playerName: player?.name,
      });

      // Mirror the same email mechanism as ReportIssueModal
      try {
        await fetch('/.netlify/functions/send-report-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameName: gameName.trim(),
            playerName: player?.name || 'Anonymous',
            category: `Game Request · ${TYPES.find(t => t.id === gameType)?.label}`,
            description: description.trim()
              ? `${gameName.trim()}: ${description.trim()}`
              : gameName.trim(),
          }),
        });
      } catch {
        // Email function may not be configured — request is saved in DB either way
      }

      setSubmitted(true);
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-white/10 text-center">
          <div className="text-4xl mb-3">🎮</div>
          <h3 className="text-lg font-bold mb-2">Request Sent!</h3>
          <p className="text-text-muted text-sm mb-4">
            Thanks for the idea — we'll look into adding it!
          </p>
          <button
            onClick={onClose}
            className="bg-accent text-bg font-bold px-6 py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Request a Game</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text p-1">
            <X size={20} />
          </button>
        </div>

        <p className="text-text-muted text-xs mb-3">
          Got a game in mind? Tell us what you'd like and we'll try to build it.
        </p>

        <div className="space-y-2 mb-4">
          {TYPES.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => setGameType(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                gameType === id ? 'bg-accent-soft ring-1 ring-accent' : 'bg-surface hover:bg-card-hover'
              }`}
            >
              <Icon size={18} className={color} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>

        <input
          value={gameName}
          onChange={e => setGameName(e.target.value)}
          placeholder="Game name or idea (e.g. Wordle, Minesweeper)"
          className="w-full bg-surface rounded-xl px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-accent mb-2"
          maxLength={80}
        />

        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Any extra details? How it works, why it'd be useful... (optional)"
          className="w-full bg-surface rounded-xl p-3 text-sm min-h-[72px] resize-none focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-text-dim"
          maxLength={500}
        />
        <div className="text-right text-[10px] text-text-dim mt-1">
          {description.length}/500
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 bg-surface hover:bg-card-hover text-text font-semibold py-2.5 rounded-xl transition-colors active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!gameName.trim() || sending}
            className="flex-1 bg-accent text-bg font-semibold py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      </div>
    </div>
  );
}
