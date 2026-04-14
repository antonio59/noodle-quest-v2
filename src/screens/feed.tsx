import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Smile, Image, AtSign, X, Search } from 'lucide-react';
import { getGameName } from '@/lib/game-registry';

const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY as string | undefined;

interface GifItem {
  id: string;
  title: string;
  preview: string;
  url: string;
  width: number;
  height: number;
}

function mapGiphyItem(g: any): GifItem {
  return {
    id: g.id,
    title: g.title ?? '',
    preview: g.images?.fixed_width_small?.url ?? g.images?.fixed_width?.url ?? '',
    url: g.images?.fixed_width?.url ?? g.images?.downsized_medium?.url ?? '',
    width: Number(g.images?.fixed_width?.width ?? 200),
    height: Number(g.images?.fixed_width?.height ?? 200),
  };
}

async function searchGifs(query: string): Promise<GifItem[]> {
  if (!GIPHY_API_KEY) return [];
  try {
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=pg`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? []).map(mapGiphyItem);
  } catch {
    return [];
  }
}

async function getTrendingGifs(): Promise<GifItem[]> {
  if (!GIPHY_API_KEY) return [];
  try {
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=pg`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? []).map(mapGiphyItem);
  } catch {
    return [];
  }
}

// Quick emoji set for the picker
const QUICK_EMOJIS = [
  '😀','😂','🤣','😍','🥰','😎','🤩','🥳',
  '😤','🔥','💪','👏','🙌','❤️','💜','⭐',
  '🎮','🎲','🏆','🥇','🍜','☕','🎯','🧠',
  '👍','👎','🤝','✌️','🫡','💀','😭','🫠',
];

// Map legacy sticker search terms to a single readable emoji for old messages
const LEGACY_STICKER_MAP: Record<string, string> = {
  happy: '🎉', gg: '🎮', fire: '🔥', clap: '👏',
  lol: '😂', love: '❤️', cool: '😎', sad: '😢',
  wow: '🤯', think: '🤔', noodle: '🍜', brain: '🧠',
};

interface MentionSuggestion {
  id: string;
  name: string;
  avatar: string;
}

export function Feed() {
  const { player } = useAuth();
  const [tab, setTab] = useState<'chat' | 'activity'>('chat');
  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState<GifItem[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const gifSearchTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [showMention, setShowMention] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  // Fetch chat and activity separately so score posts don't crowd out chats
  const chatData = useQuery(api.feed.getChatMessages, { limit: 100 });
  const activityData = useQuery(api.feed.getActivity, { limit: 50 });
  // Search players for @mention
  const searchResults = useQuery(api.auth.searchPlayers as any, mentionQuery.length >= 2 && player ? { query: mentionQuery, currentPlayerId: player.playerId } : 'skip' as any);
  // Mutations
  const createPost = useMutation(api.feed.createPost);

  // Load trending GIFs when picker opens, search on query change
  const loadGifs = useCallback(async (query: string) => {
    setGifLoading(true);
    const results = query.trim()
      ? await searchGifs(query.trim())
      : await getTrendingGifs();
    setGifResults(results);
    setGifLoading(false);
  }, []);

  useEffect(() => {
    if (!showGif || !GIPHY_API_KEY) return;
    if (gifSearchTimer.current) clearTimeout(gifSearchTimer.current);
    gifSearchTimer.current = setTimeout(() => loadGifs(gifQuery), gifQuery ? 400 : 0);
    return () => { if (gifSearchTimer.current) clearTimeout(gifSearchTimer.current); };
  }, [showGif, gifQuery, loadGifs]);

  // Update mention suggestions when search results change
  useEffect(() => {
    if (searchResults) {
      setMentionSuggestions(searchResults.map((p: any) => ({ id: p.id, name: p.name, avatar: p.avatar })));
    }
  }, [searchResults]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatData]);

  const handleSend = async () => {
    if (!message.trim() || !player || !createPost) return;
    try {
      await createPost({
        authorId: player.playerId as any,
        type: 'chat',
        content: message.trim(),
      });
      setMessage('');
      setShowEmoji(false);
      setShowGif(false);
    } catch { /* send failed */ }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMessage(val);

    // Detect @mention trigger
    const lastAt = val.lastIndexOf('@');
    if (lastAt >= 0 && lastAt === val.length - 1) {
      setShowMention(true);
      setMentionQuery('');
    } else if (lastAt >= 0) {
      const afterAt = val.slice(lastAt + 1);
      if (!afterAt.includes(' ')) {
        setShowMention(true);
        setMentionQuery(afterAt);
      } else {
        setShowMention(false);
      }
    } else {
      setShowMention(false);
    }
  };

  const insertMention = (name: string) => {
    const lastAt = message.lastIndexOf('@');
    setMessage(message.slice(0, lastAt) + `@${name} `);
    setShowMention(false);
    inputRef.current?.focus();
  };

  const insertEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const sendGif = async (gifUrl: string) => {
    if (!player || !createPost) return;
    try {
      await createPost({
        authorId: player.playerId as any,
        type: 'gif_url',
        content: gifUrl,
      });
      setShowGif(false);
      setGifQuery('');
    } catch { /* send failed */ }
  };

  // Chat data arrives desc from Convex; reverse for chronological display
  const chatPosts = [...(chatData ?? [])].reverse();
  const activityPosts = activityData ?? [];

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  // Render chat message content
  const renderChatContent = (post: any) => {
    // GIF URL — render as image
    if (post.type === 'gif_url') {
      return (
        <img
          src={post.content}
          alt="GIF"
          className="mt-1 rounded-xl max-w-[240px] w-full"
          loading="lazy"
        />
      );
    }

    // Legacy sticker posts (type "gif" with a search term like "happy")
    // Show as a single large emoji reaction instead of the broken triplet
    if (post.type === 'gif') {
      const emoji = LEGACY_STICKER_MAP[post.content];
      if (emoji) {
        return <span className="text-4xl leading-none inline-block mt-1">{emoji}</span>;
      }
      // Unknown sticker content — show as text
      return <span className="text-sm italic text-text-muted">{post.content}</span>;
    }

    // Regular chat message — render with @mentions and links
    return renderTextContent(post.content);
  };

  // Render text with @mentions and URLs
  const renderTextContent = (content: string) => {
    // Split on @mentions and URLs
    const parts = content.split(/(@\w+|https?:\/\/\S+)/g);
    return parts.map((part, i) => {
      if (!part) return null;
      if (part.startsWith('@')) {
        return <span key={i} className="text-accent font-semibold">{part}</span>;
      }
      if (/^https?:\/\//i.test(part)) {
        if (/\.(gif|jpg|jpeg|png|webp)(\?.*)?$/i.test(part)) {
          return <img key={i} src={part} alt="" className="mt-1 rounded-xl max-w-[240px] w-full" loading="lazy" />;
        }
        return <a key={i} href={part} target="_blank" rel="noreferrer" className="text-accent underline break-all">{part}</a>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const formatActivityContent = (content: string) => {
    let formatted = content;
    const slugMatch = content.match(/on\s+([a-z0-9-]+)!/);
    if (slugMatch) {
      const gameName = getGameName(slugMatch[1]);
      formatted = content.replace(slugMatch[1], gameName.replace(/^\S+\s/, ''));
    }
    return formatted;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 bg-surface border-b border-white/5 flex-shrink-0">
        <h1 className="text-lg font-bold">Activity & Chat</h1>
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
            {t === 'chat' ? 'Chat' : 'Activity'}
          </button>
        ))}
      </div>

      {/* Feed area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tab === 'chat' && (
          chatPosts.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-12">
              No messages yet — say hello!
            </div>
          ) : (
            chatPosts.map((post: any) => (
              <div key={post.id} className="flex gap-3">
                <span className="text-2xl flex-shrink-0 mt-0.5">{post.authorAvatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm">{post.authorName}</span>
                    <span className="text-text-muted text-xs">{formatTime(post.createdAt)}</span>
                  </div>
                  <div className="text-sm text-text break-words">
                    {renderChatContent(post)}
                  </div>
                </div>
              </div>
            ))
          )
        )}

        {tab === 'activity' && (
          activityPosts.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-12">
              No activity yet — play some games!
            </div>
          ) : (
            activityPosts.map((post: any) => (
              <div key={post.id} className="flex gap-3 bg-card rounded-xl p-3">
                <span className="text-2xl flex-shrink-0">{post.authorAvatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm">{post.authorName}</span>
                    <span className="text-text-muted text-xs">{formatTime(post.createdAt)}</span>
                  </div>
                  <div className="text-sm text-text mt-0.5">{formatActivityContent(post.content)}</div>
                </div>
              </div>
            ))
          )
        )}
        <div ref={feedEndRef} />
      </div>

      {/* Compose (chat only) */}
      {tab === 'chat' && (
        <div className="flex-shrink-0 p-3 bg-surface border-t border-white/5">
          {/* Mention dropdown */}
          {showMention && mentionSuggestions.length > 0 && (
            <div className="mb-2 bg-card rounded-xl border border-white/10 overflow-hidden max-h-32 overflow-y-auto">
              {mentionSuggestions.map(s => (
                <button
                  key={s.id}
                  onClick={() => insertMention(s.name)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-card-hover text-left text-sm"
                >
                  <span>{s.avatar}</span>
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Emoji picker */}
          {showEmoji && (
            <div className="mb-2 bg-card rounded-xl border border-white/10 p-3">
              <div className="grid grid-cols-8 gap-1">
                {QUICK_EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => insertEmoji(e)}
                    className="text-xl p-1.5 rounded-lg hover:bg-card-hover active:scale-90 transition-all"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* GIF picker */}
          {showGif && (
            <div className="mb-2 bg-card rounded-xl border border-white/10 overflow-hidden">
              {GIPHY_API_KEY ? (
                <div className="p-2">
                  {/* Search bar */}
                  <div className="flex items-center gap-2 mb-2 bg-surface rounded-lg px-3 py-2">
                    <Search size={14} className="text-text-muted flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Search GIFs..."
                      value={gifQuery}
                      onChange={e => setGifQuery(e.target.value)}
                      className="flex-1 bg-transparent text-sm text-text placeholder-text-muted outline-none"
                      autoFocus
                    />
                    {gifQuery && (
                      <button onClick={() => setGifQuery('')} className="text-text-muted hover:text-text">
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* GIF grid — responsive masonry-style with 3 columns */}
                  <div className="max-h-56 overflow-y-auto rounded-lg">
                    {gifLoading ? (
                      <div className="text-center text-text-muted text-xs py-8 animate-pulse">
                        Loading...
                      </div>
                    ) : gifResults.length === 0 ? (
                      <div className="text-center text-text-muted text-xs py-8">
                        {gifQuery ? 'No GIFs found — try a different search' : 'Loading trending GIFs...'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
                        {gifResults.map(g => (
                          <button
                            key={g.id}
                            onClick={() => sendGif(g.url)}
                            className="rounded-lg overflow-hidden hover:ring-2 ring-accent active:scale-95 transition-all bg-surface"
                          >
                            <img
                              src={g.preview}
                              alt={g.title}
                              loading="lazy"
                              className="w-full h-auto"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Giphy attribution (required by their TOS) */}
                  <div className="flex items-center justify-end gap-1 mt-1.5 pr-1">
                    <span className="text-[9px] text-text-muted/50">Powered by</span>
                    <img
                      src="https://giphy.com/static/img/giphy_logo_square.png"
                      alt="GIPHY"
                      className="h-3 opacity-40"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <Image size={24} className="mx-auto text-text-muted mb-2" />
                  <p className="text-sm text-text-muted">GIF search is not configured</p>
                  <p className="text-xs text-text-muted/60 mt-1">Add VITE_GIPHY_API_KEY to enable</p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 items-center">
            <button
              onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); }}
              className={`p-2 rounded-lg transition-colors ${showEmoji ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text'}`}
            >
              <Smile size={20} />
            </button>
            <button
              onClick={() => { setShowGif(!showGif); setShowEmoji(false); }}
              className={`p-2 rounded-lg transition-colors ${showGif ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text'}`}
            >
              <Image size={20} />
            </button>
            <button
              onClick={() => {
                setMessage(prev => prev + '@');
                setShowMention(true);
                setMentionQuery('');
                inputRef.current?.focus();
              }}
              className="p-2 rounded-lg text-text-muted hover:text-text transition-colors"
            >
              <AtSign size={20} />
            </button>
            <input
              ref={inputRef}
              type="text"
              placeholder="Say something..."
              value={message}
              onChange={handleInputChange}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-card rounded-xl px-4 py-2.5 text-sm text-text placeholder-text-muted outline-none focus:ring-1 ring-accent"
              maxLength={500}
            />
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="bg-accent text-bg font-bold px-4 py-2.5 rounded-xl hover:opacity-90 active:scale-95 disabled:opacity-30"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
