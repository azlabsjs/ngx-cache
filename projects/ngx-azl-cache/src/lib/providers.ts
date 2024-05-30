import {
  APP_INITIALIZER,
  Provider,
  ProviderToken,
  inject,
} from '@angular/core';
import { CACHE_PROVIDER_CONFIG, REQUESTS } from './tokens';
import { ProviderConfigType, QueryConfigType } from './types';
import { CacheRouter } from './cache.router';
import { defaultConfigs } from './defaults';

/** @internal */
type RouterConfigType = Required<ProviderConfigType>['router'];

/** @description Provides cache queries configuration */
export function provideCacheProviderConfig(config: ProviderConfigType) {
  return {
    provide: CACHE_PROVIDER_CONFIG,
    useValue: { ...defaultConfigs, ...config } as ProviderConfigType,
  } as Provider;
}

/** @description provides function that runs when framework execute app initialization function */
export function provideForInitialization(routerConfig: RouterConfigType) {
  return {
    provide: APP_INITIALIZER,
    multi: true,
    useFactory: () => {
      const router = inject(CacheRouter);
      return async () => {
        if (Boolean(routerConfig.autoload) === true) {
          router?.subscribe();
        }
        return Promise.resolve(true);
      };
    },
    deps: [CacheRouter],
  } as Provider;
}

/** @description Provides queries configuration value */
export function provideQuerySlices(
  configs:
    | QueryConfigType[]
    | ((_inject: <T>(t: ProviderToken<T>) => T) => QueryConfigType[])
) {
  return {
    provide: REQUESTS,
    useFactory: () => {
      return typeof configs === 'function' ? configs(inject) : configs;
    },
  } as Provider;
}
