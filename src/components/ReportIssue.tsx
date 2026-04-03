import { useState } from 'react';

interface ReportIssueProps {
  gameId: string;
  gameName: string;
  stage: number;
  onClose: () => void;
}

export function ReportIssue({ gameId, gameName, stage, onClose }: ReportIssueProps) {
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!description.trim()) return;
    const reports = JSON.parse(localStorage.getItem('nq_reports') || '[]');
    reports.push({
      gameId,
      stage,
      description: description.trim(),
      timestamp: Date.now(),
    });
    localStorage.setItem('nq_reports', JSON.stringify(reports));
    setSubmitted(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        {submitted ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-text font-semibold">Report submitted!</p>
            <p className="text-text-muted text-sm mt-1">Thank you for helping us improve.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text">🐛 Report Issue</h3>
              <button onClick={onClose} className="text-text-muted hover:text-text p-1">✕</button>
            </div>
            <div className="text-sm text-text-muted mb-3">
              <span className="text-text font-medium">{gameName}</span> — Stage {stage}
            </div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the issue..."
              className="w-full h-24 bg-card border border-white/10 rounded-xl p-3 text-text text-sm resize-none outline-none focus:border-accent/50"
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={onClose}
                className="flex-1 bg-card text-text font-bold py-2.5 rounded-xl hover:bg-card-hover active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!description.trim()}
                className="flex-1 bg-accent text-bg font-bold py-2.5 rounded-xl hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
