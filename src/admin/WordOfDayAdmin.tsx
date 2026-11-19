import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin, highlight } from './context';
import { Section } from './ui';
import { DAILY_POOL_SIZE, isoDate, tamilDate, wordForDate } from '../utils/wordOfDay';

/**
 * How /today picks its word, and manual choices for particular dates (content/word-of-day.json).
 * The schedule below is computed from the built site data; saved choices appear in it after
 * "Rebuild site data".
 */
export default function WordOfDayAdmin() {
  const { data, run, busy, L } = useAdmin();
  const [today] = useState(() => new Date());
  const [date, setDate] = useState(() => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)));
  const eligible = useMemo(() => data.tables.entries.filter((e) => data.tables.citations.some((c) => c.entry_id === e.id && c.featured === 'y')), [data]);
  const [entryId, setEntryId] = useState(data.wordOfDay[date] ?? '');
  const days = Array.from({ length: 14 }, (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + i));
  const chosen = data.tables.entries.find((e) => e.id === entryId);

  const save = (d: string, id: string) => run('word-of-day', { date: d, entryId: id || null },
    id ? L(`${d}: கைத்தேர்வு சேமிக்கப்பட்டது — content/word-of-day.json`, `${d}: choice saved in content/word-of-day.json`) : L(`${d}: கைத்தேர்வு நீக்கப்பட்டது`, `${d}: choice removed`));

  return (
    <>
      <header className="a-head">
        <h1>{L('இன்றைய சொல்', 'Word of the day')}</h1>
      </header>

      <Section title={L('/today சொல்லை எப்படித் தேர்கிறது', 'How /today picks its word')} id="how">
        <ol className="a-explain">
          <li>{L('குழு: "முதன்மை" (featured) மேற்கோள் உள்ள சங்கச் சொற்கள் மட்டும் — ஒவ்வொரு நாளும் பாடலிலிருந்து ஓர் உண்மையான அடி காட்டப்படும்.', 'Pool: Sangam entries that have a featured citation, so every day shows a real line from an indexed poem.')}
            {' '}<strong>{L(`இப்போது (கட்டிய தரவில்): ${DAILY_POOL_SIZE} சொற்கள்.`, `Now (built data): ${DAILY_POOL_SIZE} entries.`)}</strong></li>
          <li>{L('குழு ஒருமுறை நிலையான விதையுடன் (20261118) கலக்கப்படுகிறது; 1 ஜனவரி 2026 முதல் ஒவ்வொரு நாளும் ஒரு படி நகர்கிறது. எல்லாச் சொற்களும் காட்டப்படும் வரை மீண்டும் வராது.', 'The pool is shuffled once with a fixed seed (20261118) and walked one step per day from 1 January 2026, so no word repeats until all have been shown.')}</li>
          <li>{L('நாள் பார்வையாளரின் உள்ளூர் நள்ளிரவில் மாறுகிறது; எல்லோருக்கும் ஒரே சொல்.', 'The day changes at the visitor’s local midnight; everyone sees the same word.')}</li>
          <li>{L('content/word-of-day.json இல் ஒரு தேதிக்குக் கைத்தேர்வு இருந்தால் அதுவே காட்டப்படும் (அச்சொல்லுக்கு முதன்மை மேற்கோள் இருக்க வேண்டும்). சுழற்சி மாறாது.', 'A date chosen by hand in content/word-of-day.json shows that word instead (it must have a featured citation). The rotation is otherwise unchanged.')}</li>
        </ol>
        <p className="a-muted">{L('குறியீடு', 'Code')}: <code>src/utils/wordOfDay.ts</code></p>
      </Section>

      <div className="a-split a-split--even">
        <Section title={L('அடுத்த 14 நாட்கள் (கட்டிய தரவு)', 'Next 14 days (built data)')} id="schedule">
          <table className="a-table a-table--dense">
            <thead><tr><th scope="col">{L('நாள்', 'Date')}</th><th scope="col">{L('சொல்', 'Word')}</th><th scope="col">{L('வகை', 'Picked by')}</th></tr></thead>
            <tbody>
              {days.map((d) => {
                const w = wordForDate(d);
                const iso = isoDate(d);
                const saved = data.wordOfDay[iso];
                const pending = saved && saved !== (w?.chosen ? w.entry.id : null);
                return (
                  <tr key={iso} className={iso === date ? 'is-picked' : undefined}>
                    <th scope="row"><button type="button" className="a-link" onClick={() => { setDate(iso); setEntryId(data.wordOfDay[iso] ?? ''); }}>{tamilDate(d, false)}</button></th>
                    <td lang="ta">{w ? <Link to={`/admin/entry/${w.entry.id}`}>{w.entry.headword}</Link> : '—'}</td>
                    <td>{w?.chosen ? <span className="a-tag">{L('கைத்தேர்வு', 'Manual')}</span> : L('சுழற்சி', 'Rotation')}
                      {pending && <span className="a-flag a-flag--warn">{L(`சேமித்தது: ${data.tables.entries.find((e) => e.id === saved)?.headword ?? saved} — தரவைப் புதுப்பிக்கவும்`, `Saved: ${data.tables.entries.find((e) => e.id === saved)?.headword ?? saved} — rebuild site data`)}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>

        <Section title={L('ஒரு நாளுக்குச் சொல்லைத் தேர்ந்தெடு', 'Choose the word for a date')} id="choose">
          <form className="a-form" onSubmit={(e) => { e.preventDefault(); void save(date, entryId); }}>
            <div className="a-grid a-grid--2">
              <label className="a-field"><span>{L('நாள்', 'Date')}</span>
                <input type="date" value={date} required onChange={(e) => { setDate(e.target.value); setEntryId(data.wordOfDay[e.target.value] ?? ''); }} /></label>
              <label className="a-field"><span>{L('சொல் (முதன்மை மேற்கோள் உள்ளவை)', 'Entry (with a featured citation)')}</span>
                <select value={entryId} onChange={(e) => setEntryId(e.target.value)}>
                  <option value="">{L('— சுழற்சி (கைத்தேர்வு இல்லை) —', '— rotation (no manual choice) —')}</option>
                  {eligible.map((e) => <option key={e.id} value={e.id}>{e.headword} · {e.id}</option>)}
                </select></label>
            </div>
            {chosen && <DailyPreview id={chosen.id} />}
            <div className="a-actions">
              <button type="submit" className="a-btn a-btn--primary" disabled={busy || (!entryId && !data.wordOfDay[date])}>{entryId ? L('தேர்வைச் சேமி', 'Save choice') : L('கைத்தேர்வை நீக்கு', 'Remove manual choice')}</button>
            </div>
          </form>
          <h3>{L('சேமித்த கைத்தேர்வுகள்', 'Saved choices')}</h3>
          {Object.keys(data.wordOfDay).length ? (
            <ul className="a-list">
              {Object.entries(data.wordOfDay).map(([d, id]) => (
                <li key={d}><code>{d}</code> <span lang="ta">{data.tables.entries.find((e) => e.id === id)?.headword ?? id}</span>{' '}
                  <button type="button" className="a-btn a-btn--tiny a-btn--ghost" disabled={busy} onClick={() => void save(d, '')}>{L('நீக்கு', 'Remove')}</button></li>
              ))}
            </ul>
          ) : <p className="a-muted">{L('இல்லை — எல்லா நாட்களும் சுழற்சிப்படி.', 'None — every day follows the rotation.')}</p>}
        </Section>
      </div>
    </>
  );
}

function DailyPreview({ id }: { id: string }) {
  const { data, L } = useAdmin();
  const e = data.tables.entries.find((x) => x.id === id)!;
  const sense = data.tables.senses.filter((s) => s.entry_id === id).sort((a, b) => Number(a.number) - Number(b.number))[0];
  const en = sense && data.tables.translations.find((t) => t.sense_id === sense.id && t.lang === 'en');
  const c = data.tables.citations.find((x) => x.entry_id === id && x.featured === 'y');
  const p = c && data.poems.find((x) => x.id === c.poem_id);
  return (
    <div className="a-daily">
      <p className="a-daily__hw" lang="ta">{e.headword}</p>
      {e.transliteration && <p className="a-translit" lang="ta-Latn">{e.transliteration}</p>}
      {sense && <p lang="ta">{sense.definition_ta}</p>}
      {en && <p lang="en" className="a-en">{en.text}</p>}
      {c && p && <blockquote className="a-quote is-ok"><p lang="ta">{highlight(p.lines[Number(c.line) - 1] ?? '', c.form)}</p><footer lang="ta">{data.works.find((w) => w.id === p.workId)?.title} {p.number}:{c.line} · {c.review_status === 'reviewed' ? L('சரிபார்த்தது', 'verified') : L('சரிபார்க்கப்படவில்லை', 'unverified')}</footer></blockquote>}
    </div>
  );
}
