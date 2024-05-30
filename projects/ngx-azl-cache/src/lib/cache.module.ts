import { CommonModule } from '@angular/common';
import { APP_INITIALIZER, ModuleWithProviders, NgModule } from '@angular/core';
import { defaultConfigs } from './defaults';
import { CachePipe } from './cache.pipe';
import { CacheRouter } from './cache.router';
import { ProviderConfigType } from './types';
import { CACHE_PROVIDER_CONFIG, REQUESTS } from './tokens';
import { CACHE_DIRECTIVES } from './directives';

/** @deprecated */
@NgModule({
  imports: [CommonModule, ...CACHE_DIRECTIVES],
  declarations: [],
  exports: [...CACHE_DIRECTIVES],
  providers: [CachePipe],
})
export class NgxAzlCacheModule {
  /**  @deprecated register services using `provideCacheProviderConfig`, `provideForInitialization`, `provideQuerySlices` instead */
  static forRoot(
    config: ProviderConfigType
  ): ModuleWithProviders<NgxAzlCacheModule> {
    return {
      ngModule: NgxAzlCacheModule,
      providers: [
        {
          provide: CACHE_PROVIDER_CONFIG,
          useValue: {
            ...config,
            responseInterceptor:
              config.responseInterceptor ?? defaultConfigs.responseInterceptor,
            pagination: config.pagination ?? defaultConfigs.pagination,
            router: config.router ?? defaultConfigs.router,
          } as ProviderConfigType,
        },
        {
          provide: APP_INITIALIZER,
          multi: true,
          useFactory: (router: CacheRouter) => {
            return async () => {
              if (config.router && Boolean(config.router?.autoload) === true) {
                router.subscribe();
              }
              return Promise.resolve(true);
            };
          },
          deps: [CacheRouter],
        },
        {
          provide: REQUESTS,
          useValue: config.requests ?? [],
        },
      ],
    };
  }
}
