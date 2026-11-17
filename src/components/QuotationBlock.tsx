import type { Quotation } from '../types';

interface QuotationBlockProps {
  quotation: Quotation;
}

export default function QuotationBlock({ quotation }: QuotationBlockProps) {
  return (
    <blockquote className="quotation">
      <div className="quotation__label">இலக்கியச் சான்று</div>
      <p className="quotation__text">{quotation.text}</p>
      <footer className="quotation__cite">
        <span className="quotation__work">{quotation.work}</span>
        {quotation.poemNumber && (
          <span className="quotation__poem">பாடல் {quotation.poemNumber}</span>
        )}
        {quotation.source && (
          <span className="quotation__poem" title={quotation.source}>
            {quotation.source}
          </span>
        )}
        {quotation.verified ? (
          <span className="quotation__verified" title="சரிபார்க்கப்பட்ட மேற்கோள்">✓ சரிபார்க்கப்பட்டது</span>
        ) : (
          <span className="quotation__unverified" title="இந்த மேற்கோள் முழுமையாக சரிபார்க்கப்படவில்லை">⚠ சரிபார்க்கப்படவில்லை</span>
        )}
      </footer>
    </blockquote>
  );
}
