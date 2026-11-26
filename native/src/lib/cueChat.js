// Cue conversation state, shared between the Cue tab and the CueAnswer screen.
// Same thread semantics as the web app: restart, retry, busy guard, pending questions
// arriving from anywhere in the app via the navigation queue.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useContent } from './content.js';
import { cueReply } from './cueEngine.js';
import { attachCueQueue } from './navigationRef.js';

const CueChatContext = createContext(null);

const toHistory = (thread) => thread
  .filter((message) => !message.pending && !message.error)
  .map((message) => ({ role: message.from === 'me' ? 'user' : 'assistant', content: message.text }));

export function CueChatProvider({ children }) {
  const content = useContent();
  const contentRef = useRef(content);
  useEffect(() => { contentRef.current = content; }, [content]);

  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [answerOpen, setAnswerOpen] = useState(false);
  const requestId = useRef(0);
  const busyRef = useRef(false);
  busyRef.current = busy;

  const ask = useCallback(async (text, { restart = false, retry = false } = {}) => {
    const question = text?.trim();
    if (!question || busyRef.current) return;
    const id = ++requestId.current;
    const base = restart ? [] : threadRef.current.filter((message) => !message.pending && !message.error);
    const history = toHistory(base);
    if (retry && history.at(-1)?.role === 'user') history.pop();
    setThread([
      ...base,
      ...(retry ? [] : [{ from: 'me', text: question }]),
      { from: 'cue', text: 'Thinking through the latest available match data…', pending: true },
    ]);
    setDraft('');
    setBusy(true);
    setAnswerOpen(true);
    try {
      const reply = await cueReply(question, contentRef.current, history);
      if (id === requestId.current) setThread((current) => [...current.filter((message) => !message.pending), { from: 'cue', ...reply }]);
    } catch {
      if (id === requestId.current) setThread((current) => [
        ...current.filter((message) => !message.pending),
        { from: 'cue', text: 'Cue could not complete that answer. Your question is still here; check your connection and try again.', error: true, retryQuestion: question },
      ]);
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }, []);

  // Latest thread for restarts/retry without re-creating `ask` per message.
  const threadRef = useRef(thread);
  useEffect(() => { threadRef.current = thread; }, [thread]);

  const newQuestion = useCallback(() => {
    requestId.current += 1;
    setBusy(false);
    setThread([]);
    setDraft('');
    setAnswerOpen(false);
  }, []);

  // Pending questions arriving from elsewhere in the app (search escalation, record actions).
  useEffect(() => attachCueQueue((question) => ask(question, { restart: true })), [ask]);

  const value = useMemo(() => ({
    thread,
    draft,
    setDraft,
    busy,
    answerOpen,
    setAnswerOpen,
    ask,
    newQuestion,
  }), [thread, draft, busy, answerOpen, ask, newQuestion]);

  return <CueChatContext.Provider value={value}>{children}</CueChatContext.Provider>;
}

export function useCueChat() {
  return useContext(CueChatContext);
}
