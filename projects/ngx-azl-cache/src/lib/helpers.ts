import { getObjectProperty } from '@azlabsjs/js-object';
import {
  CacheProviderType,
  HttpClientType,
  HttpParamsType,
  PageResult,
  PaginationChunkReturnType,
  ProviderConfigType,
  QueryConfigType,
  ResponseInterceptorType,
} from './types';
import {
  Observable,
  forkJoin,
  interval,
  map,
  mergeMap,
  of,
  take,
  tap,
} from 'rxjs';
import { CHUNK_SIZE_LIMIT, defaultConfigs } from './defaults';

/** @internal */
export const createPaginationChunk = (
  total: number,
  perPage: number,
  chunkSize: number
) => {
  let totalPages = parseInt(Math.floor(total / perPage).toFixed(), 10);
  const remaining = total % perPage;
  // Add another page if there is a remaining in the division operation
  if (remaining !== 0) {
    totalPages += 1;
  }
  // We slice from index 1 to rermove the first page as it has already been
  // queried
  const list = Array.from(new Array(totalPages).keys())
    .slice(1)
    .map((item) => item + 1);
  const chunks: number[][] = [];
  for (let index = 0; index < list.length; index += chunkSize) {
    chunks.push(list.slice(index, index + chunkSize));
  }
  return chunks;
};

/** @internal */
export const queryPaginationate = <T = unknown>(
  queryFunc: (page: number) => Observable<T[]>,
  total: number,
  perPage: number,
  chunkSize: number,
  queryInterval?: number
) => {
  return (chunkFn: PaginationChunkReturnType) => {
    // For the first chunk we do not provide any delay
    const chunks: number[][] = chunkFn(total, perPage, chunkSize);
    const first = chunks[0];
    let _interval = 0;
    const requests = [
      forkJoin(first.map((param) => queryFunc(param))).pipe(
        map((result) => result.flat())
      ),
    ];
    const least = chunks.slice(1);
    for (const chunk of least) {
      _interval += queryInterval ?? 300000;
      const _request = interval(_interval)
        .pipe(
          take(1),
          mergeMap(() => forkJoin(chunk.map((param) => queryFunc(param))))
        )
        .pipe(map((result) => result.flat()));
      requests.push(_request);
    }
    return forkJoin(requests);
  };
};

/**
 * Creates a function for loading user provided slice
 */
export function sliceQueryfactory(provider: CacheProviderType) {
  return (query: QueryConfigType[]) => {
    provider.loadSlice(query);
  };
}

/**
 * @internal
 * Create a template builder factory that replaces property template string with
 * the corresponding value in the provided record
 */
export function templateFactory(template: string | string[]) {
  return (record: Record<string, unknown>) => {
    return typeof template === 'string' && template !== null
      ? template
          .split(/(\{\w+\})/g)
          .map((curr) => {
            if (curr === '') {
              return curr;
            }
            const property = curr.replace('{', '').replace('}', '').trim();
            return (getObjectProperty(record, property) as string) ?? curr;
          })
          .join('')
          .trim()
      : template
          .map((l) => getObjectProperty(record, l) ?? '')
          .join(' ')
          .trim();
  };
}

/** @internal */
function sendRequest(
  client: HttpClientType,
  method: string,
  endpoint: string,
  params?: HttpParamsType
) {
  return client.request(method, endpoint, {
    params,
    responseType: 'json',
  }) as Observable<PageResult<Record<string, unknown>>>;
}

/**
 * @internal
 * Prepare query endpoint for pagination
 */
function prepareForPagination(
  endpoint: string,
  page: number,
  perPage?: number
) {
  endpoint = endpoint ?? '';
  if (endpoint.indexOf('?') === -1) {
    endpoint += '?';
  }
  if (endpoint.indexOf('per_page') === -1) {
    // The per_page request query is set to be a number between
    // 100 - 1000 just for optimization and server performance purpose
    const paginationQuery = `page=${page}&per_page=${Math.min(
      1000,
      Math.max(perPage ?? 100, 100)
    )}`;
    endpoint += endpoint.endsWith('?')
      ? paginationQuery
      : `&${paginationQuery}`;
  }
  return endpoint;
}

/** @internal */
export function useHTTPQuery(
  client: HttpClientType,
  config: ProviderConfigType = defaultConfigs
) {
  return (
    method: string,
    endpoint: string,
    callback?: (items: Record<string, unknown>[], partial: boolean) => void,
    params?: HttpParamsType,
    responseInterceptor?: ResponseInterceptorType
  ) => {
    config = config ?? defaultConfigs;
    // First thing first, we query for the first page of the collection
    // The result of the first page query is expected to return a pgaination instance
    // and we use the pagination result meta data to query for the remaining pages
    return sendRequest(
      client,
      method,
      prepareForPagination(endpoint, 1, config.pagination?.perPage),
      params
    ).pipe(
      mergeMap((response: PageResult<Record<string, unknown>>) => {
        // First pagination chunk
        const items = (
          responseInterceptor ??
          ((response: PageResult<Record<string, unknown>>) => response.data)
        )(response);
        // When the first page of data is loaded, we call the callback function
        // with the loaded data with the partial flag turns on
        const total = Number(response.total ?? 0);
        if (callback) {
          callback(items, 0 === total || total <= items.length ? false : true);
        }
        if (
          0 !== total &&
          // Add a condition that checks if the total items
          // is not greater than the length of the list of query result items
          Number(response.total) > items.length
        ) {
          const queryFunc$ = (page: number) =>
            sendRequest(
              client,
              method,
              prepareForPagination(endpoint, page, config.pagination?.perPage),
              params
            ).pipe(
              map(
                responseInterceptor ??
                  ((response: PageResult<Record<string, unknown>>) =>
                    response.data)
              )
            );
          return queryPaginationate<Record<string, unknown>>(
            queryFunc$,
            response.total,
            config.pagination?.perPage ?? 500,
            config.chunkSize ?? CHUNK_SIZE_LIMIT,
            config.queryInterval
          )(createPaginationChunk).pipe(
            // When the pagination data is completed loading, we fetch call the callback
            // with result items, and the partial flag turned off
            tap((state) => {
              if (callback) {
                callback([...items, ...state.flat()], false);
              }
            }),
            map(() => true)
          );
        }
        return of(true);
      })
    );
  };
}
