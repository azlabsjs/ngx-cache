import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { APP_INITIALIZER, ModuleWithProviders, NgModule } from '@angular/core';
import { defaultConfigs } from './defaults';
import { RESTQueryProvider } from './ngx-azl-cache-query.provider';
import { AzlCachePipe } from './ngx-azl-cache.pipe';
import { AzlCacheRouter } from './ngx-azl-cache.router';
import { AzlCacheProvider } from './ngx-azl-cache.service';
import { AzlCacheProviderConfigType } from './types';
import {
  AZL_CACHE_PROVIDER_CONFIG,
  AZL_CACHE_QUERY_CLIENT,
  REQUESTS,
} from './tokens';

@NgModule({
  imports: [CommonModule],
  declarations: [AzlCachePipe],
  exports: [AzlCachePipe],
  providers: [
    RESTQueryProvider,
    AzlCachePipe,
    {
      provide: AZL_CACHE_QUERY_CLIENT,
      useFactory: (http: HttpClient, config: AzlCacheProviderConfigType) => {
        return new RESTQueryProvider(http, config);
      },
      deps: [HttpClient, AZL_CACHE_PROVIDER_CONFIG],
    },
  ],
})
export class NgxAzlCacheModule {
  static forRoot(
    config: AzlCacheProviderConfigType
  ): ModuleWithProviders<NgxAzlCacheModule> {
    return {
      ngModule: NgxAzlCacheModule,
      providers: [
        AzlCacheProvider,
        AzlCacheRouter,
        {
          provide: AZL_CACHE_PROVIDER_CONFIG,
          useValue: {
            ...config,
            responseInterceptor:
              config.responseInterceptor ?? defaultConfigs.responseInterceptor,
            pagination: config.pagination ?? defaultConfigs.pagination,
            router: config.router ?? defaultConfigs.router,
          } as AzlCacheProviderConfigType,
        },
        {
          provide: APP_INITIALIZER,
          multi: true,
          useFactory: (router: AzlCacheRouter) => {
            return async () => {
              if (config.router && Boolean(config.router?.autoload) === true) {
                router.subscribe();
              }
              return Promise.resolve(true);
            };
          },
          deps: [AzlCacheRouter],
        },
        {
          provide: REQUESTS,
          useValue: config.requests ?? [],
        },
      ],
    };
  }
}
