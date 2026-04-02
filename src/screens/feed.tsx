import { useState, useEffect, useCallback } from 'react';
import { Send, Smile, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { FeedPost } from '@/types';

const NOW = Date.now();

const EMOJIS = ['😀','😂','🤣','😍','🥰','😎','🤔','👍','👏','🙌','❤️','🔥','⭐','🎉','🎮','🏆','💪','🧠','🎯','✨','💯','🚀','🌟','🎊','🥳','😋','🤩','😏','🫡','🤝'];

const GIPHY_STICKERS = [
  { id: '1', url: 'https://media.giphy.com/media/XRB1uf2F9bGOA/giphy.gif', label: 'Party' },
  { id: '2', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', label: 'Clap' },
  { id: '3', url: 'https://media.giphy.com/media/3o7TKU8RvQuomFfUUU/giphy.gif', label: 'Dance' },
  { id: '4', url: 'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif', label: 'Fire' },
  { id: '5', url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif', label: 'Thumbs' },
  { id: '6', url: 'https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif', label: 'Mind Blown' },
  { id: '7', url: 'https://media.giphy.com/media/jUwpNzg9IcyrK/giphy.gif', label: 'LOL' },
  { id: '8', url: 'https://media.giphy.com/media/3o6fJ1BM7R2EBRDnxK/giphy.gif', label: 'Love' },
  { id: '9', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif', label: 'Cheer' },
];

export function Feed() {
  const { player } = useAuth();
  const [tab, setTab] = useState<'chat' | 'activity'>('chat');
  const [message, setMessage] = useState('');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
        body: JSON.stringify({ path: 'feed:getFeed', format: 'convex_encoded_json', args: [{ limit: 100 }] }),
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
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchPosts, 0);
    return () => clearTimeout(timer);
  }, [fetchPosts]);

  const chatPosts = posts.filter(p => p.type !== 'score').reverse();
  const activityPosts = [...posts.filter(p => p.type === 'score')];

  const handleSend = async (type = 'message', content?: string) => {
    const msg = content || message.trim();
    if (!msg || !player || sending) return;
    setSending(true);
    setShowEmoji(false);
    setShowGif(false);
    try {
      await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/mutation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
        body: JSON.stringify({
          path: 'feed:createPost',
          format: 'convex_encoded_json',
          args: [{ authorId: player.playerId, type, content: msg }],
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

  const parseMentions = (text: string) => {
    return text.split(/(@\w+)/g).map((part, i) =>
      part.startsWith('@') ? <span key={i} className="text-accent font-semibold">{part}</span> : part
    );
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
          ) : post.type === 'gif' ? (
            <img src={post.content} alt="GIF" className="mt-2 rounded-lg max-h-32" loading="lazy" />
          ) : post.type === 'emoji' ? (
            <div className="text-4xl mt-1">{post.content}</div>
          ) : (
            <p className="text-sm mt-1 break-words">{parseMentions(post.content)}</p>
          )}
        </div>
      </div>
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

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {displayedPosts.length === 0 ? (
          <div className="text-center text-text-muted text-sm py-12">
            {tab === 'chat' ? 'No messages yet — say hello! 💬' : 'No activity yet — play some games! 🎮'}
          </div>
        ) : (
          displayedPosts.map(renderPost)
        )}
      </div>

      {tab === 'chat' && (
        <div className="flex-shrink-0 bg-surface border-t border-white/5">
          {/* Emoji picker */}
          {showEmoji && (
            <div className="p-3 border-b border-white/5 flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => handleSend('emoji', e)}
                  className="text-xl hover:scale-125 transition-transform active:scale-90"
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          {/* GIF picker */}
          {showGif && (
            <div className="p-3 border-b border-white/5">
              <div className="grid grid-cols-3 gap-2">
                {GIPHY_STICKERS.map(g => (
                  <button
                    key={g.id}
                    onClick={() => handleSend('gif', g.url)}
                    className="rounded-lg overflow-hidden hover:ring-2 ring-accent transition-all active:scale-95"
                  >
                    <img src={g.url} alt={g.label} className="w-full h-20 object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Compose bar */}
          <div className="p-3">
            <div className="flex gap-2 items-center">
              <button
                onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); }}
                className={`p-2 rounded-lg transition-colors ${showEmoji ? 'bg-accent text-bg' : 'text-text-muted hover:text-text'}`}
              >
                <Smile size={20} />
              </button>
              <button
                onClick={() => { setShowGif(!showGif); setShowEmoji(false); }}
                className={`p-2 rounded-lg transition-colors ${showGif ? 'bg-accent text-bg' : 'text-text-muted hover:text-text'}`}
              >
                <ImageIcon size={20} />
              </button>
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
                onClick={() => handleSend()}
                disabled={sending || !message.trim()}
                className="bg-accent text-bg font-bold px-4 py-2.5 rounded-xl hover:opacity-90 active:scale-95 disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
