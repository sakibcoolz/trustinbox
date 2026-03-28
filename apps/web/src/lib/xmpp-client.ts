'use client';

/**
 * xmpp-client.ts
 *
 * Thin wrapper around @xmpp/client that adapts it to TrustInbox's
 * chat domain. The rest of the app never touches the XMPP library
 * directly – it only uses the XMPPClient class exported here.
 *
 * Connection flow:
 *  1. User logs in via REST → receives { xmppToken, xmppJid }
 *  2. App calls XMPPClient.connect(jid, xmppToken)
 *  3. Client connects to ejabberd via WebSocket (XMPP-over-WS, XEP-0156)
 *  4. Incoming stanzas are dispatched as typed events via EventEmitter-style callbacks
 *
 * Room convention:
 *  - Direct (DIRECT) conversations: stanzas sent to  <peer-uuid>@chat.trustinbox.local
 *  - Org    (ORG)    conversations: stanzas sent to  org-<conv-id>@conference.chat.trustinbox.local
 */

import { client as createXmppClient, xml } from '@xmpp/client';

/** UUID v4 generator that works in both secure (HTTPS) and insecure (HTTP dev) contexts. */
export function uuidv4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback using Math.random – acceptable for stanza IDs in dev
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const XMPP_DOMAIN     = process.env.NEXT_PUBLIC_XMPP_DOMAIN     || 'chat.trustinbox.local';
export const XMPP_MUC_DOMAIN = process.env.NEXT_PUBLIC_XMPP_MUC_DOMAIN || 'conference.chat.trustinbox.local';

// Derive the XMPP WebSocket URL at runtime so it always uses the same
// protocol and hostname the browser used to open the app.  This avoids
// mixed-content blocks when the app is served over HTTPS/WSS (e.g. Tailscale).
// The BFF proxies /api/xmpp-ws → ejabberd:5280/ws internally, so the browser
// never needs a direct connection to port 5280.
function getXmppWsUrl(): string {
  // Explicit override wins
  if (process.env.NEXT_PUBLIC_XMPP_WS_URL) return process.env.NEXT_PUBLIC_XMPP_WS_URL;
  // Server-side rendering: use the plain local ejabberd address
  if (typeof window === 'undefined') return 'ws://localhost:5280/ws';
  // Client-side: derive from the page URL so ws/wss matches http/https.
  // The BFF runs on port 4000 on the same host — use it directly to avoid
  // Next.js rewrite limitations with WebSocket upgrades.
  const proto    = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.hostname;
  const bffPort  = process.env.NEXT_PUBLIC_BFF_PORT || '4000';
  return `${proto}//${hostname}:${bffPort}/api/xmpp-ws`;
}

export const XMPP_WS_URL = getXmppWsUrl();

// ─── Type definitions ────────────────────────────────────────────────────────

export interface XMPPMessage {
  id:             string;
  from:           string;   // bare JID of sender
  to:             string;   // bare JID of addressee (or room JID)
  body:           string;
  type:           'chat' | 'groupchat';
  conversationId: string;   // derived: peer UUID or room node name
  timestamp:      Date;
  messageType:    string;   // TEXT | VOICE | IMAGE
}

export interface XMPPPresence {
  from:   string;
  status: 'online' | 'offline' | 'away';
}

export interface XMPPTyping {
  from:           string;
  conversationId: string;
  isTyping:       boolean;
}

export interface XMPPDeliveryReceipt {
  messageId: string;
  from:      string;
}

type MessageHandler         = (msg: XMPPMessage)          => void;
type PresenceHandler        = (p:   XMPPPresence)         => void;
type TypingHandler          = (t:   XMPPTyping)           => void;
type StatusHandler          = (online: boolean)           => void;
type DeliveryReceiptHandler = (r: XMPPDeliveryReceipt)   => void;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip resource from JID:  alice@domain/resource → alice@domain */
function bareJid(jid: string): string {
  return jid.split('/')[0];
}

/** Extract the node part of a JID: alice@domain → alice */
function nodeOf(jid: string): string {
  return jid.split('@')[0];
}

/** Derive a conversation ID from the message JID. */
function conversationIdFrom(jid: string, type: 'chat' | 'groupchat'): string {
  const node = nodeOf(bareJid(jid));
  if (type === 'groupchat') {
    // room JID looks like:  org-<conversationId>@conference.…
    return node.replace(/^org-/, '');
  }
  // DM: the peer's UUID is the conversation node
  return node;
}

// ─── Client ──────────────────────────────────────────────────────────────────

export class XMPPClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private xmpp: any = null;
  private connected = false;

  private messageHandlers:         MessageHandler[]         = [];
  private presenceHandlers:        PresenceHandler[]        = [];
  private typingHandlers:          TypingHandler[]          = [];
  private statusHandlers:          StatusHandler[]          = [];
  private deliveryReceiptHandlers: DeliveryReceiptHandler[] = [];  private _myJid = '';

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async connect(jid: string, password: string): Promise<void> {
    if (this.xmpp) {
      await this.disconnect();
    }

    // jid format: <uuid>@chat.trustinbox.local
    const [username] = jid.split('@');

    // Capture the instance in a local variable so that event handlers
    // always reference the correct client even if this.xmpp is reassigned
    // or nulled by a concurrent disconnect() call.
    const instance = createXmppClient({
      service:  XMPP_WS_URL,
      domain:   XMPP_DOMAIN,
      username,
      password,
    });
    this.xmpp = instance;

    instance.on('stanza', (stanza: any) => this._onStanza(stanza));

    instance.on('online', ((jid: string) => {
      this.connected = true;
      this._myJid = bareJid(String(jid ?? ''));
      this._notifyStatus(true);
      // Send initial available presence
      instance.send(xml('presence'));
    }) as (...args: unknown[]) => void);

    instance.on('offline', () => {
      this.connected = false;
      this._notifyStatus(false);
    });

    instance.on('error', ((err: Error) => {
      console.error('[xmpp] error', err);
    }) as (...args: unknown[]) => void);

    await instance.start();
  }

  async disconnect(): Promise<void> {
    if (!this.xmpp) return;
    try {
      await this.xmpp.send(xml('presence', { type: 'unavailable' }));
      await this.xmpp.stop();
    } catch {
      // ignore disconnect errors
    } finally {
      this.xmpp = null;
      this.connected = false;
    }
  }

  get isConnected(): boolean {
    return this.connected;
  }

  // ── Sending ────────────────────────────────────────────────────────────────

  /** Send a 1:1 direct message.
   * @param toUserID   Peer's user UUID
   * @param body       Message text
   * @param conversationId  DB conversation UUID — carried in <thread> so the
   *                        recipient can correlate the stanza to the right conversation
   * @param msgId      Optional client-generated UUID (reused for DB persistence)
   */
  sendDirectMessage(toUserID: string, body: string, conversationId: string, msgId?: string, messageType?: string): void {
    if (!this.xmpp) return;
    const to = `${toUserID}@${XMPP_DOMAIN}`;
    const id = msgId ?? uuidv4();
    this.xmpp.send(
      xml('message', { type: 'chat', to, id },
        xml('body', {}, body),
        // XEP-0201: thread element carries the DB conversation UUID
        xml('thread', {}, conversationId),
        // XEP-0333 chat markers
        xml('markable', { xmlns: 'urn:xmpp:chat-markers:0' }),
        // XEP-0184: request delivery receipt
        xml('request', { xmlns: 'urn:xmpp:receipts' }),
        // Custom: message type (TEXT, VOICE, IMAGE…)
        ...(messageType && messageType !== 'TEXT'
          ? [xml('x-type', { xmlns: 'trustinbox:msgtype' }, messageType)]
          : []),
      ),
    );
  }

  /** Send a delivery receipt (XEP-0184) back to the sender. */
  private sendDeliveryReceipt(to: string, receivedId: string): void {
    if (!this.xmpp) return;
    this.xmpp.send(xml('message', { to }, xml('received', { xmlns: 'urn:xmpp:receipts', id: receivedId })));
  }

  /** Send a message to a MUC room (org conversation).
   * @param conversationId  DB conversation UUID
   * @param body            Message text
   * @param msgId           Optional client-generated UUID (reused for DB persistence)
   */
  sendGroupMessage(conversationId: string, body: string, msgId?: string): void {
    if (!this.xmpp) return;
    const to = `org-${conversationId}@${XMPP_MUC_DOMAIN}`;
    const id = msgId ?? uuidv4();
    this.xmpp.send(
      xml('message', { type: 'groupchat', to, id },
        xml('body', {}, body),
        // XEP-0201: thread element carries the DB conversation UUID
        xml('thread', {}, conversationId),
      ),
    );
  }

  /** Join a MUC room (needed for ORG conversations). */
  joinRoom(conversationId: string, nick: string): void {
    if (!this.xmpp) return;
    const roomJid = `org-${conversationId}@${XMPP_MUC_DOMAIN}/${nick}`;
    this.xmpp.send(
      xml('presence', { to: roomJid },
        xml('x', { xmlns: 'http://jabber.org/protocol/muc' },
          xml('history', { maxstanzas: '0' }), // MAM will supply history
        ),
      ),
    );
  }

  /** Send XEP-0085 composing / paused notifications. */
  sendTyping(toJid: string, type: 'chat' | 'groupchat', isTyping: boolean): void {
    if (!this.xmpp) return;
    this.xmpp.send(
      xml('message', { type, to: toJid },
        xml(isTyping ? 'composing' : 'paused', { xmlns: 'http://jabber.org/protocol/chatstates' }),
      ),
    );
  }

  // ── Listeners ──────────────────────────────────────────────────────────────

  onMessage(handler: MessageHandler):           void { this.messageHandlers.push(handler); }
  onPresence(handler: PresenceHandler):         void { this.presenceHandlers.push(handler); }
  onTyping(handler: TypingHandler):             void { this.typingHandlers.push(handler); }
  onStatusChange(handler: StatusHandler):       void { this.statusHandlers.push(handler); }
  onDeliveryReceipt(handler: DeliveryReceiptHandler): void { this.deliveryReceiptHandlers.push(handler); }

  offMessage(handler: MessageHandler):          void { this.messageHandlers         = this.messageHandlers.filter(h => h !== handler); }
  offPresence(handler: PresenceHandler):        void { this.presenceHandlers        = this.presenceHandlers.filter(h => h !== handler); }
  offTyping(handler: TypingHandler):            void { this.typingHandlers          = this.typingHandlers.filter(h => h !== handler); }
  offStatusChange(handler: StatusHandler):      void { this.statusHandlers          = this.statusHandlers.filter(h => h !== handler); }
  offDeliveryReceipt(handler: DeliveryReceiptHandler): void { this.deliveryReceiptHandlers = this.deliveryReceiptHandlers.filter(h => h !== handler); }

  // ── Private ────────────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _onStanza(stanza: any): void {
    const name = stanza.name as string;

    if (name === 'message') {
      this._handleMessage(stanza);
    } else if (name === 'presence') {
      this._handlePresence(stanza);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _handleMessage(stanza: any): void {
    const type: 'chat' | 'groupchat' = stanza.attrs.type ?? 'chat';
    const from  = bareJid(stanza.attrs.from ?? '');
    const to    = bareJid(stanza.attrs.to   ?? '');

    // XEP-0184: delivery receipt confirmation
    const received = stanza.getChild('received', 'urn:xmpp:receipts');
    if (received) {
      const rcvId = received.attrs.id as string;
      if (rcvId) this.deliveryReceiptHandlers.forEach(h => h({ messageId: rcvId, from }));
      return;
    }

    // XEP-0085 chat state notifications (typing indicators)
    const composing = stanza.getChild('composing', 'http://jabber.org/protocol/chatstates');
    const paused    = stanza.getChild('paused',    'http://jabber.org/protocol/chatstates');
    if (composing || paused) {
      const convId = conversationIdFrom(from, type);
      this.typingHandlers.forEach(h => h({ from, conversationId: convId, isTyping: !!composing }));
      return;
    }

    const bodyEl = stanza.getChild('body');
    if (!bodyEl) return; // receipts, read markers, etc.

    const body = bodyEl.getText() as string;

    // XEP-0201: prefer <thread> as the conversation ID because it carries the
    // exact DB conversation UUID set by the sender.  Fall back to derivation
    // from the JID for backwards compatibility.
    const threadEl = stanza.getChild('thread');
    const convId = (threadEl?.getText() as string | undefined) || conversationIdFrom(from, type);

    // XEP-0184: auto-send receipt for incoming messages that requested one
    // Only send receipt to other users (not our own echo)
    const requestEl = stanza.getChild('request', 'urn:xmpp:receipts');
    const stanzaId  = stanza.attrs.id as string | undefined;
    if (requestEl && stanzaId && from !== this._myJid) {
      this.sendDeliveryReceipt(from, stanzaId);
    }

    // Custom message type (VOICE, IMAGE, etc.)
    const xTypeEl = stanza.getChild('x-type', 'trustinbox:msgtype');
    const msgType = (xTypeEl?.getText() as string | undefined) ?? 'TEXT';

    const msg: XMPPMessage = {
      id:             stanza.attrs.id ?? uuidv4(),
      from,
      to,
      body,
      type,
      conversationId: convId,
      timestamp:      new Date(),
      messageType:    msgType,
    };

    this.messageHandlers.forEach(h => h(msg));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _handlePresence(stanza: any): void {
    const from   = bareJid(stanza.attrs.from ?? '');
    // Ignore our own echoed presence
    if (from === this._myJid) return;
    const ptype  = stanza.attrs.type ?? 'available';
    // Ignore probe responses that aren't available/unavailable
    if (ptype === 'subscribe' || ptype === 'subscribed' || ptype === 'unsubscribe' || ptype === 'unsubscribed') return;
    const status: XMPPPresence['status'] =
      ptype === 'unavailable' ? 'offline' :
      stanza.getChild('show')?.getText() === 'away' ? 'away' : 'online';

    const presence: XMPPPresence = { from, status };
    this.presenceHandlers.forEach(h => h(presence));
  }

  /** Send a presence probe to get the current presence of a peer. */
  sendPresenceProbe(toUserId: string): void {
    if (!this.xmpp || !this.connected) return;
    const to = `${toUserId}@${XMPP_DOMAIN}`;
    this.xmpp.send(xml('presence', { type: 'probe', to }));
  }

  private _notifyStatus(online: boolean): void {
    this.statusHandlers.forEach(h => h(online));
  }
}

// Singleton shared across the app (created once per browser session).
export const xmppClient = new XMPPClient();
