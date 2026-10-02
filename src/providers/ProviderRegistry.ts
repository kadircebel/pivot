import { IMovieSourceProvider } from '../core/interfaces/IMovieSourceProvider';
import { HdFilmCehennemiProvider } from './hdfilmcehennemi/HdFilmCehennemiProvider';

class ProviderRegistryService {
  private providers: Map<string, IMovieSourceProvider> = new Map();
  private activeProviderId: string = 'hdfilmcehennemi';

  constructor() {
    // Varsayılan aktif sağlayıcıyı kaydet
    const defaultProvider = new HdFilmCehennemiProvider();
    this.register(defaultProvider);
  }

  register(provider: IMovieSourceProvider): void {
    this.providers.set(provider.id, provider);
  }

  getAll(): IMovieSourceProvider[] {
    return Array.from(this.providers.values());
  }

  getActiveProvider(): IMovieSourceProvider {
    const provider = this.providers.get(this.activeProviderId);
    if (!provider) {
      // Güvenli geri dönüş
      const first = this.providers.values().next().value;
      if (first) return first;
      return new HdFilmCehennemiProvider();
    }
    return provider;
  }

  setActiveProvider(providerId: string): boolean {
    if (this.providers.has(providerId)) {
      this.activeProviderId = providerId;
      return true;
    }
    return false;
  }
}

export const ProviderRegistry = new ProviderRegistryService();
