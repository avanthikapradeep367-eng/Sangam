import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { coverage, languages, sources, works } from '../data';
import { Breadcrumb } from '../components/common';
import { usePageTitle } from '../utils/usePageTitle';
import { ORIGIN_LABEL } from '../utils/languages';
import type { MeaningOrigin } from '../types';

export default function SourcesPage() {
  usePageTitle('ஆதாரங்கள்');
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
  }, [hash]);
  const translated = languages.filter((l) => !l.base);

  return (
    <main id="main-content" className="page prose">
      <div className="container">
        <Breadcrumb items={[{ to: '/about', label: 'பற்றி' }, { label: 'ஆதாரங்கள்' }]} />
        <h1 className="page-title">ஆதாரங்களும் உள்ளடக்க அளவும்</h1>
        <p className="page-lede">தரவு புதுப்பிக்கப்பட்ட நாள்: {coverage.generatedAt}. கீழுள்ள எண்ணிக்கைகள் தரவுக் கோப்புகளிலிருந்து தானாகக் கணக்கிடப்படுகின்றன.</p>

        <h2>பாடல் மூலங்கள்</h2>
        <div className="table-wrap"><table className="data-table">
          <caption className="visually-hidden">நூல் வாரியாகப் பாடல்கள்</caption>
          <thead><tr><th scope="col">நூல்</th><th scope="col">இக்களஞ்சியத்தில்</th><th scope="col">மொத்தம்</th><th scope="col">அச்சுடன் ஒப்பிட்டவை</th></tr></thead>
          <tbody>
            {works.map((w) => {
              const c = coverage.works[w.id];
              return (
                <tr key={w.id}>
                  <th scope="row">{c?.poems ? <Link to={`/works/${w.id}`}>{w.title}</Link> : w.title}</th>
                  <td>{c?.poems ? `${c.poems} (${c.numbers[0]}–${c.numbers.at(-1)})` : '—'}</td>
                  <td>{w.poemCount ?? '—'}</td>
                  <td>{c?.poems ? c.reviewedPoems : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table></div>

        <h2>நவீனத் தமிழ் அடிப்படைச் சொற்கள்</h2>
        <div className="table-wrap"><table className="data-table">
          <caption className="visually-hidden">நவீனத் தமிழ்ச் சொற்களின் மதிப்பாய்வு நிலை</caption>
          <thead><tr><th scope="col">பதிவுகள்</th><th scope="col">ஒப்புதல்</th><th scope="col">காத்திருப்பவை</th><th scope="col">ஆசிரியர் குறியிட்டவை</th><th scope="col">தானியங்கிச் சரிபார்ப்புக் குறிகள்</th></tr></thead>
          <tbody><tr>
            <td>{coverage.collections.modern.total}</td><td>{coverage.collections.modern.approved}</td><td>{coverage.collections.modern.pending}</td>
            <td>{coverage.collections.modern.flagged}</td><td>{coverage.collections.modern.withValidationFlags}</td>
          </tr></tbody>
        </table></div>
        <p>
          இச்சொற்களின் தமிழ் எழுத்து AI உதவியுடன் படியெடுக்கப்பட்டது; ஆசிரியர் சரிபார்த்து ஒப்புதல் தரும் வரை ஒவ்வொரு பதிவும் “காத்திருக்கிறது”.
          இவை நவீனத் தமிழ்ச் சொற்கள்; சங்க இலக்கியப் பயன்பாட்டுக்குச் சான்று அன்று. <Link to="/letters?src=modern">எழுத்து வரிசையில்</Link> · <Link to="/topics">தலைப்பு வாரியாக</Link>
        </p>

        <h2>மொழிபெயர்ப்புகள்</h2>
        <div className="table-wrap"><table className="data-table">
          <caption className="visually-hidden">மொழி வாரியாக மொழிபெயர்ப்புகள்</caption>
          <thead><tr><th scope="col">மொழி</th><th scope="col">பொருள்கள்</th><th scope="col">சரிபார்த்தவை</th><th scope="col">மூலம்</th></tr></thead>
          <tbody>
            <tr><th scope="row">தமிழ் (நவீன வரையறை)</th><td>{coverage.tamilDefinitions} / {coverage.senses}</td><td>0</td><td>—</td></tr>
            {translated.map((l) => (
              <tr key={l.code}>
                <th scope="row" lang={l.code}>{l.label}</th>
                <td>{coverage.translations[l.code]?.total ?? 0} / {coverage.senses}</td>
                <td>{coverage.translations[l.code]?.reviewed ?? 0}</td>
                <td>
                  {Object.entries(coverage.translations[l.code]?.byOrigin ?? {}).map(([o, n]) => `${ORIGIN_LABEL[o as MeaningOrigin]} ${n}`).join(' · ') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <p>
          ஒரு மொழியில் பொருள் இல்லாதபோது “இந்த மொழியில் பொருள் இன்னும் சேர்க்கப்படவில்லை” என்று காட்டப்பட்டுத் தமிழ் வரையறை தொடர்ந்து தெரியும்.
          “இயந்திர மொழிபெயர்ப்பு” எனக் குறிக்கப்பட்டவை AI உதவியுடன் உருவாக்கப்பட்டவை; ஆசிரியர் சரிபார்க்கும் வரை அவற்றை நம்பகமானதாகக் கொள்ள வேண்டாம்.
          நவீனத் தமிழ்ச் சொற்களுக்கு ஆங்கிலப் பொருள் உள்ளது; அவற்றின் தமிழ் விளக்கமும் இந்தி, மலையாளம், தெலுங்கு மொழிபெயர்ப்புகளும் இன்னும் சேர்க்கப்படவில்லை.
          எல்லாப் பதிவுகளும் ({coverage.entries}) இப்போது வரைவு நிலையில் உள்ளன. ஒலிப்புப் பதிவுகள் இன்னும் இல்லை.
        </p>

        <h2>ஆதாரப் பட்டியல்</h2>
        {sources.map((s) => (
          <section key={s.id} id={s.id} className="source">
            <h3>{s.title}</h3>
            <dl>
              {s.url && <><dt>இணைப்பு</dt><dd><a href={s.url} rel="noreferrer" target="_blank">{decodeURI(s.url)}</a></dd></>}
              <dt>உள்ளடக்கம்</dt><dd>{s.covers}</dd>
              <dt>உரிமம்</dt><dd lang="en">{s.license}</dd>
              {s.retrieved && <><dt>பெற்ற நாள்</dt><dd>{s.retrieved}</dd></>}
              <dt>குறிப்பு</dt><dd lang="en">{s.notes}</dd>
            </dl>
          </section>
        ))}

        <h2>தரவைப் புதுப்பித்தல்</h2>
        <p>
          சொற்கள், பொருள்கள், மொழிபெயர்ப்புகள், சொல்–பாடல் இணைப்புகள் ஆகியவை <code>content/</code> அடைவில் CSV கோப்புகளாகவும், பாடல்கள் JSON கோப்புகளாகவும் உள்ளன.
          புதிய மொழியையோ நூலையோ தரவுக் கோப்பில் சேர்த்தாலே போதும். <code>npm run data:import</code> கட்டளை ஒரே அடையாளம் இருமுறை வருவது,
          இல்லாத பதிவைச் சுட்டுவது, பாடல் அடியில் இல்லாத சொல்வடிவத்தைச் சுட்டுவது போன்ற பிழைகளைச் சரிபார்த்த பின்பே தரவை ஏற்கும். விவரம்: களஞ்சியத்தில் உள்ள <code>DATA.md</code>.
        </p>
      </div>
    </main>
  );
}
