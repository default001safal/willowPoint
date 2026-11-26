import { useEffect, useId, useRef, useState } from 'react';
import * as I from '../components/Icons.jsx';
import { PushLayer } from '../components/InteractionLayer.jsx';
import SourceSheet from '../components/SourceSheet.jsx';
import { useContent } from '../lib/content.jsx';
import { cueReply } from '../lib/cueEngine.js';
import { buildCuePrompts } from '../lib/selectors.js';

const toHistory = (thread) => thread
  .filter((message) => !message.pending && !message.error)
  .map((message) => ({ role: message.from === 'me' ? 'user' : 'assistant', content: message.text }));

function CueMark({ size = 86 }) {
  return (
    <svg className="cue-symbol" width={size} height={size} viewBox="0 0 210 210" role="img" aria-label="Cue">
      <circle cx="105" cy="124" r="67.75" fill="none" stroke="currentColor" strokeWidth="9" />
      <circle cx="89" cy="112" r="10" fill="currentColor" /><circle cx="121" cy="112" r="10" fill="currentColor" />
      <rect x="99" y="39" width="12" height="24" rx="6" fill="currentColor" />
      <path d="M76 151c16 13 42 13 58 0" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

function CueComposer({ draft, setDraft, busy, onAsk, inLayer = false }) {
  const inputId = useId();
  return (
    <div className={`composer${inLayer ? ' in-layer' : ''}`}>
      <form className="cue-box" onSubmit={(event) => { event.preventDefault(); onAsk(draft); }}>
        <label className="sr-only" htmlFor={inputId}>Ask Cue</label>
        <textarea
          id={inputId}
          rows={2}
          placeholder="Ask Cue anything…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onAsk(draft);
            }
          }}
        />
        <div className="cue-box-bar">
          <span className="composer-hint">{busy ? 'Checking current records…' : 'Answers use current app records and sources'}</span>
          <button type="submit" className="cue-send" aria-label="Send question" disabled={!draft.trim() || busy}><I.ArrowUp size={18} sw={2.2} /></button>
        </div>
      </form>
    </div>
  );
}

export function CueAnswer({ thread, onRetry, onSource, onNewQuestion }) {
  const endRef = useRef(null);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    endRef.current?.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'end' });
  }, [thread]);

  return (
    <section className="cue-conversation" aria-live="polite" aria-label="Cue conversation">
      {thread.map((message, index) => message.from === 'me' ? (
        <div key={`${index}-${message.text}`} className="cue-question"><span>You asked</span><h2>{message.text}</h2></div>
      ) : (
        <article key={index} className={`cue-response${message.error ? ' has-error' : ''}`}>
          <span className="cue-response-label"><CueMark size={22} />Cue</span>
          <p role={message.pending ? 'status' : undefined}>{message.text}</p>
          {message.error && <button type="button" className="cue-retry" onClick={() => onRetry(message.retryQuestion)}><I.Swap size={15} />Try again</button>}
          {message.sources?.length > 0 && (
            <div className="cue-source-list" aria-label="Answer sources"><span>Sources</span><div>{message.sources.map((source, sourceIndex) => (
              <button key={`${source.label}-${sourceIndex}`} type="button" onClick={() => onSource(source)}>{source.label}<I.Chevron size={13} /></button>
            ))}</div></div>
          )}
        </article>
      ))}
      <button type="button" className="thread-reset" onClick={onNewQuestion}><I.Plus size={14} />New question</button>
      <div ref={endRef} />
    </section>
  );
}

export default function CueScreen({ pending, clearPending, answerOpen, sourceLayer, onOpenAnswer, onCloseAnswer, onOpenSource, onCloseSource }) {
  const content = useContent();
  const prompts = buildCuePrompts(content);
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const askRef = useRef(null);
  const requestId = useRef(0);

  const ask = async (text, { restart = false, retry = false } = {}) => {
    const question = text?.trim();
    if (!question || busy) return;
    const id = ++requestId.current;
    const base = restart ? [] : thread.filter((message) => !message.pending && !message.error);
    const history = toHistory(base);
    if (retry && history.at(-1)?.role === 'user') history.pop();
    setThread([...base, ...(retry ? [] : [{ from: 'me', text: question }]), { from: 'cue', text: 'Thinking through the latest available match data…', pending: true }]);
    setDraft('');
    setBusy(true);
    onOpenAnswer();
    try {
      const reply = await cueReply(question, content, history);
      if (id === requestId.current) setThread((current) => [...current.filter((message) => !message.pending), { from: 'cue', ...reply }]);
    } catch {
      if (id === requestId.current) setThread((current) => [
        ...current.filter((message) => !message.pending),
        { from: 'cue', text: 'Cue could not complete that answer. Your question is still here; check your connection and try again.', error: true, retryQuestion: question },
      ]);
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  };
  askRef.current = ask;

  useEffect(() => {
    if (pending && !busy) {
      const question = pending;
      clearPending();
      askRef.current(question, { restart: true });
    }
  }, [pending, busy, clearPending]);

  const newQuestion = () => {
    requestId.current += 1;
    setBusy(false);
    setThread([]);
    setDraft('');
    onCloseAnswer();
  };

  const composer = <CueComposer draft={draft} setDraft={setDraft} busy={busy} onAsk={(question) => ask(question, { restart: !answerOpen })} inLayer={answerOpen} />;

  return (
    <>
      <main className="screen cue-screen" inert={answerOpen ? '' : undefined} aria-hidden={answerOpen || undefined}>
        <section className="cue-hero"><CueMark /><h1 className="cue-h">Ask <em>Cue</em></h1></section>
        <p className="cue-sub">Fixtures, results, stories — answered with sources.</p>
        <div className="cue-sugg" aria-label="Suggested questions">{prompts.map((prompt) => (
          <button key={prompt.id} type="button" className="chip" title={prompt.hint} onClick={() => ask(prompt.title, { restart: true })}><I.Spark size={12} />{prompt.title}</button>
        ))}</div>
        <div className="cue-principles"><span><I.Check size={13} />Current records</span><span><I.Check size={13} />Visible sources</span><span><I.Check size={13} />Honest when unavailable</span></div>
        {!answerOpen && composer}
      </main>

      {answerOpen && <div inert={sourceLayer ? '' : undefined} aria-hidden={sourceLayer ? true : undefined}><PushLayer title="Ask Cue" eyebrow="Grounded answer" onClose={onCloseAnswer} footer={composer}><CueAnswer thread={thread} onRetry={(question) => ask(question, { retry: true })} onSource={onOpenSource} onNewQuestion={newQuestion} /></PushLayer></div>}
      {sourceLayer && <SourceSheet source={sourceLayer} title="Answer source" onClose={onCloseSource} />}
    </>
  );
}
