import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bug, AlertCircle, Lightbulb, Clock } from 'lucide-react';

const TYPE_ICONS: Record<string, typeof Bug> = {
  bug: Bug,
  confusing: AlertCircle,
  idea: Lightbulb,
};

const TYPE_COLORS: Record<string, string> = {
  bug: 'text-danger',
  confusing: 'text-warning',
  idea: 'text-success',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'text-danger',
  investigating: 'text-warning',
  resolved: 'text-success',
  dismissed: 'text-text-muted',
};

interface ReportRow {
  _id: string;
  errorType: string;
  status: string;
  message: string;
  playerName?: string;
  gameId?: string;
  createdAt: number;
}

export function AdminReports() {
  const navigate = useNavigate();
  const [secret, setSecret] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [reports, setReports] = useState<ReportRow[] | null>(null);
  const [error, setError] = useState('');

  const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch(`${CONVEX_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
        body: JSON.stringify({
          path: 'reports:getRecentReports',
          format: 'convex_encoded_json',
          args: [{ limit: 50, adminSecret: secret }],
        }),
      });
      const data = await res.json();
      if (data.value?.error) {
        setError(data.value.error);
        setAuthenticated(false);
        setReports(null);
      } else if (data.value?.reports) {
        setReports(data.value.reports);
        setError('');
      } else {
        setError('Failed to load reports');
      }
    } catch {
      setError('Failed to load reports');
    }
  }, [CONVEX_URL, secret]);

  useEffect(() => {
    if (authenticated) fetchReports();
  }, [authenticated, fetchReports]);

  const handleAuthenticate = () => {
    if (secret.length < 4) {
      setError('Enter admin secret');
      return;
    }
    setAuthenticated(true);
    setError('');
  };

  const openCount = reports?.filter(r => r.status === 'open').length ?? 0;

  if (!authenticated) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-5 max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate('/games')}
              className="text-text-muted hover:text-text p-2 bg-card rounded-xl"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold">Issue Reports</h1>
          </div>
          <p className="text-text-muted text-sm mb-4">Enter admin secret to view reports.</p>
          <input
            type="password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAuthenticate()}
            placeholder="Admin secret"
            className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-sm mb-3"
          />
          {error && <p className="text-danger text-sm mb-3">{error}</p>}
          <button
            onClick={handleAuthenticate}
            className="w-full bg-accent text-white font-bold py-3 rounded-xl"
          >
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/games')}
            className="text-text-muted hover:text-text p-2 bg-card rounded-xl"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold">Issue Reports</h1>
            <p className="text-text-muted text-sm">
              {openCount > 0 ? `${openCount} open report${openCount !== 1 ? 's' : ''}` : 'No open reports'}
            </p>
          </div>
        </div>

        {error && <p className="text-danger text-sm mb-3">{error}</p>}

        {!reports?.length && (
          <div className="text-center py-12 text-text-dim">
            <p className="text-4xl mb-3">📭</p>
            <p>No reports yet.</p>
          </div>
        )}

        <div className="space-y-3">
          {reports?.map(report => {
            const Icon = TYPE_ICONS[report.errorType] || Bug;
            const typeColor = TYPE_COLORS[report.errorType] || 'text-text-muted';
            const statusColor = STATUS_COLORS[report.status] || 'text-text-muted';
            const date = new Date(report.createdAt).toLocaleString();

            return (
              <div
                key={report._id}
                className={`bg-card rounded-xl p-4 border ${
                  report.status === 'open' ? 'border-danger/30' : 'border-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={typeColor} />
                    <span className={`text-xs font-bold uppercase ${typeColor}`}>
                      {report.errorType}
                    </span>
                    <span className={`text-xs font-bold uppercase ${statusColor}`}>
                      {report.status}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-dim flex items-center gap-1">
                    <Clock size={10} />
                    {date}
                  </span>
                </div>

                <p className="text-sm mt-2 font-medium">{report.message}</p>

                {report.playerName && (
                  <p className="text-xs text-text-dim mt-1">
                    Reported by: {report.playerName}
                  </p>
                )}

                {report.gameId && (
                  <p className="text-xs text-text-dim">
                    Game: {report.gameId}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
