import { useUi } from '../context/UiLanguage';
import { reader, useReader } from '../utils/speech';
import { IconSpeaker } from './book/Art';

/** தமிழ் | English switch for the whole site (header and home bar). Tamil is the default. */
export function LanguageSelect() {
  const { siteLang, setSiteLang, t } = useUi();
  return (
    <div className="ui-toggle" role="group" aria-label={t('siteLanguage')}>
      <button type="button" aria-pressed={siteLang === 'ta'} onClick={() => setSiteLang('ta')} lang="ta">தமிழ்</button>
      <button type="button" aria-pressed={siteLang === 'en'} onClick={() => setSiteLang('en')} lang="en">English</button>
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
        <button type="button" className="reader__btn reader__btn--main" onClick={() => reader.play()} disabled={busy} aria-busy={busy} aria-label={t('readPage')} title={t('readPage')}>
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
