import type { MeaningStatus } from '../utils/languages';

const LABELS: Record<MeaningStatus, string> = {
  tamil: '',
  reviewed: '✓ சரிபார்க்கப்பட்டது',
  unreviewed: '⚠ சரிபார்க்கப்படவில்லை — வரைவு மொழிபெயர்ப்பு',
  fallback: 'இந்த மொழியில் பொருள் இன்னும் கிடைக்கவில்லை — தமிழ் வரையறை காட்டப்படுகிறது',
};

export default function MeaningBadge({ status }: { status: MeaningStatus }) {
  if (status === 'tamil') return null;
  return (
    <span className={`meaning-badge meaning-badge--${status}`}>
      {LABELS[status]}
    </span>
  );
}
