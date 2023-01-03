import { forkJoin, interval, map, mergeMap, Observable, take } from 'rxjs';
import { PaginationChunkReturnType } from './types';

/**
 * @internal
 */
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

/**
 * @internal
 */
export const queryPaginationate = (
  queryFunc: (page: number) => Observable<Record<string, unknown>[]>,
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
