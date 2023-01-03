import { AzlCacheProviderType, SliceQueryType } from './types';

/**
 * Creates a function for loading user provided slice
 */
export function sliceQueryfactory(provider: AzlCacheProviderType) {
  return (query: SliceQueryType) => {
    provider.loadSlice(query);
  };
}
