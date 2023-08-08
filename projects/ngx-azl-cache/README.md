# AZL Cache

This library provides a backend data cache store for angular frontend application. It allows developpers to preload into cache collection of data that might be required by the frontend application to function properly. Using `@azlabsjs/ngx-query` library internally it refetch on a pre-defined interval the data fetched from the backend store, making the cached data up-to-date with backend store collections.

## Dependencies

| @azlabsjs/ngx-azl-cache | @azlabsjs/ngx-query | @azlabsjs/rx-query | Angular |
| ----------------------- | ------------------- | ------------------ | ------- |
| ^0.13.x                 | ^0.13.x             | ^0.1.x             | ^13.0   |
| ^0.13.x                 | ^0.14.x             | ^0.1.x             | ^14.0   |

## Usage

At the root of your angular application, import the library module with the required configurations:

```ts
// app.module.ts
import { NgModule } from "@angular/core";
import { NgxAzlCacheModule } from "@azlabsjs/ngx-azl-cache";

// ...

NgModule({
  imports: [
    // ...

    NgxAzlCacheModule.forRoot({
      debug: environment.production === false, // Enable debugging
    }),
  ],
});
export class AppModule {}
```

The configuration above provides basic configuration of the library in angular application.

- Loading / Caching backend data into frontend local store

The library comes with a provider `AzlCacheProvider` that allows developpers to load data from the backend store into frontend cache. To load data when application inializes, we take adavantage of angular `APP_INITIALIZER` multi provider:

```ts
// app.module.ts
import { NgModule, APP_INITIALIZER } from "@angular/core";
import { NgxAzlCacheModule, AzlCacheProvider } from "@azlabsjs/ngx-azl-cache";

// ...

NgModule({
  imports: [
    // ...
    // Configure the library modules
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: (provider: AzlCacheProvider) => {
        return async () => {
          if (provider) {
            provider.loadSlice([
              {
                endpoint: "http://localhost:8000/api/post_types",
                method: "GET", // Optional -> Default: GET
                key: "app.post_types", // The key that identifies the collection in the local store
              },
              {
                // ...
              },
              // ...
            ]);
          }
          return Promise.resolve(true);
        };
      },
      deps: [AzlCacheProvider],
    },
  ],
});
export class AppModule {}
```

**Note**
The `AzlCacheProvider` uses an HTTP client to query data from the backend using REST interfaces. To override the default client used by the provider, developpers should create their own implementation and provides the `AZL_CACHE_QUERY_CLIENT` token through angular dependency injection:

```ts
import { ResponseInterceptorType } from "@azlabsjs/ngx-azl-cache";
import { Injectable } from "@angular/core";

@Injectable()
export class MyCustomQueryClient implements AzlCacheQueryProviderType {
  // #region Service properties
  _cacheConfig!: QueryCacheConfigType;
  get cacheConfig() {
    return this._cacheConfig;
  }
  // #endregion Service properties

  // cacheConfig  Setter
  setCacheConfig(state: Partial<QueryCacheConfigType>) {
    // Set the cache configuration property value
    return this;
  }

  copy() {
    // Creates a copy of the current instance
    // The cache provider calls the function to create new instances of the class
    // as it's a singleton to avoid issues when performing queries
  }

  query(method: string, endpoint: string, callback: (items: any[], partial: boolean) => void, params?: Record<string, string>, responseInterceptor?: ResponseInterceptorType) {
    // Provides implementation for sending query to the backend server
  }
}
```

Then register the created service in your application module:

```ts
// app.module.ts
import { NgModule } from "@angular/core";
import { NgxAzlCacheModule, AZL_CACHE_QUERY_CLIENT } from "@azlabsjs/ngx-azl-cache";
import { MyCustomQueryClient } from "path/to/service";

// ...

NgModule({
  imports: [
    // ...
  ],
  providers: [
    {
      provide: AZL_CACHE_QUERY_CLIENT,
      useClass: MyCustomQueryClient,
    },
  ],
});
export class AppModule {}
```

- Angular router events

The library provides developpers the ability to automatically load data base on angular router events. It will attempts to load the provided slice whenever user navigate to a url starting with the configured path.

```ts
// app.module.ts
import { NgModule } from "@angular/core";
import { NgxAzlCacheModule } from "@azlabsjs/ngx-azl-cache";

// ...

NgModule({
  imports: [
    // ...

    NgxAzlCacheModule.forRoot({
      debug: false,
      router: {
        autoload: true,
        slicesFactory: (injector: Injector) => {
          return {
            ["dashboard/posts"]: [
              {
                endpoint: "http://localhost:8000/api/post_types",
                method: "GET", // Optional -> Default: GET
                key: "app.post_types", // The key that identifies the collection in the local store
              },
              // ...
            ],
          };
        },
      },
    }),
  ],
});
export class AppModule {}
```

The configuration above will load data whenever a user navigates to a path starting with `/dashboard/posts`. For example `/dashboard/posts/create`, `/dashboard/posts/edit/:id`, etc.

**Note**
For performance reason, the data is loaded once if a given route matches. Subsequent navigation will not trigger load.

- Accessing the frontend cache

The `AzlCacheProvider` provides a `state$` interface that allows developper to get data from cache. The `state$` is an rxjs observable instance that holds a javascript `Map` of all collection keys. In the example below, `app.post_types` is the key to the collection of `post_types` loaded in the store.

```ts
import { AzlCacheProvider } from "@azlabsjs/ngx-azl-cache";
import { map } from "rxjs/operators";

@Component({
  // ...
})
export class MyComponent {
  // Holds a reference to an observable of post_types
  posttypes$ = this.provider.state$.pipe(map((state) => state.get("app.post_types")));

  constructor(private provider: AzlCacheProvider) {}
}
```

- Pipe

The library also provides developpers with a pipe for projecting data from the store in the HTML template using cache key name, id, and label field.

```ts
import { AzlCacheProvider } from "@azlabsjs/ngx-azl-cache";
import { map } from "rxjs/operators";

@Component({
  // ...
  template: `
    <table>
      <!-- Table structure -->
      <td>{{ 2 | azlcache : app.post_types : id : label }}</td>
    </table>
  `,
})
export class MyComponent {}
```

The syntax for querying using pipe is as follow:

> azlcache:<CACHE_COLLECTION_KEY_NAME>:<ID_FIELD_TO_MATCH_DATA_AGAINST>:<LABEL_FIELD_TO_DISPLAY>

Note that the `id` and `label` parameter are optional. By default `id` and `label` are respectively used bny the pipe internally.

### Using directive

The library comes with a structural directive that fetches value from cache and build an output text node that is appended to the DOM selected element by the directive. It tends to be lighter than the router partials load as it only query for value matching the provided search query if it does not exists in cache.

**Note** Using directive require a pre-configured request dictionnary that that allows developpers to use an alias to query for data. Below are required configuration and usage:

```ts
// app.module.ts
import { NgModule } from "@angular/core";
import { NgxAzlCacheModule } from "@azlabsjs/ngx-azl-cache";

// ...

NgModule({
  imports: [
    // ...

    NgxAzlCacheModule.forRoot({
      debug: environment.production === false, // Enable debugging
      // Provides alias for each request to be performed by the query provider
      requests: [
        {
          key: "posts",
          endpoint: "/posts",
        },
      ],
    }),
  ],
});
export class AppModule {}
```

After the configuration, using the directive to fetch data is as follow:

```ts
@Component({
  template: ` <p [azlCache]="'posts'" [template]="'label'" [search]="'id'" [query]="query"></p> `,
})
export class TestComponent {}
```

**Note** The directive API support the following inputs:

- [azlaCache] : It's the main input of the directive that takes as argument the `alias` to a request object configured during module initialization.

- [template] : The template input represent the output format if the value queried for is resolved. Below is a list of supported template format:

  - A string representing the `property` to select in the resolved object.

  - An array of `properties` to include in the output string. (Ex: Given `["title", "label"]` for this object `{"title": "Environments", "label": "More..."}`, the directive will output `Environments More...`)

  - A template literal string that represent the final output with variables enclose in `{}`. (Ex: Given `{title}, {label}` for this object `{"title": "Environments", "label": "More..."}`, the directive will output `Environments, More...`)

- [query] : Which represent the value to search for

- [search] : Which represent the field used as matching for the provided value

**Warning**
The API as mature and might not change frequently, but library is still under active development, please use at your own risk.
