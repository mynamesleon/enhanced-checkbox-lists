import EnhancedList from './enhanced-list';
import EnhancedListApi from './enhanced-list-api';
import EnhancedListOptions from './enhanced-list-options';

export function EnhancedCheckboxList(element: HTMLElement, options?: EnhancedListOptions): EnhancedListApi {
    return new EnhancedList(element, options).api;
}

export default EnhancedCheckboxList;
