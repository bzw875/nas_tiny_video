import { SmbConfig } from '../services/SmbCrawler';

export const defaultCrawlPath = '/';

export function validateSmbConfig(config: SmbConfig): string[] {
  const errors: string[] = [];

  if (!config.host) {
    errors.push('Host is required');
  }

  if (!config.share) {
    errors.push('Share is required');
  }

  return errors;
}
