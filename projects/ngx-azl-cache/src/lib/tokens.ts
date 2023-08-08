import { InjectionToken } from '@angular/core';
import {
  ProviderConfigType,
  CacheQueryProviderType,
  RequestConfigs,
} from './types';

export const AZL_CACHE_QUERY_CLIENT =
  new InjectionToken<CacheQueryProviderType>(
    'Azl cache query provider type'
  );

export const AZL_CACHE_PROVIDER_CONFIG =
  new InjectionToken<ProviderConfigType>(
    'Provides Azl cache provider configuration values'
  );

export const REQUESTS = new InjectionToken<RequestConfigs>(
  'Query aliases global configuraiton token'
);
