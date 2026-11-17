import { useId, useRef, useState } from 'react';
import { copyText } from '../utils/citation';

interface Props {
  /** Human-readable reference, e.g. "நெஞ்சம் (nenjam)" or "குறுந்தொகை 40". */
  reference: string;
  /** Stable id of the entry or poem. */
  recordId: string;
  kind: 'entry' | 'poem';
}

const PARTS = {
  entry: ['வரையறை', 'மொழிபெயர்ப்பு', 'மேற்கோள் / பாடல் இணைப்பு', 'எழுத்துக்கூட்டு / வடிவங்கள்', 'பிற'],
  poem: ['பாடல் மூலம் (எழுத்துப் பிழை)', 'அடி எண் / பிரிப்பு', 'திணை, கூற்று, பாடியவர்', 'சொல் இணைப்பு', 'பிற'],
};

/**
 * "பிழையைத் தெரிவிக்க": this site has no submission backend, so the form builds a
 * pre-filled correction report that the reader copies and sends to the maintainers.
 */
export default function ReportDialog({ reference, recordId, kind }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const [part, setPart] = useState(PARTS[kind][0]);
  const [details, setDetails] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [copied, setCopied] = useState<'' | 'ok' | 'fail'>('');

  const report = [
    'சங்கச் சொல் — பிழை அறிக்கை',
    `${kind === 'entry' ? 'பதிவு' : 'பாடல்'}: ${reference}`,
    `அடையாளம்: ${kind}/${recordId}`,
    `இணைப்பு: ${window.location.href}`,
    `பகுதி: ${part}`,
    `பிழை: ${details || '—'}`,
    `திருத்தம் / ஆதாரம்: ${suggestion || '—'}`,
    `நாள்: ${new Date().toISOString().slice(0, 10)}`,
  ].join('\n');

  function close() {
    ref.current?.close();
  }

  return (
    <>
      <button
        type="button"
        className="tool-btn"
        ref={openerRef}
        onClick={() => { setCopied(''); ref.current?.showModal(); }}
      >
        பிழையைத் தெரிவிக்க
      </button>
      <dialog
        ref={ref}
        className="report"
        aria-labelledby={`${id}-title`}
        onClose={() => openerRef.current?.focus()}
        onClick={(e) => { if (e.target === ref.current) close(); }}
      >
        <form method="dialog" onSubmit={(e) => e.preventDefault()}>
          <header className="report__head">
            <h2 id={`${id}-title`}>பிழையைத் தெரிவிக்க</h2>
            <button type="button" className="icon-btn" aria-label="மூடு" onClick={close}>×</button>
          </header>
          <p className="report__ref">{kind === 'entry' ? 'பதிவு' : 'பாடல்'}: <strong lang="ta">{reference}</strong></p>

          <label htmlFor={`${id}-part`}>எந்தப் பகுதியில்?</label>
          <select id={`${id}-part`} value={part} onChange={(e) => setPart(e.target.value)}>
            {PARTS[kind].map((p) => <option key={p}>{p}</option>)}
          </select>

          <label htmlFor={`${id}-details`}>என்ன பிழை?</label>
          <textarea id={`${id}-details`} rows={3} value={details} onChange={(e) => setDetails(e.target.value)} />

          <label htmlFor={`${id}-fix`}>சரியானது என்ன? எந்தப் பதிப்பு / ஆதாரம்?</label>
          <textarea id={`${id}-fix`} rows={2} value={suggestion} onChange={(e) => setSuggestion(e.target.value)} />

          <p className="report__note">
            இந்தத் தளத்துக்கு இன்னும் நேரடிச் சமர்ப்பிப்பு வசதி இல்லை. கீழே உள்ள அறிக்கையை
            நகலெடுத்துத் திட்டப் பராமரிப்பாளருக்கு (எ.கா. மூலக் குறியீட்டுக் களஞ்சியத்தின் issue பகுதியில்) அனுப்புங்கள்.
          </p>
          <label htmlFor={`${id}-out`}>அறிக்கை</label>
          <textarea id={`${id}-out`} className="report__out" rows={8} readOnly value={report} lang="ta" />

          <div className="report__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={async () => setCopied((await copyText(report)) ? 'ok' : 'fail')}
            >
              அறிக்கையை நகலெடு
            </button>
            <button type="button" className="btn" onClick={close}>மூடு</button>
            <span role="status" className="report__status">
              {copied === 'ok' && 'நகலெடுக்கப்பட்டது. இனி அனுப்பலாம்.'}
              {copied === 'fail' && 'தானாக நகலெடுக்க இயலவில்லை; அறிக்கைப் பெட்டியிலிருந்து தேர்ந்தெடுத்து நகலெடுங்கள்.'}
            </span>
          </div>
        </form>
      </dialog>
    </>
  );
}
