/**
 * Ambient type declarations for @xmpp/client and @xmpp/debug.
 * These packages are JavaScript-only; this file provides minimal
 * structural types so TypeScript does not error on imports.
 */

declare module '@xmpp/client' {
  import type { EventEmitter } from 'events';

  export interface XMLElement {
    name: string;
    attrs: Record<string, string>;
    getText(): string;
    getChild(name: string, xmlns?: string): XMLElement | undefined;
    children: XMLElement[];
  }

  export function xml(
    name: string,
    attrs?: Record<string, string>,
    ...children: (XMLElement | string)[]
  ): XMLElement;

  export interface XMPPClientOptions {
    service:   string;
    domain:    string;
    username?: string;
    password?: string;
    resource?: string;
  }

  export interface XMPPClientInstance extends EventEmitter {
    start(): Promise<void>;
    stop(): Promise<void>;
    send(stanza: XMLElement): Promise<void>;
    on(event: 'online' | 'offline' | 'error' | 'stanza', listener: (...args: unknown[]) => void): this;
  }

  export function client(options: XMPPClientOptions): XMPPClientInstance;
}

declare module '@xmpp/debug' {
  import type { XMPPClientInstance } from '@xmpp/client';
  export default function debug(client: XMPPClientInstance, force?: boolean): void;
}
