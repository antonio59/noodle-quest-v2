import { useState } from 'react';
import { X, Send, CheckCircle } from 'lucide-react';

interface ReportIssueProps {
  gameId: string;
  gameName: string;
  stage: number;
  onClose: () => void;
}

export function ReportIssue({ gameId, gameName, stage, onClose }: ReportIssueProps) {
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('Please describe the issue');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      // Save to localStorage for offline tracking
      const reports = JSON.parse(localStorage.getItem('nq_reports') || '[]');
      reports.push({
        gameId,
        gameName,
        stage,
        description: description.trim(),
        timestamp: Date.now(),
        status: 'pending',
      });
      localStorage.setItem('nq_reports', JSON.stringify(reports));

      // Send to Convex for storage and bot notification
      const session = JSON.parse(localStorage.getItem('nq_session') || '{}');
      if (session.playerId) {
        try {
          await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/mutation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
            body: JSON.stringify({
              path: 'reports:submitReport',
              format: 'convex_encoded_json',
              args: [{
                playerId: session.playerId,
                playerName: session.name || 'Unknown',
                gameId,
                gameName,
                stage,
                description: description.trim(),
              }],
            }),
          });
        } catch { /* Convex not available */ }
      }

      setSubmitted(true);
    } catch {
      setError('Failed to submit report. Please try again.');
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-2xl p-6 max-w-sm w-full text-center">
          <CheckCircle size={48} className="mx-auto text-success mb-4" />
          <h3 className="text-xl font-bold mb-2">Report Submitted!</h3>
          <p className="text-text-muted text-sm mb-4">
            Thanks for letting us know about the issue with <strong>{gameName}</strong>. 
            We'll look into it and get it fixed as soon as possible.
          </p>
          <p className="text-text-dim text-xs mb-6">
            Check back for updates — we'll let you know when it's resolved!
          </p>
          <button
            onClick={onClose}
            className="bg-accent text-bg font-bold px-8 py-3 rounded-xl hover:opacity-90 active:scale-95"
          >
            Got it 👍
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">🐛 Report Issue</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text p-1">
            <X size={20} />
          </button>
        </div>

        <div className="bg-surface rounded-xl p-3 mb-4">
          <div className="text-sm font-semibold">{gameName}</div>
          <div className="text-text-muted text-xs">Stage {stage}</div>
        </div>

        <textarea
          value={description}
          onChange={(e) => { setDescription(e.target.value); setError(''); }}
          placeholder="Describe what went wrong... (e.g., 'The game froze after stage 3', 'Words don't match the clues')"
          className="w-full bg-surface rounded-xl p-3 text-sm text-text placeholder-text-muted outline-none focus:ring-1 ring-accent resize-none min-h-[120px] mb-3"
          maxLength={500}
          autoFocus
        />

        {error && <p className="text-danger text-xs mb-3">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-surface text-text font-semibold py-2.5 rounded-xl hover:bg-surface/80 active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !description.trim()}
            className="flex-1 bg-accent text-bg font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 disabled:opacity-40"
          >
            <Send size={14} /> {submitting ? 'Sending...' : 'Send Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
