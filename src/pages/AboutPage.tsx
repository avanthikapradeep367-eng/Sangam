import { Link } from 'react-router-dom';

export default function AboutPage() {
  return (
    <main className="about-page" id="main-content">
      <div className="container">
        <nav className="breadcrumb" aria-label="வழித்தடம்">
          <Link to="/">முகப்பு</Link>
          <span className="breadcrumb__sep" aria-hidden="true">›</span>
          <span aria-current="page">பற்றி</span>
        </nav>

        <h1 className="page-title">சங்கச் சொல் பற்றி</h1>
        <p className="page-subtitle">சங்க இலக்கியத்திற்கான திறந்த சொற்களஞ்சியம்</p>

        <div className="demo-notice" role="note">
          <strong>குறிப்பு:</strong> இது ஒரு மாதிரி தரவுத் தொகுப்பு (Demo Dataset). தற்போது{' '}
          <strong>15 சொற்கள்</strong> மட்டுமே உள்ளன. ✓ அடையாளமிட்ட மேற்கோள்கள்
          சரிபார்க்கப்பட்ட ஆதாரங்களிலிருந்து எடுக்கப்பட்டவை. ⚠ அடையாளமிட்டவை
          முழுமையாக சரிபார்க்கப்படவில்லை — தயவுசெய்து அசல் நூல்களில் சரிபாருங்கள்.
        </div>

        <p>
          <strong>சங்கச் சொல்</strong> என்பது சங்க இலக்கியத்தில் (கி.மு. 300 — கி.பி. 300)
          வரும் தனித்துவமான தமிழ்ச் சொற்களுக்கான ஒரு திறந்த, டிஜிட்டல் அகராதி.
          மாணவர்கள், ஆசிரியர்கள், மொழியியல் ஆர்வலர்கள் — எல்லோரும் எளிதாகப்
          பயன்படுத்தும் வகையில் கட்டமைக்கப்பட்டிருக்கிறது.
        </p>

        <p>
          ஒவ்வொரு சொல்லுக்கும் தமிழ் வரையறை, ஆங்கில விளக்கம் (இருக்கும் இடத்தில்),
          ஒலிப்பெயர்ப்பு மற்றும் அசல் சங்கப் பாடல்களிலிருந்து மேற்கோள்கள்
          தரப்படுகின்றன. சொற்கள் நூல்கள் மற்றும் தொடக்க எழுத்துக்கள் வழி
          தேடக்கூடியவாறு அமைந்துள்ளன.
        </p>

        <h2>தரவு மூலங்கள்</h2>
        <div className="source-list">
          <div className="source-item">
            <strong>கழகம் வெளியீடுகள்</strong> — சைவ சித்தாந்த நூற்பதிப்புக் கழகம்,
            சென்னை. குறுந்தொகை, நற்றிணை, அகநானூறு, புறநானூறு உட்பட எட்டுத்தொகை
            நூல்களுக்கான அரசியல்பூர்வமான பதிப்பு.
          </div>
          <div className="source-item">
            <strong>தொல்காப்பியம்</strong> — தொல்காப்பியனார், கழக வெளியீடு. தமிழின்
            மிகப் பழமையான இலக்கண நூல்; திணை மரபிற்கான அடிப்படை ஆதாரம்.
          </div>
          <div className="source-item">
            <strong>Tamil Lexicon</strong> — University of Madras, 1924–1936. சென்னைப்
            பல்கலைக்கழகம் வெளியிட்ட முழுமையான தமிழ் அகராதி; வரையறைகளுக்குப்
            பயன்படுத்தப்பட்டது.
          </div>
          <div className="source-item">
            <strong>TSHM (Tamil Sangam Heritage Manuscripts)</strong> — Tamil Nadu
            Oriental Manuscripts Library. கையெழுத்துப் பிரதி ஆதாரங்கள்.
          </div>
        </div>

        <h2>திணை மரபு பற்றி</h2>
        <p>
          சங்க அகப்பொருள் கவிதை <em>திணை</em> என்னும் கட்டுமான முறையை
          பின்பற்றுகிறது. ஐந்து நிலங்கள் — குறிஞ்சி (மலை), முல்லை (காடு),
          மருதம் (வயல்), நெய்தல் (கடற்கரை), பாலை (பாலை) — ஒவ்வொன்றும் ஒரு
          குறிப்பிட்ட காதல் உணர்வு நிலையை உள்ளடக்கியிருக்கும். இந்த மரபின்
          முழுமையான விளக்கம் தொல்காப்பியம் அகத்திணையியலில் உள்ளது.
        </p>

        <h2>தொடர்பு கொள்ள</h2>
        <p>
          தரவுப் பிழைகளை அறிவிக்க, புதிய சொற்களை பரிந்துரைக்க, அல்லது
          கூட்டமைப்பில் பங்கேற்க விரும்புபவர்கள் இந்தத் திட்டத்தின்
          ஆதாரக் குறியீட்டை (source code) அணுகலாம்.
        </p>

        <div style={{ marginTop: 'var(--space-10)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--color-rule)' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
            சங்கச் சொல் — Creative Commons Attribution 4.0 International உரிமத்தின் கீழ்
            வெளியிடப்படுகிறது. <Link to="/">முகப்புக்கு திரும்பு</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}
