import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, Smile, Image as ImageIcon, Sticker, Search, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { FeedPost } from '@/types';

const NOW = Date.now();
const GIPHY_KEY = import.meta.env.VITE_GIPHY_API_KEY || '';

const EMOJIS = ['😀','😂','🤣','😍','🥰','😎','🤔','👍','👏','🙌','❤️','🔥','⭐','🎉','🎮','🏆','💪','🧠','🎯','✨','💯','🚀','🌟','🎊','🥳','😋','🤩','😏','🫡','🤝'];

const STICKER_EMOJIS = ['🎈','🎁','🎀','🎊','🎉','🎵','🎶','🌈','🦄','🐱','🐶','🐼','🦊','🐸','🐙','🦋','🌸','🌺','🍕','🍩','🧁','🍦','🎂','🍰','🍭','🍬','🍫','🍪','🧸','⭐','💫','✨','🌟','💖','💝','💗','💕','💞','💓','💘'];

interface GiphyResult {
  id: string;
  url: string;
  title: string;
}

export function Feed() {
  const { player } = useAuth();
  const [tab, setTab] = useState<'chat' | 'activity'>('chat');
  const [message, setMessage] = useState('');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [showSticker, setShowSticker] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [gifResults, setGifResults] = useState<GiphyResult[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

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

  // Search GIPHY with kid-safe rating
  const searchGifs = useCallback(async (query: string) => {
    if (!GIPHY_KEY) return;
    setGifLoading(true);
    try {
      const url = query
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=12&rating=g&lang=en`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=12&rating=g&lang=en`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.data) {
        setGifResults(data.data.map((g: Record<string, Record<string, string>>) => ({
          id: g.id,
          url: g.images.fixed_height.url,
          title: g.title || '',
        })));
      }
    } catch { /* offline */ }
    setGifLoading(false);
  }, []);

  // Auto-search trending when GIF panel opens
  useEffect(() => {
    if (showGif && gifResults.length === 0) {
      searchGifs('');
    }
  }, [showGif]);

  // Focus search input when GIF panel opens
  useEffect(() => {
    if (showGif && searchRef.current) {
      searchRef.current.focus();
    }
  }, [showGif]);

  const handleGifSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchGifs(gifSearch);
  };

  const chatPosts = posts.filter(p => p.type !== 'score').reverse();
  const activityPosts = [...posts.filter(p => p.type === 'score')];

  const handleSend = async (type = 'message', content?: string) => {
    const msg = content || message.trim();
    if (!msg || !player || sending) return;
    setSending(true);
    setShowEmoji(false);
    setShowGif(false);
    setShowSticker(false);
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
            <img src={post.content} alt="GIF" className="mt-2 rounded-lg max-w-[240px]" loading="lazy" />
          ) : post.type === 'sticker' ? (
            <div className="text-5xl mt-1">{post.content}</div>
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
            <div className="p-3 border-b border-white/5 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
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

          {/* Sticker picker */}
          {showSticker && (
            <div className="p-3 border-b border-white/5 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
              {STICKER_EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => handleSend('sticker', e)}
                  className="text-2xl hover:scale-125 transition-transform active:scale-90"
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          {/* GIF picker with search */}
          {showGif && (
            <div className="p-3 border-b border-white/5">
              <form onSubmit={handleGifSearch} className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search GIFs... (kid-safe)"
                    value={gifSearch}
                    onChange={e => setGifSearch(e.target.value)}
                    className="w-full bg-card rounded-xl pl-9 pr-4 py-2 text-sm text-text placeholder-text-muted outline-none focus:ring-1 ring-accent"
                  />
                </div>
                <button type="submit" className="bg-accent text-bg px-4 rounded-xl text-sm font-semibold active:scale-95">
                  Search
                </button>
                {gifSearch && (
                  <button type="button" onClick={() => { setGifSearch(''); searchGifs(''); }} className="text-text-muted p-2">
                    <X size={16} />
                  </button>
                )}
              </form>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {gifLoading ? (
                  <div className="col-span-3 text-center text-text-muted text-sm py-4">Loading...</div>
                ) : gifResults.length === 0 ? (
                  <div className="col-span-3 text-center text-text-muted text-sm py-4">No GIFs found</div>
                ) : (
                  gifResults.map(g => (
                    <button
                      key={g.id}
                      onClick={() => handleSend('gif', g.url)}
                      className="rounded-lg overflow-hidden hover:ring-2 ring-accent transition-all active:scale-95"
                    >
                      <img src={g.url} alt={g.title} className="w-full h-24 object-cover" loading="lazy" />
                    </button>
                  ))
                )}
              </div>
              <div className="text-center text-[10px] text-text-muted mt-2">🔒 Kid-safe: G-rated GIFs only</div>
            </div>
          )}

          {/* Compose bar */}
          <div className="p-3">
            <div className="flex gap-1.5 items-center">
              <button
                onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); setShowSticker(false); }}
                className={`p-2 rounded-lg transition-colors ${showEmoji ? 'bg-accent text-bg' : 'text-text-muted hover:text-text'}`}
              >
                <Smile size={18} />
              </button>
              <button
                onClick={() => { setShowSticker(!showSticker); setShowGif(false); setShowEmoji(false); }}
                className={`p-2 rounded-lg transition-colors ${showSticker ? 'bg-accent text-bg' : 'text-text-muted hover:text-text'}`}
              >
                <Sticker size={18} />
              </button>
              <button
                onClick={() => { setShowGif(!showGif); setShowEmoji(false); setShowSticker(false); }}
                className={`p-2 rounded-lg transition-colors ${showGif ? 'bg-accent text-bg' : 'text-text-muted hover:text-text'}`}
              >
                <ImageIcon size={18} />
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
