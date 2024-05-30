import { InjectionToken } from '@angular/core';
import {
  ProviderConfigType,
  CacheQueryProviderType,
  QueryConfigType,
} from './types';

/** @description cache provider configuration */
export const CACHE_PROVIDER_CONFIG = new InjectionToken<ProviderConfigType>(
  'Provides Azl cache provider configuration values'
);

/** @description global cached value request configuration */
export const REQUESTS = new InjectionToken<QueryConfigType[]>(
  'Query aliases global configuraiton token'
);

/**
 * @deprecated This token is of no use from version >= 0.17.x
 * 
 * @description Cache query provider instance
 */
export const CACHE_QUERY_CLIENT = new InjectionToken<CacheQueryProviderType>(
  'Azl cache query provider type'
);
