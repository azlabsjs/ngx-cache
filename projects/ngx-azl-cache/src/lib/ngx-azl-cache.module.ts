import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { APP_INITIALIZER, ModuleWithProviders, NgModule } from '@angular/core';
import { defaultConfigs } from './defaults';
import { HTTPQueryProvider } from './ngx-azl-cache-query.provider';
import { CachePipe } from './ngx-azl-cache.pipe';
import { CacheRouter } from './ngx-azl-cache.router';
import { CacheProvider } from './ngx-azl-cache.service';
import { ProviderConfigType } from './types';
import {
  AZL_CACHE_PROVIDER_CONFIG,
  AZL_CACHE_QUERY_CLIENT,
  REQUESTS,
} from './tokens';
import { CacheDirective } from './ngx-azl-cache.directive';

@NgModule({
  imports: [CommonModule],
  declarations: [CachePipe, CacheDirective],
  exports: [CachePipe, CacheDirective],
  providers: [
    HTTPQueryProvider,
    CachePipe,
    {
      provide: AZL_CACHE_QUERY_CLIENT,
      useFactory: (http: HttpClient, config: ProviderConfigType) => {
        return new HTTPQueryProvider(http, config);
      },
      deps: [HttpClient, AZL_CACHE_PROVIDER_CONFIG],
    },
  ],
})
export class NgxAzlCacheModule {
  static forRoot(
    config: ProviderConfigType
  ): ModuleWithProviders<NgxAzlCacheModule> {
    return {
      ngModule: NgxAzlCacheModule,
      providers: [
        CacheProvider,
        CacheRouter,
        {
          provide: AZL_CACHE_PROVIDER_CONFIG,
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
