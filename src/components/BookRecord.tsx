import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { DictionaryEntry } from '../types';
import { citationsByEntry, entryById, entryPath, headwordLabel, senseById } from '../data';
import { CollectionTag, ImportStatus } from './common';

export const REGISTER_LABEL = {
  'modern-literary': 'நவீன இலக்கியத் தமிழ் (MLT)',
  'high-literary': 'உயர் இலக்கியத் தமிழ் (HLT)',
} as const;

/** The book's English with its underline markers rendered: _x_ underline, __x__ double underline. */
export function BookMarkup({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const re = /__(.+?)__|_(.+?)_/g;
  let at = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > at) out.push(text.slice(at, m.index));
    out.push(m[1] !== undefined
      ? <span key={k++} className="u2" title="இரட்டை அடிக்கோடு: விளக்கம்">{m[1]}</span>
      : <u key={k++} title="அடிக்கோடு: பேச்சுத் தமிழில் மட்டும்">{m[2]}</u>);
    at = re.lastIndex;
  }
  out.push(text.slice(at));
  return <>{out}</>;
}

/** Forms block under the headword of a book record: spoken form, literary forms, grammar. */
export function BookForms({ entry }: { entry: DictionaryEntry }) {
  return (
    <dl className="book-forms">
      {entry.register && <><dt>வழக்கு</dt><dd>{REGISTER_LABEL[entry.register]}{entry.star && <span className="muted"> · ★ இவ்வடிவங்கள் பேச்சுத் தமிழிலும் வழங்குகின்றன</span>}</dd></>}
      {entry.noMltInBook && <><dt>குறிப்பு</dt><dd>இலக்கிய வடிவம் இல்லை; தலைச்சொல் பேச்சு வடிவம்.</dd></>}
      {entry.colloquial?.tamil && (
        <><dt>பேச்சுத் தமிழ் (CT)</dt><dd><span lang="ta">{entry.colloquial.tamil}</span>{entry.colloquial.roman && <> · <span lang="ta-Latn" className="roman">{entry.colloquial.roman}</span></>}</dd></>
      )}
      {(entry.literaryForms?.length ?? 0) > 0 && <><dt>உயர் இலக்கிய வடிவம் (HLT)</dt><dd lang="ta">{entry.literaryForms!.join(', ')}</dd></>}
      {entry.spellingVariants.length > 0 && <><dt>பிற MLT வடிவங்கள்</dt><dd lang="ta">{entry.spellingVariants.join(', ')}</dd></>}
      {entry.verbClass && <><dt>வினை வகுப்பு</dt><dd>{entry.verbClass} <span className="muted">(Graul வகைப்பாடு{entry.colloquial?.roman?.endsWith('=') ? ', வலி வினை' : entry.colloquial?.roman?.endsWith('-') ? ', மெலி வினை' : ''})</span></dd></>}
      {entry.irregularForms && <><dt>ஒழுங்கற்ற வடிவங்கள்</dt><dd lang="ta">{entry.irregularForms}</dd></>}
      {entry.grammarNote && !entry.verbClass && <><dt>இலக்கணக் குறிப்பு</dt><dd lang="en">{entry.grammarNote}</dd></>}
    </dl>
  );
}

export function Subforms({ entry }: { entry: DictionaryEntry }) {
  if (!entry.subforms?.length) return null;
  return (
    <section className="notes" aria-labelledby="subforms-title">
      <h2 id="subforms-title" className="section-title">இப்பதிவின் கீழ் உள்ள வடிவங்கள்</h2>
      <ul className="subforms">
        {entry.subforms.map((s) => (
          <li key={s.id}>
            <span className="subforms__word" lang="ta">{s.mlt ?? s.colloquial.tamil}</span>
            {s.colloquial.tamil && s.colloquial.tamil !== s.mlt && <span className="muted"> · பேச்சு: <span lang="ta">{s.colloquial.tamil}</span></span>}
            {s.colloquial.roman && <span className="roman muted"> ({s.colloquial.roman})</span>}
            {s.hlt.length > 0 && <span className="muted"> · HLT: <span lang="ta">{s.hlt.join(', ')}</span></span>}
            <span className="subforms__gloss" lang="en">{s.english}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Review state, validation flags and the no-Sangam-claim note. */
export function BookNotice({ entry }: { entry: DictionaryEntry }) {
  if (!entry.review) return null;
  return (
    <div className="book-notice">
      <p>
        <ImportStatus status={entry.review.status} />{' '}
        {entry.review.status === 'pending' && 'தமிழ் எழுத்து AI உதவியுடன் படியெடுக்கப்பட்டது. ஆசிரியர் சரிபார்த்து ஒப்புதல் தரும் வரை வரைவு.'}
      </p>
      <p className="muted">
        இது நவீனத் தமிழ்ச் சொற்பட்டியல். இச்சொல் சங்க இலக்கியத்தில் வருவதற்கான சான்றாக இப்பதிவைக் கொள்ளக் கூடாது; அத்தகைய இணைப்பு பாடல் மேற்கோளுடன் மட்டுமே காட்டப்படும்.
      </p>
    </div>
  );
}

/** Equivalent entries in the other dictionary, checked by an editor (links.csv). */
export function LinkedEntries({ entry }: { entry: DictionaryEntry }) {
  if (!entry.links.length) return null;
  return (
    <section>
      <h2 className="aside-title">பிற அகராதியில் இதே சொல்</h2>
      <ul className="related">
        {entry.links.map((l) => {
          const other = entryById.get(l.entryId);
          if (!other) return null;
          const sense = l.senseId ? senseById.get(l.senseId)?.sense : undefined;
          const cites = citationsByEntry.get(other.id)?.length ?? 0;
          return (
            <li key={l.entryId}>
              <Link to={entryPath(other.id, l.senseId)} lang="ta">{headwordLabel(other)}</Link>{' '}
              <CollectionTag collection={other.collection} />
              {sense && <span className="related__gloss">பொருள் {sense.number}</span>}
              {other.collection === 'sangam' && cites > 0 && <span className="related__gloss">சங்கப் பாடல்களில் {cites} மேற்கோள்கள்</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
