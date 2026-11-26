import * as I from './Icons.jsx';
import { SheetLayer } from './InteractionLayer.jsx';

export default function SourceSheet({ source, onClose, title = 'Source' }) {
  let host = '';
  let url = null;
  try {
    const parsed = source.url ? new URL(source.url) : null;
    if (parsed && ['https:', 'http:'].includes(parsed.protocol)) {
      url = parsed.href;
      host = parsed.hostname.replace(/^www\./, '');
    }
  } catch { host = ''; }
  return (
    <SheetLayer title={title} eyebrow={url ? 'External reference' : 'Reference'} onClose={onClose}>
      <div className="source-sheet">
        <h2>{source.label || source.source || host || 'Original publisher'}</h2>
        {host && <p className="source-host">{host}</p>}
        <p>{url ? 'This opens an external publisher. Review the original report before sharing or relying on it.' : 'This reference points to the current app data. No external link was supplied.'}</p>
        {url && <a className="layer-primary-link" href={url} target="_blank" rel="noopener noreferrer">
          Open original source<I.ArrowUp size={17} style={{ transform: 'rotate(45deg)' }} />
        </a>}
      </div>
    </SheetLayer>
  );
}
