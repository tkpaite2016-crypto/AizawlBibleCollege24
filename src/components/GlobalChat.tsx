import { useEffect, useRef, useState, useCallback } from 'react';
import { MessageCircle, X, Send, Trash2, Users } from 'lucide-react';
import { supabase, ChatMessage } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const GUEST_NAME_KEY = 'abc_guest_name';
const MESSAGE_LIMIT = 50;
const MAX_LENGTH = 500;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function RoleBadge({ role }: { role: string | null }) {
  if (!role || role === 'standard') return null;
  const styles: Record<string, string> = {
    admin: 'bg-red-100 text-red-700',
    faculty: 'bg-navy-100 text-navy-700',
    finance: 'bg-teal-100 text-teal-700',
    student: 'bg-gold-100 text-gold-700',
  };
  const labels: Record<string, string> = {
    admin: 'Admin',
    faculty: 'Faculty',
    finance: 'Finance',
    student: 'Student',
  };
  const cls = styles[role];
  if (!cls) return null;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 ${cls} text-[10px] font-semibold rounded-full`}>
      {labels[role]}
    </span>
  );
}

function Avatar({ name, avatarUrl, role }: { name: string; avatarUrl: string | null; role: string | null }) {
  const initials = name.charAt(0).toUpperCase();
  const bg = role === 'admin' ? 'bg-red-200 text-red-800' : 'bg-navy-200 text-navy-700';
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className={`text-xs font-bold ${bg}`}>{initials}</span>
      )}
    </div>
  );
}

export default function GlobalChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [showGuestInput, setShowGuestInput] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(GUEST_NAME_KEY);
    if (saved) setGuestName(saved);
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(MESSAGE_LIMIT);

    if (err) {
      setError('Could not load messages. Please try again.');
    } else if (data) {
      setMessages(data as ChatMessage[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    loadMessages();
  }, [open, loadMessages]);

  useEffect(() => {
    if (!open) return;
    const channel = supabase
      .channel('global-chat')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as ChatMessage];
          });
          setOnlineCount((c) => Math.max(c, 1));
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .on('presence', { event: 'join' }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .on('presence', { event: 'leave' }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: profile?.id ?? null,
            display_name: profile?.full_name ?? (guestName || 'Guest'),
            role: profile?.role ?? null,
          });
        }
      });

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [open, profile, guestName]);

  useEffect(() => {
    if (open) {
      setTimeout(scrollToBottom, 100);
    }
  }, [open, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages, scrollToBottom]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const isGuest = !profile;
    if (isGuest) {
      if (!guestName.trim()) {
        setShowGuestInput(true);
        return;
      }
      localStorage.setItem(GUEST_NAME_KEY, guestName.trim());
    }

    setSending(true);
    setError(null);

    const payload = {
      content: text.slice(0, MAX_LENGTH),
      user_id: profile?.id ?? null,
      display_name: profile?.full_name ?? guestName.trim(),
      role: profile?.role ?? null,
      avatar_url: profile?.avatar_url ?? null,
    };

    const { error: err } = await supabase.from('chat_messages').insert(payload);

    if (err) {
      setError('Failed to send message. Please try again.');
    } else {
      setInput('');
    }
    setSending(false);
  }

  async function deleteMessage(id: string) {
    const { error: err } = await supabase.from('chat_messages').delete().eq('id', id);
    if (err) {
      setError('Failed to delete message.');
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-96 h-[100dvh] sm:h-[32rem] sm:max-h-[80vh] flex flex-col bg-white sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-navy-900 text-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <MessageCircle className="w-5 h-5 text-gold-400" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-navy-900" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-tight">Global Chat</h2>
              <div className="flex items-center gap-1 text-[11px] text-slate-300">
                <Users className="w-3 h-3" />
                <span>{onlineCount > 0 ? `${onlineCount} online` : 'Live chat'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 bg-slate-50"
        >
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-navy-200 border-t-navy-800 rounded-full animate-spin" />
            </div>
          ) : error && messages.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-red-500 mb-2">{error}</p>
              <button onClick={loadMessages} className="text-xs text-navy-600 font-medium hover:underline">
                Retry
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-10">
              <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isOwn = profile ? msg.user_id === profile.id : msg.display_name === guestName.trim();
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <Avatar name={msg.display_name} avatarUrl={msg.avatar_url} role={msg.role} />
                    <div className={`flex-1 min-w-0 max-w-[80%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`flex items-center gap-1.5 mb-0.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="text-xs font-semibold text-navy-900 truncate">{msg.display_name}</span>
                        <RoleBadge role={msg.role} />
                        <span className="text-[10px] text-slate-400">{timeAgo(msg.created_at)}</span>
                        {profile?.role === 'admin' && !isOwn && (
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors ml-1"
                            aria-label="Delete message"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm break-words ${
                          isOwn
                            ? 'bg-navy-800 text-white rounded-tr-sm'
                            : 'bg-white text-slate-700 rounded-tl-sm shadow-sm border border-slate-100'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Guest name prompt */}
        {!profile && showGuestInput && (
          <div className="px-3 py-2 bg-amber-50 border-t border-amber-200 flex-shrink-0">
            <div className="flex gap-2">
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="input-field flex-1 text-sm py-1.5"
                placeholder="Enter your name to chat"
                maxLength={30}
                autoFocus
              />
              <button
                onClick={() => {
                  if (guestName.trim()) {
                    localStorage.setItem(GUEST_NAME_KEY, guestName.trim());
                    setShowGuestInput(false);
                  }
                }}
                className="btn-primary px-3 py-1.5 text-sm"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && messages.length > 0 && (
          <div className="px-3 py-1.5 bg-red-50 text-red-600 text-xs text-center flex-shrink-0">
            {error}
          </div>
        )}

        {/* Input */}
        <div className="px-3 py-3 bg-white border-t border-slate-100 flex-shrink-0">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="input-field flex-1 text-sm py-2"
              placeholder={profile ? 'Type a message...' : guestName.trim() ? 'Type a message...' : 'Enter your name to chat...'}
              maxLength={MAX_LENGTH}
              onFocus={() => {
                if (!profile && !guestName.trim()) setShowGuestInput(true);
              }}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="btn-primary px-3 py-2 flex-shrink-0 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          {!profile && (
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
              You're chatting as a guest. Sign in to get your profile name and avatar.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
