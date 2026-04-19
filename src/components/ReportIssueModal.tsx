import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@/contexts/AuthContext';
import { X, Bug, AlertCircle, Lightbulb } from 'lucide-react';

interface ReportIssueModalProps {
  gameId: string;
  gameName: string;
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'bug', label: 'Something is broken', icon: Bug, color: 'text-danger' },
  { id: 'confusing', label: 'Confusing or hard to play', icon: AlertCircle, color: 'text-warning' },
  { id: 'idea', label: 'I have an idea', icon: Lightbulb, color: 'text-success' },
];

export function ReportIssueModal({ gameId, gameName, onClose }: ReportIssueModalProps) {
  const { player } = useAuth();
  const createReport = useMutation(api.reports.createReport);
  const [category, setCategory] = useState('bug');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setSending(true);

    try {
      await createReport({
        errorId: `user-report-${Date.now()}`,
        gameId,
        playerId: player?.playerId as any,
        playerName: player?.name,
        errorType: category,
        severity: category === 'bug' ? 'high' : 'medium',
        message: `[${gameName}] ${CATEGORIES.find(c => c.id === category)?.label}: ${description.trim()}`,
        context: { category, description: description.trim(), gameName },
      });

      // Also try to send email via Netlify function
      try {
        await fetch('/.netlify/functions/send-report-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameName,
            playerName: player?.name || 'Anonymous',
            category: CATEGORIES.find(c => c.id === category)?.label,
            description: description.trim(),
          }),
        });
      } catch {
        // Email function may not be configured, that's OK
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
          <div className="text-4xl mb-3">📬</div>
          <h3 className="text-lg font-bold mb-2">Report Sent!</h3>
          <p className="text-text-muted text-sm mb-4">
            Thank you for helping make the games better!
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
          <h3 className="text-lg font-bold">Report an Issue</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text p-1">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {CATEGORIES.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => setCategory(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                category === id ? 'bg-accent-soft ring-1 ring-accent' : 'bg-surface hover:bg-card-hover'
              }`}
            >
              <Icon size={18} className={color} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>

        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What's the problem? Tell us what happened..."
          className="w-full bg-surface rounded-xl p-3 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-text-dim"
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
            disabled={!description.trim() || sending}
            className="flex-1 bg-accent text-bg font-semibold py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
