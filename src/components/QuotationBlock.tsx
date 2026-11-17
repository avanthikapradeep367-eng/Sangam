import type { Quotation } from '../types';
import { useMeaningLanguage } from '../context/LanguageContext';

interface QuotationBlockProps {
  quotation: Quotation;
  /** Word forms to highlight within the quotation text (e.g. the headword). */
  highlightTerms?: string[];
}

function highlight(text: string, terms: string[]) {
  const cleanTerms = terms.filter(Boolean);
  if (cleanTerms.length === 0) return text;
  const pattern = new RegExp(`(${cleanTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    cleanTerms.includes(part) ? <mark key={i} className="quotation__highlight">{part}</mark> : part
  );
}

export default function QuotationBlock({ quotation, highlightTerms = [] }: QuotationBlockProps) {
  const [lang] = useMeaningLanguage();
  const translation = lang !== 'ta' ? quotation.translations?.[lang] : undefined;

  return (
    <details className="quotation">
      <summary className="quotation__label">பாடலில் காண்க</summary>
      <p className="quotation__text" lang="ta">{highlight(quotation.text, highlightTerms)}</p>
      {translation && (
        <p className="quotation__translation">{translation.text}</p>
      )}
      <footer className="quotation__cite">
        <span className="quotation__work">{quotation.work}</span>
        {quotation.poemNumber && (
          <span className="quotation__poem">பாடல் {quotation.poemNumber}</span>
        )}
        {quotation.source && (
          <span className="quotation__poem" title={quotation.source}>
            பதிப்பு: {quotation.source}
          </span>
        )}
        {quotation.verified ? (
          <span className="quotation__verified" title="சரிபார்க்கப்பட்ட மேற்கோள்">✓ சரிபார்க்கப்பட்டது</span>
        ) : (
          <span className="quotation__unverified" title="இந்த மேற்கோள் முழுமையாக சரிபார்க்கப்படவில்லை">⚠ சரிபார்க்கப்படவில்லை</span>
        )}
      </footer>
    </details>
  );
}
