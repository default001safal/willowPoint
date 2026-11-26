import { useEffect, useId, useRef, useState } from 'react';
import * as I from '../components/Icons.jsx';
import { cuePrompts } from '../data.js';
import { Divider } from '../components/ui.jsx';
import { PushLayer } from '../components/InteractionLayer.jsx';
import SourceSheet from '../components/SourceSheet.jsx';
import { useContent } from '../lib/content.jsx';
import { cueReply } from '../lib/cueEngine.js';

// Conversation so far in OpenAI-style roles, for follow-up questions.
const toHistory = (thread) => thread
  .filter((m) => !m.pending && !m.error)
  .map((m) => ({ role: m.from === 'me' ? 'user' : 'assistant', content: m.text }));

function CueComposer({ draft, setDraft, busy, onAsk, inLayer = false }) {
  const inputId = useId();
  return (
    <div className={`composer${inLayer ? ' in-layer' : ''}`}>
      <div className="composer-inner">
        <form onSubmit={(event) => { event.preventDefault(); onAsk(draft); }}>
          <label className="sr-only" htmlFor={inputId}>Ask Cue</label>
          <textarea
            id={inputId}
            rows={2}
            placeholder="Ask Cue anything about Nepal cricket…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                onAsk(draft);
              }
            }}
          />
          <div className="composer-foot">
            <span className="hint"><I.Spark size={13} style={{ color: 'var(--accent)' }} />{busy ? 'Cue is thinking…' : 'Live AI · grounded in current match data'}</span>
            <button type="submit" className="send" aria-label="Send" disabled={!draft.trim() || busy}>
              <I.ArrowUp size={18} sw={2.2} />
            </button>
          </div>
        </form>
      </div>
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
        <div key={`${index}-${message.text}`} className="cue-question">
          <span>You asked</span>
          <h2>{message.text}</h2>
        </div>
      ) : (
        <article key={index} className={`cue-response${message.error ? ' has-error' : ''}`}>
          <span className="cue-response-label"><I.SparkGlint size={17} />Cue</span>
          <p role={message.pending ? 'status' : undefined}>{message.text}</p>
          {message.error && (
            <button type="button" className="cue-retry" onClick={() => onRetry(message.retryQuestion)}>
              <I.Swap size={15} />Try again
            </button>
          )}
          {message.sources?.length > 0 && (
            <div className="cue-source-list" aria-label="Answer sources">
              <span>Sources</span>
              <div>
                {message.sources.map((source, sourceIndex) => (
                  <button key={`${source.label}-${sourceIndex}`} type="button" onClick={() => onSource(source)}>
                    {source.label}<I.Chevron size={13} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </article>
      ))}
      <button type="button" className="thread-reset" onClick={onNewQuestion}>
        <I.Plus size={14} />New question
      </button>
      <div ref={endRef} />
    </section>
  );
}

export default function CueScreen({
  pending,
  clearPending,
  answerOpen,
  sourceLayer,
  onOpenAnswer,
  onCloseAnswer,
  onOpenSource,
  onCloseSource,
}) {
  const content = useContent();
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
    setThread([
      ...base,
      ...(retry ? [] : [{ from: 'me', text: question }]),
      { from: 'cue', text: 'Thinking through the latest available match data…', pending: true },
    ]);
    setDraft('');
    setBusy(true);
    onOpenAnswer();
    try {
      const reply = await cueReply(question, content, history);
      if (id === requestId.current) {
        setThread((current) => [...current.filter((message) => !message.pending), { from: 'cue', ...reply }]);
      }
    } catch {
      if (id === requestId.current) {
        setThread((current) => [
          ...current.filter((message) => !message.pending),
          {
            from: 'cue',
            text: 'Cue could not complete that answer. Your question is still here; check your connection and try again.',
            error: true,
            retryQuestion: question,
          },
        ]);
      }
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

  const composer = (
    <CueComposer
      draft={draft}
      setDraft={setDraft}
      busy={busy}
      onAsk={(question) => ask(question, { restart: !answerOpen })}
      inLayer={answerOpen}
    />
  );

  return (
    <>
      <main style={{ paddingBottom: 216 }} inert={answerOpen ? '' : undefined} aria-hidden={answerOpen || undefined}>
        <section className="cue-hero">
          <span className="cue-mark" role="img" aria-label="Cue"><I.SparkGlint size={30} sw={1.7} /></span>
          <h1 className="screen-title">Ask <span className="soft">Cue</span></h1>
          <p>Quick answers from the latest available match data.</p>
        </section>

        <Divider />
        <section className="section">
          <h2 className="group-label" style={{ margin: '0 4px 2px' }}>Try asking</h2>
          {cuePrompts.map((prompt) => (
            <button key={prompt.id} type="button" className="card suggestion" onClick={() => ask(prompt.title, { restart: true })}>
              <span className="row-text"><strong>{prompt.title}</strong><span>{prompt.hint}</span></span>
              <I.Chevron size={18} style={{ color: 'var(--muted)' }} />
            </button>
          ))}
        </section>
        {!answerOpen && composer}
      </main>

      {answerOpen && (
        <div inert={sourceLayer ? '' : undefined} aria-hidden={sourceLayer ? true : undefined}>
          <PushLayer title="Ask Cue" eyebrow="Grounded answer" onClose={onCloseAnswer} footer={composer}>
            <CueAnswer
              thread={thread}
              onRetry={(question) => ask(question, { retry: true })}
              onSource={onOpenSource}
              onNewQuestion={newQuestion}
            />
          </PushLayer>
        </div>
      )}
      {sourceLayer && <SourceSheet source={sourceLayer} title="Answer source" onClose={onCloseSource} />}
    </>
  );
}
