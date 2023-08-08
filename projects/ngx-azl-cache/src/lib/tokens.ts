import { InjectionToken } from '@angular/core';
import {
  AzlCacheProviderConfigType,
  AzlCacheQueryProviderType,
  RequestConfigs,
} from './types';

export const AZL_CACHE_QUERY_CLIENT =
  new InjectionToken<AzlCacheQueryProviderType>(
    'Azl cache query provider type'
  );

export const AZL_CACHE_PROVIDER_CONFIG =
  new InjectionToken<AzlCacheProviderConfigType>(
    'Provides Azl cache provider configuration values'
  );

export const REQUESTS = new InjectionToken<RequestConfigs>(
  'Query aliases global configuraiton token'
);
