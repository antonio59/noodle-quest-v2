import { useState } from 'react';
import { Send } from 'lucide-react';

export function Feed() {
  const [tab, setTab] = useState<'chat' | 'activity'>('chat');
  const [message, setMessage] = useState('');

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 bg-surface border-b border-white/5 flex-shrink-0">
        <h1 className="text-lg font-bold">💬 Activity & Chat</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 flex-shrink-0">
        {(['chat', 'activity'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold text-center transition-colors border-b-2 ${
              tab === t ? 'text-accent border-accent' : 'text-text-muted border-transparent hover:text-text'
            }`}
          >
            {t === 'chat' ? '💬 Chat' : '🏆 Activity'}
          </button>
        ))}
      </div>

      {/* Feed area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-center text-text-muted text-sm py-12">
          {tab === 'chat' ? 'No messages yet — say hello! 💬' : 'No activity yet — play some games! 🎮'}
        </div>
      </div>

      {/* Compose (chat only) */}
      {tab === 'chat' && (
        <div className="flex-shrink-0 p-3 bg-surface border-t border-white/5">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Say something... (@ to tag)"
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="flex-1 bg-card rounded-xl px-4 py-2.5 text-sm text-text placeholder-text-muted outline-none focus:ring-1 ring-accent"
              maxLength={200}
            />
            <button className="bg-accent text-bg font-bold px-4 rounded-xl hover:opacity-90 active:scale-95">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
