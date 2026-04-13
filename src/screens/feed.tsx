import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Smile, Image, AtSign, X, Play } from 'lucide-react';
import { getGameName } from '@/lib/game-registry';

// Quick emoji set for the picker
const QUICK_EMOJIS = [
  '😀','😂','🤣','😍','🥰','😎','🤩','🥳',
  '😤','🔥','💪','👏','🙌','❤️','💜','⭐',
  '🎮','🎲','🏆','🥇','🍜','☕','🎯','🧠',
  '👍','👎','🤝','✌️','🫡','💀','😭','🫠',
];

// Simple sticker-style GIFs mapped to real Giphy URLs
const STICKER_CATEGORIES = [
  { label: 'Happy', search: 'happy celebration', emoji: '🎉', gifUrl: 'https://media.giphy.com/media/3o7abB06u9bNzA8lu8/giphy.gif' },
  { label: 'GG', search: 'good game', emoji: '🎮', gifUrl: 'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif' },
  { label: 'Fire', search: 'fire flames', emoji: '🔥', gifUrl: 'https://media.giphy.com/media/l2Sqir5ZxfoS27EvS/giphy.gif' },
  { label: 'Clap', search: 'clapping', emoji: '👏', gifUrl: 'https://media.giphy.com/media/13CoXDiaCcCoyk/giphy.gif' },
  { label: 'LOL', search: 'laughing', emoji: '😂', gifUrl: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif' },
  { label: 'Love', search: 'love hearts', emoji: '❤️', gifUrl: 'https://media.giphy.com/media/3o7TKu8D1d12Eo9wSQ/giphy.gif' },
];

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
  const [showMention, setShowMention] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  // Fetch feed from Convex
  const feedPosts = useQuery(api.feed.getFeed, { limit: 100 });
  // Search players for @mention
  const searchResults = useQuery(api.auth.searchPlayers as any, mentionQuery.length >= 2 && player ? { query: mentionQuery, currentPlayerId: player.playerId } : 'skip' as any);
  // Mutations
  const createPost = useMutation(api.feed.createPost);

  // Update mention suggestions when search results change
  useEffect(() => {
    if (searchResults) {
      setMentionSuggestions(searchResults.map((p: any) => ({ id: p.id, name: p.name, avatar: p.avatar })));
    }
  }, [searchResults]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [feedPosts]);

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

  const insertGif = async (searchTerm: string) => {
    if (!player || !createPost) return;
    try {
      await createPost({
        authorId: player.playerId as any,
        type: 'gif',
        content: searchTerm,
      });
      setShowGif(false);
    } catch { /* send failed */ }
  };

  const chatPosts = feedPosts?.filter((p: any) => p.type === 'chat' || p.type === 'gif') ?? [];
  const activityPosts = feedPosts?.filter((p: any) => p.type === 'score') ?? [];

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  // Render content with @mentions and media URLs highlighted
  const renderContent = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+\.(?:gif|jpg|jpeg|png|webp))|(https?:\/\/[^\s]+)/gi;
    const parts = content.split(urlRegex);
    return parts.map((part, i) => {
      if (!part) return null;
      if (part.startsWith('@')) return <span key={i} className="text-accent font-semibold">{part}</span>;
      if (/\.(gif|jpg|jpeg|png|webp)$/i.test(part)) {
        return <img key={i} src={part} alt="" className="mt-2 rounded-xl max-h-40 object-cover" />;
      }
      if (/^https?:\/\//i.test(part)) {
        return <a key={i} href={part} target="_blank" rel="noreferrer" className="text-accent underline break-all">{part}</a>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const formatActivityContent = (content: string) => {
    // Replace game slugs with formatted names
    let formatted = content;
    const slugMatch = content.match(/on\s+([a-z0-9-]+)!/);
    if (slugMatch) {
      const gameName = getGameName(slugMatch[1]);
      formatted = content.replace(slugMatch[1], gameName.replace(/^\S+\s/, '')); // remove emoji prefix for inline text
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
                    {post.type === 'gif' ? (
                      <div className="mt-1 rounded-xl overflow-hidden max-w-[200px]">
                        <img
                          src={STICKER_CATEGORIES.find(s => s.search === post.content)?.gifUrl || 'https://media.giphy.com/media/3o7abB06u9bNzA8lu8/giphy.gif'}
                          alt="GIF"
                          className="w-full h-auto max-h-40 object-cover rounded-xl"
                        />
                      </div>
                    ) : (
                      renderContent(post.content)
                    )}
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
                    className="text-xl p-1 rounded hover:bg-card-hover transition-colors"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* GIF/Sticker picker */}
          {showGif && (
            <div className="mb-2 bg-card rounded-xl border border-white/10 p-3">
              <div className="text-xs text-text-muted mb-2 font-semibold">Stickers</div>
              <div className="grid grid-cols-6 gap-2">
                {STICKER_CATEGORIES.map(s => (
                  <button
                    key={s.label}
                    onClick={() => insertGif(s.search)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-card-hover transition-colors"
                  >
                    <span className="text-2xl">{s.emoji}</span>
                    <span className="text-[10px] text-text-muted">{s.label}</span>
                  </button>
                ))}
              </div>
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
              maxLength={200}
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
