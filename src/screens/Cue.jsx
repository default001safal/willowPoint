import { useEffect, useRef, useState } from 'react';
import * as I from '../components/Icons.jsx';
import { cuePrompts } from '../data.js';
import { Divider } from '../components/ui.jsx';

// Cue is UI-only for now: questions are shown in the thread and a placeholder reply explains
// that answers will appear here once the Cue backend is connected.
const PLACEHOLDER_REPLY =
  "Cue isn't connected yet. Once it is, your answer will appear here with its sources.";

const exchange = (q) => [{ from: 'me', text: q }, { from: 'cue', text: PLACEHOLDER_REPLY }];

export default function CueScreen({ pending, clearPending }) {
  // A question handed over from another screen opens the thread straight away.
  const [thread, setThread] = useState(() => (pending ? exchange(pending) : []));
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);

  const ask = (text) => {
    const q = text.trim();
    if (!q) return;
    setThread((t) => [...t, ...exchange(q)]);
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
    <main style={{ paddingBottom: 200 }}>
      <section className="cue-hero">
        <span className="cue-mark" role="img" aria-label="Cue"><I.SparkGlint size={30} sw={1.7} /></span>
        <h1 className="screen-title">Ask <span className="soft">Cue</span></h1>
        <p>Quick, sourced answers on Nepal cricket.</p>
      </section>

      <Divider />
      {thread.length === 0 ? (
        <section className="section" style={{ paddingTop: 22, gap: 10 }}>
          <h2 className="group-label" style={{ margin: '0 4px 2px' }}>Try asking</h2>
          {cuePrompts.map((p) => (
            <button key={p.id} type="button" className="card suggestion" onClick={() => ask(p.title)}>
              <span className="row-text"><strong>{p.title}</strong><span>{p.hint}</span></span>
              <I.Chevron size={18} style={{ color: 'var(--muted)' }} />
            </button>
          ))}
        </section>
      ) : (
        <section className="thread" style={{ paddingTop: 28 }} aria-live="polite">
          {thread.map((m, i) => (
            <div key={i} className={`bubble ${m.from}`}>{m.text}</div>
          ))}
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
              <span className="hint"><I.Spark size={13} style={{ color: 'var(--accent)' }} />Every answer shows its sources</span>
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
