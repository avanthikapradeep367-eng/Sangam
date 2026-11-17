import { useState } from 'react';
import { isBookmarked, toggleBookmark } from '../utils/bookmarks';

export default function BookmarkButton({ entryId }: { entryId: string }) {
  const [saved, setSaved] = useState(() => isBookmarked(entryId));

  function handleClick() {
    setSaved(toggleBookmark(entryId));
  }

  return (
    <button
      type="button"
      className={`tool-btn${saved ? ' tool-btn--active' : ''}`}
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? 'குறிப்பிலிருந்து நீக்கு' : 'குறிப்பாக சேமி'}
    >
      <span aria-hidden="true">{saved ? '★' : '☆'}</span>
      {saved ? 'சேமிக்கப்பட்டது' : 'குறிப்பாக சேமி'}
    </button>
  );
}
