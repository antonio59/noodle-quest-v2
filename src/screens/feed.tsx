import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Smile, Image, AtSign, X, Search, MessageCircle, Zap } from 'lucide-react';
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
  } catch { return []; }
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
  } catch { return []; }
}

const QUICK_EMOJIS = [
  '😀','😂','🤣','😍','🥰','😎','🤩','🥳',
  '😤','🔥','💪','👏','🙌','❤️','💜','⭐',
  '🎮','🎲','🏆','🥇','🍜','☕','🎯','🧠',
  '👍','👎','🤝','✌️','🫡','💀','😭','🫠',
];

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

function formatTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

// Deterministic per-author palette. Same author → same name colour + stripe
// across every message, so a long burst stays recognisable even without
// re-showing the avatar/name.
const AUTHOR_PALETTE = [
  { name: 'text-sky-300', stripe: 'bg-sky-400' },
  { name: 'text-emerald-300', stripe: 'bg-emerald-400' },
  { name: 'text-amber-300', stripe: 'bg-amber-400' },
  { name: 'text-rose-300', stripe: 'bg-rose-400' },
  { name: 'text-violet-300', stripe: 'bg-violet-400' },
  { name: 'text-cyan-300', stripe: 'bg-cyan-400' },
  { name: 'text-orange-300', stripe: 'bg-orange-400' },
  { name: 'text-pink-300', stripe: 'bg-pink-400' },
  { name: 'text-lime-300', stripe: 'bg-lime-400' },
  { name: 'text-indigo-300', stripe: 'bg-indigo-400' },
];

function authorColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AUTHOR_PALETTE[h % AUTHOR_PALETTE.length];
}

function renderTextContent(content: string) {
  const parts = content.split(/(@\w+|https?:\/\/\S+)/g);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith('@')) {
      return <span key={i} className="font-bold text-accent">{part}</span>;
    }
    if (/^https?:\/\//i.test(part)) {
      if (/\.(gif|jpg|jpeg|png|webp)(\?.*)?$/i.test(part)) {
        return <img key={i} src={part} alt="" className="mt-1 rounded-xl max-w-[240px] w-full" loading="lazy" />;
      }
      return <a key={i} href={part} target="_blank" rel="noreferrer" className="underline underline-offset-2 break-all opacity-80">{part}</a>;
    }
    return <span key={i}>{part}</span>;
  });
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

  const chatData = useQuery(
    api.feed.getChatMessages,
    player ? { limit: 100, playerId: player.playerId as any } : 'skip' as any,
  );
  const activityData = useQuery(api.feed.getActivity, { limit: 50 });
  const searchResults = useQuery(
    api.auth.searchPlayers as any,
    mentionQuery.length >= 2 && player ? { query: mentionQuery, currentPlayerId: player.playerId } : 'skip' as any
  );
  const createPost = useMutation(api.feed.createPost);

  const loadGifs = useCallback(async (query: string) => {
    setGifLoading(true);
    const results = query.trim() ? await searchGifs(query.trim()) : await getTrendingGifs();
    setGifResults(results);
    setGifLoading(false);
  }, []);

  useEffect(() => {
    if (!showGif || !GIPHY_API_KEY) return;
    if (gifSearchTimer.current) clearTimeout(gifSearchTimer.current);
    gifSearchTimer.current = setTimeout(() => loadGifs(gifQuery), gifQuery ? 400 : 0);
    return () => { if (gifSearchTimer.current) clearTimeout(gifSearchTimer.current); };
  }, [showGif, gifQuery, loadGifs]);

  useEffect(() => {
    if (searchResults) {
      setMentionSuggestions(searchResults.map((p: any) => ({ id: p.id, name: p.name, avatar: p.avatar })));
    }
  }, [searchResults]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatData]);

  const handleSend = async () => {
    if (!message.trim() || !player || !createPost) return;
    try {
      await createPost({ authorId: player.playerId as any, type: 'chat', content: message.trim() });
      setMessage('');
      setShowEmoji(false);
      setShowGif(false);
    } catch { /* send failed */ }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMessage(val);
    const lastAt = val.lastIndexOf('@');
    if (lastAt >= 0 && lastAt === val.length - 1) {
      setShowMention(true); setMentionQuery('');
    } else if (lastAt >= 0) {
      const afterAt = val.slice(lastAt + 1);
      if (!afterAt.includes(' ')) { setShowMention(true); setMentionQuery(afterAt); }
      else setShowMention(false);
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
      await createPost({ authorId: player.playerId as any, type: 'gif_url', content: gifUrl });
      setShowGif(false); setGifQuery('');
    } catch { /* send failed */ }
  };

  const chatPosts = [...(chatData ?? [])].reverse();
  const activityPosts = activityData ?? [];

  const renderChatContent = (post: any) => {
    if (post.type === 'gif_url') {
      return <img src={post.content} alt="GIF" className="mt-1 rounded-xl max-w-[200px] w-full" loading="lazy" />;
    }
    if (post.type === 'gif') {
      const emoji = LEGACY_STICKER_MAP[post.content];
      if (emoji) return <span className="text-4xl leading-none inline-block mt-1">{emoji}</span>;
      return <span className="text-sm italic opacity-60">{post.content}</span>;
    }
    return renderTextContent(post.content);
  };

  const formatActivityContent = (content: string) => {
    const slugMatch = content.match(/on\s+([a-z0-9-]+)!/);
    if (slugMatch) {
      const gameName = getGameName(slugMatch[1]);
      return content.replace(slugMatch[1], gameName.replace(/^\S+\s/, ''));
    }
    return content;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-0 bg-surface flex-shrink-0">
        <h1 className="text-lg font-bold">Community</h1>
        <p className="text-text-muted text-xs mt-0.5 mb-3">Chat with other players and track activity</p>

        {/* Tab bar */}
        <div className="flex gap-1">
          {([
            { id: 'chat', icon: MessageCircle, label: 'Chat' },
            { id: 'activity', icon: Zap, label: 'Activity' },
          ] as const).map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-t-xl text-sm font-semibold transition-all border-b-2 ${
                  active
                    ? 'text-accent border-accent bg-accent/8'
                    : 'text-text-muted border-transparent hover:text-text hover:bg-white/4'
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider under tabs */}
      <div className="h-px bg-white/5 flex-shrink-0" />

      {/* Feed area */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'chat' && (
          chatPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-text-muted pb-8">
              <MessageCircle size={40} strokeWidth={1.5} className="opacity-30" />
              <div className="text-center">
                <p className="text-sm font-semibold">No messages yet</p>
                <p className="text-xs opacity-60 mt-0.5">Say hello to other players!</p>
              </div>
            </div>
          ) : (
            <div className="px-3 py-4 space-y-1">
              {chatPosts.map((post: any, idx: number) => {
                const isMe = post.authorName === player?.name;
                const prev = chatPosts[idx - 1] as any;
                const next = chatPosts[idx + 1] as any;
                const isSameAuthorAsPrev = prev && prev.authorName === post.authorName;
                const isSameAuthorAsNext = next && next.authorName === post.authorName;
                const isFirstInGroup = !isSameAuthorAsPrev;
                const isLastInGroup = !isSameAuthorAsNext;
                const addGap = isFirstInGroup && idx > 0;
                const color = authorColor(post.authorName || '');

                return (
                  <div
                    key={post.id}
                    className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${addGap ? 'mt-3' : ''}`}
                  >
                    {/* Avatar column (others only) — always reserve space, fade on grouped */}
                    {!isMe && (
                      <div className="w-8 flex-shrink-0 flex items-end justify-center">
                        {isFirstInGroup ? (
                          <span className="text-2xl leading-none">{post.authorAvatar || '🎮'}</span>
                        ) : (
                          <span className="text-base leading-none opacity-30">{post.authorAvatar || '🎮'}</span>
                        )}
                      </div>
                    )}

                    {/* Bubble */}
                    <div className={`max-w-[72%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      {isFirstInGroup && (
                        <span className={`text-[11px] font-bold mb-1 ${isMe ? 'mr-1 text-accent' : `ml-2 ${color.name}`}`}>
                          {isMe ? 'You' : post.authorName}
                        </span>
                      )}
                      <div className={`relative ${!isMe ? 'pl-2' : ''}`}>
                        {/* Per-author colour stripe on others' bubbles — persistent identifier */}
                        {!isMe && (
                          <span
                            className={`absolute left-0 top-0 bottom-0 w-1 rounded-full ${color.stripe}`}
                            aria-hidden
                          />
                        )}
                        <div
                          className={`rounded-2xl px-3 py-2 text-sm break-words leading-relaxed ${
                            isMe
                              ? `bg-accent text-bg ${isFirstInGroup ? 'rounded-tr-sm' : ''} ${isLastInGroup ? 'rounded-br-sm' : ''}`
                              : `bg-card text-text ${isFirstInGroup ? 'rounded-tl-sm' : ''} ${isLastInGroup ? 'rounded-bl-sm' : ''}`
                          }`}
                        >
                          {renderChatContent(post)}
                        </div>
                      </div>
                      {/* Time — show only on last in a group */}
                      {isLastInGroup && (
                        <span className="text-[10px] text-text-muted mt-1 mx-1">{formatTime(post.createdAt)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={feedEndRef} />
            </div>
          )
        )}

        {tab === 'activity' && (
          activityPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-text-muted pb-8">
              <Zap size={40} strokeWidth={1.5} className="opacity-30" />
              <div className="text-center">
                <p className="text-sm font-semibold">No activity yet</p>
                <p className="text-xs opacity-60 mt-0.5">Play games to see your achievements here</p>
              </div>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {activityPosts.map((post: any) => {
                const isMe = post.authorName === player?.name;
                const hasStars = /star/i.test(post.content);
                return (
                  <div
                    key={post.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                      isMe
                        ? 'bg-accent/8 border-accent/20'
                        : 'bg-card border-white/5'
                    }`}
                  >
                    <span className="text-2xl flex-shrink-0 mt-0.5">{post.authorAvatar || '🎮'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-sm ${isMe ? 'text-accent' : 'text-text'}`}>
                          {post.authorName}
                        </span>
                        {isMe && (
                          <span className="text-[10px] bg-accent text-bg font-bold px-1.5 py-0.5 rounded-full">YOU</span>
                        )}
                        <span className="text-[10px] text-text-muted">{formatTime(post.createdAt)}</span>
                      </div>
                      <p className={`text-xs mt-0.5 leading-relaxed ${isMe ? 'text-text' : 'text-text-muted'}`}>
                        {formatActivityContent(post.content)}
                      </p>
                    </div>
                    {hasStars && <span className="text-lg flex-shrink-0">⭐</span>}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Compose bar (chat only) */}
      {tab === 'chat' && (
        <div className="flex-shrink-0 bg-surface border-t border-white/5 p-3 space-y-2">
          {/* Mention dropdown */}
          {showMention && mentionSuggestions.length > 0 && (
            <div className="bg-card rounded-xl border border-white/10 overflow-hidden max-h-32 overflow-y-auto">
              {mentionSuggestions.map(s => (
                <button
                  key={s.id}
                  onClick={() => insertMention(s.name)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-card-hover text-left text-sm"
                >
                  <span>{s.avatar}</span>
                  <span className="font-medium">{s.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Emoji picker */}
          {showEmoji && (
            <div className="bg-card rounded-xl border border-white/10 p-3">
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
            <div className="bg-card rounded-xl border border-white/10 overflow-hidden">
              {GIPHY_API_KEY ? (
                <div className="p-2">
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
                  <div className="max-h-52 overflow-y-auto rounded-lg">
                    {gifLoading ? (
                      <div className="text-center text-text-muted text-xs py-8 animate-pulse">Loading...</div>
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
                            <img src={g.preview} alt={g.title} loading="lazy" className="w-full h-auto" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-1.5 pr-1">
                    <span className="text-[9px] text-text-muted/50">Powered by</span>
                    <img src="https://giphy.com/static/img/giphy_logo_square.png" alt="GIPHY" className="h-3 opacity-40" />
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

          {/* Input row */}
          <div className="flex items-center gap-2">
            {/* Tool buttons */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); }}
                className={`p-2 rounded-xl transition-colors ${showEmoji ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text hover:bg-white/5'}`}
                title="Emoji"
              >
                <Smile size={18} />
              </button>
              <button
                onClick={() => { setShowGif(!showGif); setShowEmoji(false); }}
                className={`p-2 rounded-xl transition-colors ${showGif ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text hover:bg-white/5'}`}
                title="GIF"
              >
                <Image size={18} />
              </button>
              <button
                onClick={() => {
                  setMessage(prev => prev + '@');
                  setShowMention(true); setMentionQuery('');
                  inputRef.current?.focus();
                }}
                className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-white/5 transition-colors"
                title="Mention"
              >
                <AtSign size={18} />
              </button>
            </div>

            {/* Text input */}
            <input
              ref={inputRef}
              type="text"
              placeholder="Say something..."
              value={message}
              onChange={handleInputChange}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-card rounded-2xl px-4 py-2.5 text-sm text-text placeholder-text-muted outline-none focus:ring-1 ring-accent/50 transition-all"
              maxLength={500}
            />

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="w-10 h-10 rounded-2xl bg-accent text-bg flex items-center justify-center hover:opacity-90 active:scale-95 disabled:opacity-25 transition-all flex-shrink-0"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
