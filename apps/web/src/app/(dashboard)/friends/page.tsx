'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useNotifications } from '@/lib/notification-context';
import { useChat } from '@/lib/chat-context';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface FriendUser {
  id: string;
  username: string;
  fullName: string;
  virtualPublicId: string;
  online?: boolean;
  mutualFriends?: number;
}

export interface FriendRequest {
  id: string;
  user: FriendUser;
  direction: 'incoming' | 'outgoing';
  status: string;
  message?: string;
  createdAt: string;
}

export interface Friend {
  id: string;
  user: FriendUser;
  createdAt: string;
}

type Tab = 'friends' | 'requests' | 'find';

function UserAvatar({ name, online, size = 'md' }: { name: string; online?: boolean; size?: 'sm' | 'md' }) {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const sz = size === 'sm' ? 'w-9 h-9 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className={`relative ${sz} rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-white font-semibold shrink-0`}>
      {initials}
      {online !== undefined && (
        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bg-secondary ${online ? 'bg-status-online' : 'bg-text-muted'}`} />
      )}
    </div>
  );
}

export default function FriendsPage() {
  const { token } = useAuth();
  const { addToast, onFriendEvent } = useNotifications();
  const { createConversation } = useChat();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('friends');
  const [search, setSearch] = useState('');
  const [findSearch, setFindSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch friends from API
  const fetchFriends = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFriends(data || []);
      }
    } catch {
      // silently fail
    }
  }, [token]);

  // Fetch friend requests from API
  const fetchRequests = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/friends/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data || []);
      }
    } catch {
      // silently fail
    }
  }, [token]);

  // Load data on mount
  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, [fetchFriends, fetchRequests]);

  // Auto-refresh when a friend event arrives via SSE (accept/request from other user)
  useEffect(() => {
    return onFriendEvent(() => {
      fetchFriends();
      fetchRequests();
    });
  }, [onFriendEvent, fetchFriends, fetchRequests]);

  // Debounced API search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (findSearch.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/search?q=${encodeURIComponent(findSearch)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(
            data.map((u: { id: string; username: string; fullName: string; virtualPublicId?: string; online?: boolean }) => ({
              id: u.id,
              username: u.username,
              fullName: u.fullName,
              virtualPublicId: u.virtualPublicId || '',
              online: u.online || false,
              mutualFriends: 0,
            }))
          );
        }
      } catch {
        // Silently fail - user sees "no results"
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [findSearch, token]);

  const incomingRequests = requests.filter((r) => r.direction === 'incoming' && r.status === 'PENDING');
  const outgoingRequests = requests.filter((r) => r.direction === 'outgoing' && r.status === 'PENDING');

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'friends', label: 'Friends', count: friends.length + outgoingRequests.length },
    { key: 'requests', label: 'Requests', count: incomingRequests.length },
    { key: 'find', label: 'Find People' },
  ];

  const filteredFriends = friends.filter(
    (f) => !search || f.user.fullName.toLowerCase().includes(search.toLowerCase()) || f.user.username.toLowerCase().includes(search.toLowerCase())
  );

  const filteredOutgoing = outgoingRequests.filter(
    (r) => !search || r.user.fullName.toLowerCase().includes(search.toLowerCase()) || r.user.username.toLowerCase().includes(search.toLowerCase())
  );

  const selectedFriend = friends.find((f) => f.id === selectedId);

  async function handleSendMessage(userId: string) {
    try {
      const conv = await createConversation(userId);
      if (!conv) throw new Error('Failed to create conversation');
      router.push(`/conversations?id=${conv.id}`);
    } catch {
      addToast({ type: 'error', title: 'Could not start conversation' });
    }
  }

  async function handleAccept(reqId: string) {
    setActionLoading(reqId);
    try {
      const res = await fetch(`${API_BASE}/api/friends/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId: reqId, action: 'accept' }),
      });
      if (res.ok) {
        addToast({ type: 'success', title: 'Request accepted' });
        fetchFriends();
        fetchRequests();
      } else {
        const data = await res.json();
        addToast({ type: 'error', title: 'Failed', body: data.error || 'Could not accept request' });
      }
    } catch {
      addToast({ type: 'error', title: 'Network error' });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(reqId: string) {
    setActionLoading(reqId);
    try {
      const res = await fetch(`${API_BASE}/api/friends/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId: reqId, action: 'reject' }),
      });
      if (res.ok) {
        addToast({ type: 'info', title: 'Request declined' });
        fetchRequests();
      } else {
        const data = await res.json();
        addToast({ type: 'error', title: 'Failed', body: data.error || 'Could not decline request' });
      }
    } catch {
      addToast({ type: 'error', title: 'Network error' });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSendRequest(userId: string) {
    setActionLoading(userId);
    try {
      const res = await fetch(`${API_BASE}/api/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiverId: userId }),
      });
      if (res.ok) {
        setSentRequests((prev) => new Set(prev).add(userId));
        addToast({ type: 'success', title: 'Request sent!' });
        fetchRequests();
      } else {
        const data = await res.json();
        if (data.error === 'already friends') {
          setSentRequests((prev) => new Set(prev).add(userId));
        }
        addToast({ type: 'warning', title: data.error || 'Could not send request' });
      }
    } catch {
      addToast({ type: 'error', title: 'Network error' });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemoveFriend(friendId: string) {
    // friendId here is the friendship row ID, we need the friend's user ID
    const friend = friends.find((f) => f.id === friendId);
    if (!friend) return;
    setActionLoading(friendId);
    try {
      const res = await fetch(`${API_BASE}/api/friends/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ friendId: friend.user.id }),
      });
      if (res.ok) {
        addToast({ type: 'info', title: 'Friend removed' });
        if (selectedId === friendId) setSelectedId(null);
        fetchFriends();
      }
    } catch {
      addToast({ type: 'error', title: 'Network error' });
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <>
      {/* List panel */}
      <div className="w-panel h-full flex flex-col bg-bg-secondary border-r border-border-primary shrink-0">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">People</h2>

          {/* Tabs */}
          <div className="flex gap-1 bg-bg-tertiary rounded-xl p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  tab === t.key ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className={`min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-2xs font-bold ${
                    tab === t.key ? 'bg-accent-blue text-white' : 'bg-bg-hover text-text-muted'
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          {tab !== 'find' && (
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search friends..." className="input-field w-full pl-9 h-9 text-sm" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Friends tab */}
          {tab === 'friends' && (
            <>
              {/* Online section */}
              {filteredFriends.some((f) => f.user.online) && (
                <>
                  <div className="px-4 py-1.5">
                    <span className="text-2xs text-text-muted font-medium uppercase tracking-wider">Online — {filteredFriends.filter((f) => f.user.online).length}</span>
                  </div>
                  {filteredFriends.filter((f) => f.user.online).map((friend) => (
                    <div
                      key={friend.id}
                      onClick={() => setSelectedId(friend.id)}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150 border-l-2 ${
                        selectedId === friend.id ? 'bg-bg-active border-l-accent-blue' : 'border-l-transparent hover:bg-bg-hover'
                      }`}
                    >
                      <UserAvatar name={friend.user.fullName} online={friend.user.online} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{friend.user.fullName}</p>
                        <p className="text-2xs text-accent-blue">{friend.user.username}</p>
                      </div>
                      <span className="text-2xs text-accent-green font-medium">Online</span>
                    </div>
                  ))}
                </>
              )}

              {/* Offline section */}
              {filteredFriends.some((f) => !f.user.online) && (
                <>
                  <div className="px-4 py-1.5">
                    <span className="text-2xs text-text-muted font-medium uppercase tracking-wider">Offline — {filteredFriends.filter((f) => !f.user.online).length}</span>
                  </div>
                  {filteredFriends.filter((f) => !f.user.online).map((friend) => (
                    <div
                      key={friend.id}
                      onClick={() => setSelectedId(friend.id)}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150 border-l-2 ${
                        selectedId === friend.id ? 'bg-bg-active border-l-accent-blue' : 'border-l-transparent hover:bg-bg-hover'
                      }`}
                    >
                      <UserAvatar name={friend.user.fullName} online={friend.user.online} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-secondary truncate">{friend.user.fullName}</p>
                        <p className="text-2xs text-text-muted">{friend.user.username}</p>
                      </div>
                      <span className="text-2xs text-text-muted">{new Date(friend.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </>
              )}

              {/* Added / Pending section */}
              {filteredOutgoing.length > 0 && (
                <>
                  <div className="px-4 py-1.5">
                    <span className="text-2xs text-text-muted font-medium uppercase tracking-wider">Added — {filteredOutgoing.length}</span>
                  </div>
                  {filteredOutgoing.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 px-4 py-3 cursor-default transition-all duration-150 border-l-2 border-l-transparent hover:bg-bg-hover"
                    >
                      <UserAvatar name={req.user.fullName} online={req.user.online} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-secondary truncate">{req.user.fullName}</p>
                        <p className="text-2xs text-text-muted">{req.user.username}</p>
                      </div>
                      <span className="chip-default text-2xs">Pending</span>
                    </div>
                  ))}
                </>
              )}

              {filteredFriends.length === 0 && filteredOutgoing.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <div className="w-12 h-12 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                  </div>
                  <p className="text-sm text-text-muted">No friends found</p>
                  <button onClick={() => setTab('find')} className="text-2xs text-accent-blue hover:underline mt-1">Find people to connect</button>
                </div>
              )}
            </>
          )}

          {/* Requests tab */}
          {tab === 'requests' && (
            <>
              {incomingRequests.length > 0 && (
                <>
                  <div className="px-4 py-1.5">
                    <span className="text-2xs text-text-muted font-medium uppercase tracking-wider">Incoming — {incomingRequests.length}</span>
                  </div>
                  {incomingRequests.map((req) => (
                    <div key={req.id} className="px-4 py-3 border-b border-border-primary last:border-b-0">
                      <div className="flex items-start gap-3">
                        <UserAvatar name={req.user.fullName} online={req.user.online} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary">{req.user.fullName}</p>
                          <p className="text-2xs text-accent-blue">{req.user.username}</p>
                          {req.user.mutualFriends && req.user.mutualFriends > 0 && (
                            <p className="text-2xs text-text-muted mt-0.5">{req.user.mutualFriends} mutual friend{req.user.mutualFriends > 1 ? 's' : ''}</p>
                          )}
                          {req.message && (
                            <p className="text-2xs text-text-secondary mt-1 italic">&ldquo;{req.message}&rdquo;</p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => handleAccept(req.id)} disabled={actionLoading === req.id} className="btn-primary text-2xs py-1 px-3">{actionLoading === req.id ? '...' : 'Accept'}</button>
                            <button onClick={() => handleReject(req.id)} disabled={actionLoading === req.id} className="btn-ghost text-2xs py-1 px-3">{actionLoading === req.id ? '...' : 'Decline'}</button>
                          </div>
                        </div>
                        <span className="text-2xs text-text-muted shrink-0">{new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {outgoingRequests.length > 0 && (
                <>
                  <div className="px-4 py-1.5 mt-2">
                    <span className="text-2xs text-text-muted font-medium uppercase tracking-wider">Sent — {outgoingRequests.length}</span>
                  </div>
                  {outgoingRequests.map((req) => (
                    <div key={req.id} className="flex items-center gap-3 px-4 py-3">
                      <UserAvatar name={req.user.fullName} online={req.user.online} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-secondary truncate">{req.user.fullName}</p>
                        <p className="text-2xs text-text-muted">{req.user.username}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="chip-default text-2xs">Pending</span>
                        <p className="text-2xs text-text-muted mt-0.5">{new Date(req.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <div className="w-12 h-12 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                  </div>
                  <p className="text-sm text-text-muted">No pending requests</p>
                </div>
              )}
            </>
          )}

          {/* Find People tab */}
          {tab === 'find' && (
            <div className="px-4 space-y-4">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                <input
                  type="text"
                  value={findSearch}
                  onChange={(e) => setFindSearch(e.target.value)}
                  placeholder="Search by name or username..."
                  className="input-field w-full pl-9 h-9 text-sm"
                  autoFocus
                />
              </div>

              {findSearch.length < 2 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-2xl bg-accent-blue/10 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                  </div>
                  <p className="text-sm text-text-secondary">Search for people to connect</p>
                  <p className="text-2xs text-text-muted mt-1">Type at least 2 characters to search</p>
                </div>
              )}

              {findSearch.length >= 2 && searchResults.length === 0 && !isSearching && (
                <div className="text-center py-8">
                  <p className="text-sm text-text-muted">No users found for &ldquo;{findSearch}&rdquo;</p>
                </div>
              )}

              {isSearching && (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-text-muted">Searching...</p>
                </div>
              )}

              {searchResults.map((user) => {
                const alreadyFriend = friends.some((f) => f.user.id === user.id);
                const alreadySent = sentRequests.has(user.id);
                return (
                  <div key={user.id} className="card flex items-center gap-3">
                    <UserAvatar name={user.fullName} online={user.online} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{user.fullName}</p>
                      <p className="text-2xs text-accent-blue">{user.username}</p>
                      {user.mutualFriends !== undefined && user.mutualFriends > 0 && (
                        <p className="text-2xs text-text-muted mt-0.5">{user.mutualFriends} mutual friend{user.mutualFriends > 1 ? 's' : ''}</p>
                      )}
                    </div>
                    {alreadyFriend ? (
                      <span className="chip-green text-2xs">Friends</span>
                    ) : alreadySent ? (
                      <span className="chip-default text-2xs">Sent</span>
                    ) : (
                      <button onClick={() => handleSendRequest(user.id)} disabled={actionLoading === user.id} className="btn-primary text-2xs py-1 px-3">
                        {actionLoading === user.id ? '...' : 'Connect'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedFriend ? (
        <div className="flex-1 flex flex-col bg-bg-primary min-w-0 overflow-hidden">
          {/* Header */}
          <div className="h-[60px] px-6 flex items-center justify-between border-b border-border-primary bg-bg-secondary/80 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <UserAvatar name={selectedFriend.user.fullName} online={selectedFriend.user.online} />
              <div>
                <h3 className="text-sm font-semibold text-text-primary">{selectedFriend.user.fullName}</h3>
                <p className="text-2xs text-accent-blue">{selectedFriend.user.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-icon" title="Message">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
              </button>
              <button className="btn-icon" title="Call">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
              </button>
            </div>
          </div>

          {/* Profile content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-md mx-auto space-y-6">
              {/* Large avatar */}
              <div className="flex flex-col items-center text-center">
                <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-white text-3xl font-bold shadow-glow mb-4">
                  {selectedFriend.user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  {selectedFriend.user.online && (
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-status-online border-3 border-bg-primary rounded-full" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-text-primary">{selectedFriend.user.fullName}</h2>
                <p className="text-sm text-accent-blue font-medium">{selectedFriend.user.username}</p>
                <p className="text-2xs text-text-muted mt-1">
                  {selectedFriend.user.online ? 'Online now' : 'Offline'}
                </p>
              </div>

              {/* Info cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="card text-center">
                  <p className="text-2xs text-text-muted uppercase tracking-wider mb-1">Virtual ID</p>
                  <p className="text-sm font-mono font-medium text-text-primary">{selectedFriend.user.virtualPublicId}</p>
                </div>
                <div className="card text-center">
                  <p className="text-2xs text-text-muted uppercase tracking-wider mb-1">Friends Since</p>
                  <p className="text-sm font-medium text-text-primary">{new Date(selectedFriend.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button onClick={() => handleSendMessage(selectedFriend.user.id)} className="btn-primary w-full flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                  Send Message
                </button>
                <button onClick={() => handleRemoveFriend(selectedFriend.id)} className="btn-danger w-full text-sm">
                  Remove Friend
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-bg-primary">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-bg-tertiary mx-auto flex items-center justify-center">
              <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
            </div>
            <p className="text-sm text-text-muted">Select a friend to view their profile</p>
            <p className="text-2xs text-text-muted">Or find new people to connect with</p>
          </div>
        </div>
      )}
    </>
  );
}
