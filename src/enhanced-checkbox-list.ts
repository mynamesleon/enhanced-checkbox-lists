import EnhancedList from './enhanced-list';
import EnhancedListApi from './enhanced-list-api';
import EnhancedListOptions from './enhanced-list-options';
import { API_STORAGE_PROP } from './enhanced-list-helpers';

export function EnhancedCheckboxList(element: HTMLElement, options?: EnhancedListOptions): EnhancedListApi {
    // if instance already exists on the main element, do not re-initialise
    if (element && element[API_STORAGE_PROP] && element[API_STORAGE_PROP].open) {
        return element[API_STORAGE_PROP];
    }
    return new EnhancedList(element, options).api;
}

export default EnhancedCheckboxList;
