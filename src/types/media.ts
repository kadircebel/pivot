export interface MediaItem {
  id: string;
  title: string;
  originalTitle?: string;
  posterUrl: string;
  backdropUrl?: string;
  year?: string;
  imdbRating?: string;
  languageBadge?: string;
  type: 'movie' | 'series';
  detailUrl: string;
  overview?: string;
}

export interface MediaRowSection {
  id: string;
  title: string;
  items: MediaItem[];
}
