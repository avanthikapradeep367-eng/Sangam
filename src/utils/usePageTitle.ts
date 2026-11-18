import { useEffect } from 'react';

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — சொல்வளம்` : 'சொல்வளம் — சங்க இலக்கியம் · Sangam Literature';
  }, [title]);
}
