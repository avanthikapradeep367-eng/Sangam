import { useId, useMemo } from 'react';
import { useUi } from '../context/UiLanguage';
import { useContentLanguages } from '../utils/azure';
import { reader, useReader } from '../utils/speech';
import { IconGlobe, IconSpeaker } from './book/Art';

/**
 * Site language selector. Tamil and English have full interface strings; every other language in
 * Azure Translator's list translates the content and shows menus in English (said in the list
 * and beside the selector).
 */
export function LanguageSelect() {
  const { siteLang, setSiteLang, ui, uiFallback, t } = useUi();
  const { list, fromAzure } = useContentLanguages();
  const id = useId();
  const others = useMemo(
    () => list.filter((l) => l.code !== 'ta' && l.code !== 'en').sort((a, b) => a.name.localeCompare(b.name)),
    [list],
  );
  const current = list.find((l) => l.code === siteLang);

  return (
    <div className="lang-pick">
      <label htmlFor={id} className="visually-hidden">{t('siteLanguage')}</label>
      <IconGlobe className="lang-pick__icon" />
      <select id={id} value={siteLang} onChange={(e) => setSiteLang(e.target.value)} aria-describedby={uiFallback ? `${id}-note` : undefined}>
        <option value="ta" lang="ta">தமிழ்</option>
        <option value="en" lang="en">English</option>
        <optgroup label={`${t('meaningsOnly')}${fromAzure ? '' : ' (offline list)'}`}>
          {others.map((l) => (
            <option key={l.code} value={l.code}>{l.nativeName}{l.nativeName !== l.name ? ` — ${l.name}` : ''}</option>
          ))}
          {!current && siteLang !== 'ta' && siteLang !== 'en' && <option value={siteLang}>{siteLang}</option>}
        </optgroup>
      </select>
      {uiFallback && <span id={`${id}-note`} className="lang-pick__note" lang={ui}>{t('uiFallbackNote')}</span>}
    </div>
  );
}

/** "Read this page": Play, Pause, Resume and Stop for the visible main content. Never autoplays. */
export function PageReader() {
  const { t } = useUi();
  const state = useReader();
  const busy = state.status === 'preparing';
  return (
    <div className="reader" role="group" aria-label={t('readPage')}>
      {state.status === 'idle' || busy ? (
        <button type="button" className="reader__btn reader__btn--main" onClick={() => reader.play()} disabled={busy} aria-busy={busy}>
          <IconSpeaker className="reader__icon" />
          <span>{busy ? '…' : t('readPage')}</span>
        </button>
      ) : (
        <>
          {state.status === 'playing'
            ? <button type="button" className="reader__btn" onClick={() => reader.pause()}><span aria-hidden="true">❚❚</span> {t('pause')}</button>
            : <button type="button" className="reader__btn" onClick={() => reader.resume()}><span aria-hidden="true">▶</span> {t('resume')}</button>}
          <button type="button" className="reader__btn" onClick={() => reader.stop()}><span aria-hidden="true">■</span> {t('stop')}</button>
          {state.parts > 1 && <span className="reader__progress" aria-hidden="true">{state.part}/{state.parts}</span>}
        </>
      )}
      <span className="reader__msg" role="status">{state.message}</span>
    </div>
  );
}
