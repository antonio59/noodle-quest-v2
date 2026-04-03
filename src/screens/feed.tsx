import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, Smile, Image as ImageIcon, Search, X, Reply } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { FeedPost } from '@/types';

const NOW = Date.now();
const GIPHY_KEY = import.meta.env.VITE_GIPHY_API_KEY || '';

const EMOJIS = [
  '😀','😂','🤣','😍','🥰','😎','🤔','👍','👏','🙌',
  '❤️','🔥','⭐','🎉','🎮','🏆','💪','🧠','🎯','✨',
  '💯','🚀','🌟','🎊','🥳','😋','🤩','😏','🫡','🤝',
  '🎈','🎁','🎀','🌈','🦄','🐱','🐶','🐼','🦊','🐸',
  '🐙','🦋','🌸','🌺','🍕','🍩','🧁','🍦','🎂','🍰',
  '🍭','🍬','🍫','🍪','🧸','💖','💝','💗','💕','💞',
];

interface GiphyResult {
  id: string;
  url: string;
  title: string;
}

interface MentionedPlayer {
  name: string;
  avatar: string;
}

export function Feed() {
  const { player } = useAuth();
  const [tab, setTab] = useState<'chat' | 'activity'>('chat');
  const [message, setMessage] = useState('');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [gifResults, setGifResults] = useState<GiphyResult[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; author: string } | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionList, setMentionList] = useState<MentionedPlayer[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const msgRef = useRef<HTMLInputElement>(null);

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
    if (!player) return;
    const timer = setTimeout(fetchPosts, 0);
    return () => clearTimeout(timer);
  }, [player, fetchPosts]);

  // Fetch all players for @mention autocomplete
  const fetchPlayers = useCallback(async (): Promise<MentionedPlayer[]> => {
    if (!player) return [];
    try {
      const res = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
        body: JSON.stringify({
          path: 'auth:searchPlayers',
          format: 'convex_encoded_json',
          args: [{ query: 'a', currentPlayerId: player.playerId }],
        }),
      });
      const data = await res.json();
      if (data.value) {
        return data.value.map((p: Record<string, unknown>) => ({
          name: p.name as string,
          avatar: p.avatar as string,
        }));
      }
    } catch { /* offline */ }
    return [];
  }, [player]);

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
        setGifResults(data.data.map((g: Record<string, unknown>) => ({
          id: g.id as string,
          url: ((g.images as Record<string, unknown>)?.fixed_height as Record<string, string>)?.url || '',
          title: (g.title as string) || '',
        })));
      }
    } catch { /* offline */ }
    setGifLoading(false);
  }, []);

  // Auto-search trending when GIF panel opens
  useEffect(() => {
    if (showGif && gifResults.length === 0) {
      const timer = setTimeout(() => searchGifs(''), 0);
      return () => clearTimeout(timer);
    }
  }, [showGif, gifResults.length, searchGifs]);

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

  // Handle @mention in message input
  const handleMessageInput = async (val: string) => {
    setMessage(val);
    const atMatch = val.match(/@(\w*)$/);
    if (atMatch) {
      const query = atMatch[1].toLowerCase();
      const players = await fetchPlayers();
      const filtered = query.length >= 1
        ? players.filter(p => p.name.toLowerCase().includes(query)).slice(0, 5)
        : players.slice(0, 8);
      setMentionList(filtered);
      setShowMentions(filtered.length > 0);
      setMentionQuery(query);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (name: string) => {
    const beforeAt = message.substring(0, message.lastIndexOf('@'));
    setMessage(beforeAt + `@${name} `);
    setShowMentions(false);
    if (msgRef.current) msgRef.current.focus();
  };

  const chatPosts = posts.filter(p => p.type !== 'score' && p.type !== 'badge').reverse();
  const activityPosts = [...posts.filter(p => p.type === 'score' || p.type === 'badge')];

  const handleSend = async (type = 'message', content?: string) => {
    const msg = content || message.trim();
    if (!msg || !player || sending) return;
    setSending(true);
    setShowEmoji(false);
    setShowGif(false);
    setShowMentions(false);

    // Check for @mentions and create notifications
    const mentionMatches = msg.matchAll(/@(\w+)/g);
    const mentionedNames = [...mentionMatches].map(m => m[1].toLowerCase());

    try {
      // Fetch all players to resolve mentions
      const allPlayers = await fetchPlayers();
      const mentionedPlayers = allPlayers.filter(p => mentionedNames.includes(p.name.toLowerCase()));

      // Send the post
      const postRes = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/mutation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
        body: JSON.stringify({
          path: 'feed:createPost',
          format: 'convex_encoded_json',
          args: [{ authorId: player.playerId, type, content: msg }],
        }),
      });
      const postData = await postRes.json();
      const newPostId = postData.value?.postId;

      // Create notifications for mentioned players
      for (const mp of mentionedPlayers) {
        // Find the player's Convex ID
        const searchRes = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
          body: JSON.stringify({
            path: 'auth:searchPlayers',
            format: 'convex_encoded_json',
            args: [{ query: mp.name, currentPlayerId: player.playerId }],
          }),
        });
        const searchData = await searchRes.json();
        if (searchData.value?.[0]) {
          await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/mutation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Convex-Client': 'npm-1.33.1' },
            body: JSON.stringify({
              path: 'notifications:createNotification',
              format: 'convex_encoded_json',
              args: [{
                playerId: searchData.value[0].id,
                type: 'mention',
                fromId: player.playerId,
                fromName: player.name,
                fromAvatar: player.avatar,
                content: `${player.name} mentioned you: ${msg.substring(0, 80)}`,
                postId: newPostId,
              }],
            }),
          });
        }
      }

      setMessage('');
      setReplyingTo(null);
      await fetchPosts();
    } catch { /* offline */ }
    setSending(false);
  };

  const handleReply = (postId: string, author: string) => {
    setReplyingTo({ id: postId, author });
    setMessage(`@${author} `);
    if (msgRef.current) msgRef.current.focus();
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
    const isBadge = post.type === 'badge';
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
          ) : isBadge ? (
            <div className="text-sm mt-1 flex items-center gap-1">
              <span className="text-xl">{post.gameEmoji}</span>
              <span className="text-text-dim">{post.content}</span>
            </div>
          ) : post.type === 'gif' ? (
            <img src={post.content} alt="GIF" className="mt-2 rounded-lg max-w-[240px]" loading="lazy" />
          ) : post.type === 'emoji' ? (
            <div className="text-4xl mt-1">{post.content}</div>
          ) : (
            <p className="text-sm mt-1 break-words">{parseMentions(post.content)}</p>
          )}
          {/* Reply button for messages */}
          {!isScore && !isBadge && post.type !== 'gif' && post.type !== 'emoji' && (
            <button
              onClick={() => handleReply(post.id, post.authorName)}
              className="text-text-muted text-xs mt-1 hover:text-accent transition-colors flex items-center gap-1"
            >
              <Reply size={10} /> Reply
            </button>
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

      <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
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
          {/* Reply banner */}
          {replyingTo && (
            <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 border-b border-accent/20">
              <Reply size={12} className="text-accent" />
              <span className="text-xs text-accent flex-1">Replying to {replyingTo.author}</span>
              <button onClick={() => { setReplyingTo(null); setMessage(''); }} className="text-text-muted hover:text-text">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Mention autocomplete */}
          {showMentions && mentionList.length > 0 && (
            <div className="border-b border-white/5 bg-card">
              {mentionList.map(p => (
                <button
                  key={p.name}
                  onClick={() => insertMention(p.name)}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-card-hover transition-colors text-left"
                >
                  <span className="text-lg">{p.avatar}</span>
                  <span className="text-sm text-text">{p.name}</span>
                </button>
              ))}
            </div>
          )}

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
                onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); }}
                className={`p-2 rounded-lg transition-colors ${showEmoji ? 'bg-accent text-bg' : 'text-text-muted hover:text-text'}`}
              >
                <Smile size={18} />
              </button>
              <button
                onClick={() => { setShowGif(!showGif); setShowEmoji(false); }}
                className={`p-2 rounded-lg transition-colors ${showGif ? 'bg-accent text-bg' : 'text-text-muted hover:text-text'}`}
              >
                <ImageIcon size={18} />
              </button>
              <input
                ref={msgRef}
                type="text"
                placeholder="Say something... (@ to tag)"
                value={message}
                onChange={e => handleMessageInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !showMentions) handleSend();
                  if (e.key === 'Escape') { setShowMentions(false); setReplyingTo(null); }
                }}
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
