import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { FeedPost } from '@/types';

const NOW = Date.now();

export function Feed() {
  const { player } = useAuth();
  const [tab, setTab] = useState<'chat' | 'activity'>('chat');
  const [message, setMessage] = useState('');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchPosts = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
        body: JSON.stringify({ path: 'feed:getFeed', format: 'convex_encoded_json', args: [{ limit: 50 }] }),
      });
      const data = await res.json();
      if (data.value) {
        setPosts(data.value.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          authorName: p.authorName as string,
          authorAvatar: p.authorAvatar as string,
          type: p.type as string,
          content: p.content as string,
          gameId: p.gameId as string | undefined,
          gameName: p.gameName as string | undefined,
          gameEmoji: p.gameEmoji as string | undefined,
          stage: p.stage as number | undefined,
          stars: p.stars as number | undefined,
          createdAt: p.createdAt as number,
        })));
      }
    } catch { /* offline */ }
  };

  useEffect(() => { fetchPosts(); }, []);

  const chatPosts = posts.filter(p => p.type !== 'score').reverse();
  const activityPosts = [...posts.filter(p => p.type === 'score')];

  const handleSend = async () => {
    if (!message.trim() || !player || sending) return;
    setSending(true);
    try {
      await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/mutation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
        body: JSON.stringify({
          path: 'feed:createPost',
          format: 'convex_encoded_json',
          args: [{ authorId: player.playerId, type: 'message', content: message.trim() }],
        }),
      });
      setMessage('');
      await fetchPosts();
    } catch { /* offline */ }
    setSending(false);
  };

  const formatTime = (ts: number) => {
    const diff = NOW - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  const renderPost = (post: FeedPost) => {
    const isScore = post.type === 'score';
    return (
      <div key={post.id} className="flex gap-3 p-3 bg-card rounded-xl">
        <div className="text-2xl flex-shrink-0">{post.authorAvatar || '🎮'}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{post.authorName}</span>
            <span className="text-text-muted text-xs">{formatTime(post.createdAt)}</span>
          </div>
          {isScore ? (
            <div className="text-sm mt-1 flex items-center gap-1">
              <span>{post.gameEmoji}</span>
              <span className="text-text-dim">{post.content}</span>
            </div>
          ) : (
            <p className="text-sm mt-1 break-words">{parseMentions(post.content)}</p>
          )}
          {post.type === 'gif' && (
            <img src={post.content} alt="GIF" className="mt-2 rounded-lg max-h-32" loading="lazy" />
          )}
        </div>
      </div>
    );
  };

  const parseMentions = (text: string) => {
    return text.split(/(@\w+)/g).map((part, i) =>
      part.startsWith('@') ? <span key={i} className="text-accent font-semibold">{part}</span> : part
    );
  };

  const displayedPosts = tab === 'chat' ? chatPosts : activityPosts;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-surface border-b border-white/5 flex-shrink-0">
        <h1 className="text-lg font-bold">💬 Activity & Chat</h1>
      </div>

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

      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {displayedPosts.length === 0 ? (
          <div className="text-center text-text-muted text-sm py-12">
            {tab === 'chat' ? 'No messages yet — say hello! 💬' : 'No activity yet — play some games! 🎮'}
          </div>
        ) : (
          displayedPosts.map(renderPost)
        )}
      </div>

      {tab === 'chat' && (
        <div className="flex-shrink-0 p-3 bg-surface border-t border-white/5">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Say something... (@ to tag)"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-card rounded-xl px-4 py-2.5 text-sm text-text placeholder-text-muted outline-none focus:ring-1 ring-accent"
              maxLength={200}
            />
            <button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="bg-accent text-bg font-bold px-4 rounded-xl hover:opacity-90 active:scale-95 disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
