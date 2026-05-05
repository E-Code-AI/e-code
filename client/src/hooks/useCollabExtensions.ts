/**
 * useCollabExtensions — hook that owns the Y.Doc + WebsocketProvider +
 * Awareness for a given (projectId, fileId) pair and returns the
 * CodeMirror extensions to plug into CM6Editor's `extraExtensions` prop.
 *
 * Returns `null` while disabled or before the WS provider has connected so
 * the editor falls back to its non-collab `value` flow until the doc is
 * ready. Once attached, the Y.Doc becomes the source of truth and the
 * caller should pass `collabMode='authoritative'` to CM6Editor.
 */

import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Awareness } from 'y-protocols/awareness';
import type { Extension } from '@codemirror/state';
import {
  createCollaborationExtension,
  getColorForUser,
} from '@/lib/cm6/collaboration-adapter';

export interface UseCollabOptions {
  projectId: number | string;
  fileId: number | string;
  user: { id: string | number; username: string } | null;
  enabled?: boolean;
}

export interface UseCollabResult {
  extensions: Extension[] | null;
  isConnected: boolean;
  participants: number;
}

function getWsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/yjs`;
}

export function useCollabExtensions({
  projectId,
  fileId,
  user,
  enabled = true,
}: UseCollabOptions): UseCollabResult {
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState(0);
  const [extensions, setExtensions] = useState<Extension[] | null>(null);

  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);

  useEffect(() => {
    if (!enabled || !user) return;
    const room = `project-${projectId}-file-${fileId}`;

    const doc = new Y.Doc();
    const awareness = new Awareness(doc);
    const provider = new WebsocketProvider(getWsUrl(), room, doc, {
      connect: true,
      awareness,
    });

    docRef.current = doc;
    providerRef.current = provider;
    awarenessRef.current = awareness;

    const onStatus = (event: { status: string }) => {
      setIsConnected(event.status === 'connected');
    };
    const onAwarenessChange = () => {
      setParticipants(awareness.getStates().size);
    };
    provider.on('status', onStatus);
    awareness.on('change', onAwarenessChange);

    const exts = createCollaborationExtension({
      doc,
      provider,
      awareness,
      userId: String(user.id),
      userName: user.username,
      userColor: getColorForUser(String(user.id)),
      textField: 'content',
    });
    setExtensions(exts);

    return () => {
      provider.off('status', onStatus);
      awareness.off('change', onAwarenessChange);
      provider.destroy();
      doc.destroy();
      docRef.current = null;
      providerRef.current = null;
      awarenessRef.current = null;
      setExtensions(null);
      setIsConnected(false);
      setParticipants(0);
    };
  }, [enabled, user?.id, projectId, fileId]);

  return { extensions, isConnected, participants };
}
