import EnhancedList from './enhanced-list';
import ListOptions from './enhanced-list-options';
import { API_STORAGE_PROP } from './enhanced-list-helpers';

/**
 * generate component API
 */
export default class {
    list: HTMLElement;
    options: ListOptions;
    listWrapper: HTMLDivElement;
    filterInput: HTMLInputElement;
    checkboxes: HTMLInputElement[];
    selectAllCheckbox: HTMLSpanElement;

    constructor(instance: EnhancedList) {
        this.list = instance.list;
        this.options = instance.options;
        this.checkboxes = instance.checkboxes;
        this.listWrapper = instance.listWrapper;
        this.filterInput = instance.searchField;
        this.selectAllCheckbox = instance.selectAll;
        // bind methods to list instance to keep it private
        this.show = this.show.bind(instance);
        this.hide = this.hide.bind(instance);
        this.update = this.update.bind(instance);
        this.filter = this.filter.bind(instance);
        this.destroy = this.destroy.bind(instance);
        instance.list[API_STORAGE_PROP] = this;
    }

    destroy(this: EnhancedList, clearInternalCache?: boolean) {
        this.destroy.call(this, clearInternalCache);
    }

    filter(this: EnhancedList, value: string, updateScreenReaderText?: boolean) {
        this.filter.call(this, value, updateScreenReaderText);
    }

    update(this: EnhancedList, updateCheckboxStorage: boolean = true) {
        if (updateCheckboxStorage) {
            this.setCheckboxArrays.call(this);
        }
        this.updateCheckedStates.call(this);
    }

    show(this: EnhancedList) {
        this.show.call(this);
    }

    hide(this: EnhancedList) {
        this.hide.call(this);
    }
}
