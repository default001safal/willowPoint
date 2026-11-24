import { useEffect, useRef, useState } from 'react';
import * as I from '../components/Icons.jsx';
import { cuePrompts } from '../data.js';
import { Divider } from '../components/ui.jsx';
import { useContent } from '../lib/content.jsx';
import { cueAnswer } from '../lib/cueAnswers.js';

const exchange = (q, content) => [{ from: 'me', text: q }, { from: 'cue', ...cueAnswer(q, content) }];

export default function CueScreen({ pending, clearPending }) {
  const content = useContent();
  // A question handed over from another screen opens the thread straight away.
  const [thread, setThread] = useState(() => (pending ? exchange(pending, content) : []));
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);

  const ask = (text) => {
    const q = text.trim();
    if (!q) return;
    setThread((t) => [...t, ...exchange(q, content)]);
    setDraft('');
  };

  useEffect(() => {
    if (pending) clearPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [thread]);

  return (
    <main style={{ paddingBottom: 216 }}>
      <section className="cue-hero">
        <span className="cue-mark" role="img" aria-label="Cue"><I.SparkGlint size={30} sw={1.7} /></span>
        <h1 className="screen-title">Ask <span className="soft">Cue</span></h1>
        <p>Quick answers from the latest available match data.</p>
      </section>

      <Divider />
      {thread.length === 0 ? (
        <section className="section">
          <h2 className="group-label" style={{ margin: '0 4px 2px' }}>Try asking</h2>
          {cuePrompts.map((p) => (
            <button key={p.id} type="button" className="card suggestion" onClick={() => ask(p.title)}>
              <span className="row-text"><strong>{p.title}</strong><span>{p.hint}</span></span>
              <I.Chevron size={18} style={{ color: 'var(--muted)' }} />
            </button>
          ))}
        </section>
      ) : (
        <section className="thread" aria-live="polite">
          {thread.map((m, i) => (
            <div key={i} className={`bubble ${m.from}`}>
              {m.text}
              {m.sources?.length > 0 && <span className="cue-sources">From {m.sources.map((s, index) => (
                <span key={`${s.label}-${index}`}>
                  {index > 0 && ' · '}
                  {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a> : s.label}
                </span>
              ))}</span>}
            </div>
          ))}
          <button type="button" className="thread-reset" onClick={() => setThread([])}>
            <I.Plus size={14} />New question
          </button>
          <div ref={endRef} />
        </section>
      )}

      <div className="composer">
        <div className="composer-inner">
          <form onSubmit={(e) => { e.preventDefault(); ask(draft); }}>
            <label className="sr-only" htmlFor="cue-input">Ask Cue</label>
            <textarea
              id="cue-input"
              rows={2}
              placeholder="Ask Cue anything about Nepal cricket…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  ask(draft);
                }
              }}
            />
            <div className="composer-foot">
              <span className="hint"><I.Spark size={13} style={{ color: 'var(--accent)' }} />From current match data</span>
              <button type="submit" className="send" aria-label="Send" disabled={!draft.trim()}>
                <I.ArrowUp size={18} sw={2.2} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
