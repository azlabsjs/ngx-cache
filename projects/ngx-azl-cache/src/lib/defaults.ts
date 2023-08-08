import { AzlCacheProviderConfigType } from './types';

/**
 * @internal
 */
export const CHUNK_SIZE_LIMIT = 5;

/**
 * @internal
 */
export const QUERY_INTERVAL = 7000;

/**
 * @internal
 */
export const DEFAULT_QUERY_REFECTH_INTERVAL = 300000;

/**
 * @internal
 *
 * Default response interceptor used by the azl cache provider
 */
export const defaultResponseInterceptor = (
  response: Record<string, unknown>
) => {
  return response['data'] ?? response;
};

/**
 * @internal
 * Default values of the azl cache configuration
 */
export const defaultConfigs = {
  debug: false,
  chunkSize: CHUNK_SIZE_LIMIT,
  queryInterval: QUERY_INTERVAL,
  responseInterceptor: defaultResponseInterceptor,
  // By default, when paginating we load 500 values per page
  pagination: {
    perPage: 500,
  },
  router: {
    autoload: false,
  },
} as AzlCacheProviderConfigType;
