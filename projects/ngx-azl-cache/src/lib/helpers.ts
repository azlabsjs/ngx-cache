import { getObjectProperty } from '@azlabsjs/js-object';
import { CacheProviderType, QueryConfigType } from './types';

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
