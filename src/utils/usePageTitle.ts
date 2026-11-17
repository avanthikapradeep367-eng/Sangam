import { useEffect } from 'react';

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — சங்கச் சொல்` : 'சங்கச் சொல் — சங்க இலக்கிய அகராதி';
  }, [title]);
}
