import { MediaItem } from '../../types/media';

export interface HomeSection {
  id: string;
  title: string;
  items: MediaItem[];
}

export interface HomeData {
  featured: MediaItem[];
  sections: HomeSection[];
}

export interface VideoSourceOption {
  id: string;
  name: string; // 'Close', 'Rapidrame', 'VidMoly' vb.
  embedUrl: string;
  language: string; // 'dual', 'tr', 'sub'
}

export interface MediaDetail extends MediaItem {
  description: string;
  duration?: string;
  genres: string[];
  actors: { name: string; url?: string }[];
  director?: string;
  country?: string;
  trailerUrl?: string;
  sources: VideoSourceOption[];
}

export interface PaginatedResult {
  items: MediaItem[];
  currentPage: number;
  hasNextPage: boolean;
  totalPages?: number;
}

export interface IMovieSourceProvider {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly version: string;

  getHome(): Promise<HomeData>;
  getMovies(page: number, categorySlug?: string): Promise<PaginatedResult>;
  getSeries(page: number): Promise<PaginatedResult>;
  search(query: string, page?: number): Promise<PaginatedResult>;
  getDetails(detailUrl: string): Promise<MediaDetail>;
  resolveVideoUrl?(source: VideoSourceOption, detailUrl: string): Promise<string>;
}
