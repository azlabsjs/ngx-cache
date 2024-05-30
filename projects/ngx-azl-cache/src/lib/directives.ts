import { CacheDirective } from './cache.directive';
import { CachePipe } from './cache.pipe';

/** @description Exported standalone directives & pipes */
export const CACHE_DIRECTIVES = [CacheDirective, CachePipe] as const;
