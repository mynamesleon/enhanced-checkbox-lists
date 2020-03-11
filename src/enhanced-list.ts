import addClass from 'element-addclass';
import hasClass from 'element-hasclass';
import removeClass from 'element-removeclass';
import isPrintableKeycode from 'is-printable-keycode';

import './closest-polyfill';
import EnhancedListIds from './enhanced-list-ids';
import EnhancedListApi from './enhanced-list-api';
import EnhancedListOptions from './enhanced-list-options';
import {
    API_STORAGE_PROP,
    isCheckboxOrRadio,
    trimString,
    cleanString,
    removeEvent,
    getLabelFor
} from './enhanced-list-helpers';

/**
 * internal state storage
 */
const INTERNAL_CACHE: any = {};
const CACHE_SEARCH_PROP: string = 'search';
const CACHE_VISIBLE_PROP: string = 'visible';

/**
 * keycodes, stored for easy reference
 */
const KEYS = {
    ENTER: 13,
    ESCAPE: 27,
    SPACE: 32,
    PAGE_UP: 33,
    PAGE_DOWN: 34,
    END: 35,
    HOME: 36
};

/**
 * main checkbox list enhancement class
 */
export default class EnhancedList {
    ids: EnhancedListIds;
    api: EnhancedListApi;
    options: EnhancedListOptions;

    // elements
    list: HTMLElement;
    button: HTMLButtonElement;
    componentWrapper: HTMLDivElement;
    checkboxes: HTMLInputElement[];
    listWrapper: HTMLDivElement;
    searchField: HTMLInputElement;
    selectAll: HTMLSpanElement;
    srCount: HTMLSpanElement;
    listFieldset: HTMLFieldSetElement;

    // event listeners
    autoCloseEvent: EventListenerOrEventListenerObject;
    listChangeEvent: EventListenerOrEventListenerObject;

    buttonClickEvent: EventListenerOrEventListenerObject;

    listWrapperKeyDownEvent: EventListenerOrEventListenerObject;

    searchFieldKeyDownEvent: EventListenerOrEventListenerObject;
    searchFieldInputEvent: EventListenerOrEventListenerObject;

    selectAllClickEvent: EventListenerOrEventListenerObject;
    selectAllFocusInEvent: EventListenerOrEventListenerObject;
    selectAllFocusOutEvent: EventListenerOrEventListenerObject;
    selectAllKeyDownEvent: EventListenerOrEventListenerObject;

    // timers
    filterTimeout: ReturnType<typeof setTimeout>;
    autoCloseTimeout: ReturnType<typeof setTimeout>;

    // functional storate
    autoCloseBound: boolean;
    allCheckboxLabels: string[] = [];
    visibleCheckboxIndexes: number[] = [];
    checkedCheckboxIndexes: number[] = [];

    // store list label and cssNameSpace internally so that
    // the component has to be properly refreshed to update them
    listLabel: string;
    cssNameSpace: string;

    constructor(list: HTMLElement, options?: EnhancedListOptions) {
        if (!list || list.nodeType !== 1) {
            return;
        }

        // if instance already exists for this element, destroy and re-make
        const storedApi: any = list[API_STORAGE_PROP];
        if (storedApi && typeof storedApi.destroy === 'function') {
            storedApi.destroy();
        }

        this.list = list;
        this.listFieldset = this.list.closest('fieldset');
        this.options = new EnhancedListOptions(options);
        this.ids = new EnhancedListIds(list);
        this.init();
    }

    /**
     * trigger callbacks included in component options
     */
    triggerOptionCallback(name: string) {
        if (typeof this.options[name] === 'function') {
            this.options[name].call(this, this.list);
        }
    }

    /**
     * show element with CSS only - if none provided, set list state to visible
     */
    show(element?: HTMLElement) {
        const cssNameSpace: string = this.cssNameSpace;
        if (typeof element !== 'undefined') {
            removeClass(element, `${cssNameSpace}--hide hide hidden`);
            element.removeAttribute('aria-hidden');
            element.removeAttribute('hidden');
            return;
        }

        const wrapper = this.listWrapper;
        if (wrapper.getAttribute('hidden') === 'hidden' || hasClass(wrapper, `${cssNameSpace}--hide`)) {
            this.setListState(true);
            this.triggerOptionCallback('onShow');
        }
    }

    /**
     * hide element with CSS only - if none provided, set list state to hidden
     */
    hide(element?: HTMLElement) {
        const hideClass = `${this.cssNameSpace}--hide`;
        if (typeof element !== 'undefined') {
            addClass(element, `${hideClass} hide hidden`);
            element.setAttribute('aria-hidden', 'true');
            element.setAttribute('hidden', 'hidden');
            return;
        }

        const wrapper = this.listWrapper;
        if (wrapper && wrapper.getAttribute('hidden') !== 'hidden' && !hasClass(wrapper, hideClass)) {
            this.setListState(false);
            this.triggerOptionCallback('onHide');
        }
    }

    /**
     * cache existence, get, set, and delete
     * @example this.cache() - existence check / full response
     * @example this.cache(propertyName) - get
     * @example this.cache(propertyName, value) - set
     * @example this.cache(true, propertyName) - delete single property in entry
     * @example this.cache(true) - delete whole cache entry
     */
    cache(property?: string | boolean, value?: string | any): any {
        // existence check - when no arguments provided
        if (typeof property === 'undefined') {
            return INTERNAL_CACHE[this.ids.LIST];
        }

        // delete actions - if property param is a boolean, and true
        if (typeof property === 'boolean' && property && this.cache()) {
            const propToDelete = value as string;
            // delete individual item in cache if second param was provided
            if (typeof propToDelete === 'string' && typeof this.cache(propToDelete) !== 'undefined') {
                delete INTERNAL_CACHE[this.ids.LIST][propToDelete];
            }
            // if no second param was provided, delete whole cache entry
            if (typeof propToDelete === 'undefined') {
                delete INTERNAL_CACHE[this.ids.LIST];
            }
            return;
        }

        // safety check - property must be a string at this stage
        if (typeof property !== 'string') {
            return;
        }

        // get...
        if (typeof value === 'undefined') {
            if (!this.cache()) {
                return;
            }
            return INTERNAL_CACHE[this.ids.LIST][property];
        }

        // set...
        // create cache entry if necessary
        if (!this.cache()) {
            INTERNAL_CACHE[this.ids.LIST] = {};
        }
        INTERNAL_CACHE[this.ids.LIST][property] = value;
    }

    /**
     * removing auto close handling
     */
    unbindAutoClose() {
        if (this.autoCloseBound && this.autoCloseEvent) {
            removeEvent(this.componentWrapper, 'focusout', this.autoCloseEvent);
            removeEvent(document, 'click', this.autoCloseEvent);
            this.autoCloseBound = false;
        }
    }

    /**
     * bind auto close handling for closing the list
     */
    bindAutoClose() {
        if (!this.autoCloseBound && this.autoCloseEvent) {
            this.componentWrapper.addEventListener('focusout', this.autoCloseEvent);
            document.addEventListener('click', this.autoCloseEvent);
            this.autoCloseBound = true;
        }
    }

    /**
     * set list to be visible or not
     */
    setListState(visible?: boolean) {
        if (typeof visible !== 'boolean') {
            const startingState: boolean = this.cache()
                ? this.cache(CACHE_VISIBLE_PROP)
                : this.options.togglable // if no cache state, but is togglable, use visible option
                ? this.options.visible
                : !this.options.togglable; // if not toggable, force set to true

            this.setListState(!!startingState);
            return;
        }

        if (visible) {
            this.show(this.listWrapper);
            this.bindAutoClose();
        } else {
            this.hide(this.listWrapper);
        }

        if (this.button) {
            this.button.setAttribute('aria-expanded', (!!visible).toString());
        }

        this.cache(CACHE_VISIBLE_PROP, visible);
    }

    /**
     * get parent element of a checkbox using the itemSelector option;
     * if invalid, or empty, return the checkbox itself
     */
    getItemSelectorElem(checkbox: HTMLInputElement, selector?: string): HTMLElement | HTMLInputElement {
        let elem: HTMLElement;
        const itemSelector: string = typeof selector === 'string' ? selector : this.options.itemSelector;
        // use a try catch in case the provided value is not a valid selector
        if (typeof itemSelector === 'string' && itemSelector) {
            try {
                elem = checkbox.closest(itemSelector);
            } catch (err) {}
        }
        return elem || checkbox;
    }

    /**
     * update the checkedCheckboxIndexes array
     */
    getAllCheckedCheckboxIndexes() {
        this.checkedCheckboxIndexes = [];
        for (let i = 0, l = this.checkboxes.length; i < l; i += 1) {
            if (this.checkboxes[i] && !!this.checkboxes[i].checked) {
                this.checkedCheckboxIndexes.push(i);
            }
        }
    }

    /**
     * update toggle button text
     */
    updateToggleButtonText(checkedCount: number) {
        if (!this.button) {
            return;
        }

        let textToUse: string;
        const toggleButtonText = this.options.toggleButtonText;
        if (toggleButtonText) {
            if (typeof toggleButtonText === 'string') {
                textToUse = toggleButtonText;
            } else if (typeof toggleButtonText === 'function') {
                textToUse = toggleButtonText(this.getListLabel(), checkedCount);
            }
        }

        // check if textToUse is undefined, as we want to allow explicit empty string
        if (typeof textToUse === 'undefined') {
            textToUse = `${this.getListLabel()} (${checkedCount})`;
        }

        // allow use of html in this case
        this.button.innerHTML = textToUse;
    }

    /**
     * set button text and include number of checked checkboxes in brackets.
     * Also update select all aria-owns (ids) and aria-checked state (true, false, or mixed)
     */
    updateCheckedStates() {
        this.getAllCheckedCheckboxIndexes();
        const countChecked: number = this.checkedCheckboxIndexes.length;

        // update toggle button text
        this.updateToggleButtonText(countChecked);

        // update select all to show indeterminate state / checked
        if (this.selectAll) {
            // if none visible, also hide select all
            const visibleIndexesCount: number = this.visibleCheckboxIndexes.length;
            if (this.options.filterable && !visibleIndexesCount) {
                return this.hide(this.selectAll.parentElement);
            }

            // ensure is visible
            this.show(this.selectAll.parentElement);

            // gather ids of visible checkboxes
            const visibleCheckboxIds: string[] = [];
            for (let i = 0; i < visibleIndexesCount; i += 1) {
                const id: string = this.checkboxes[this.visibleCheckboxIndexes[i]].id;
                visibleCheckboxIds.push(id);
            }

            // set attributes/states
            this.selectAll.setAttribute('aria-controls', visibleCheckboxIds.join(' '));
            const allChecked: boolean = countChecked === visibleIndexesCount;
            const ariaChecked: string = countChecked && !allChecked ? 'mixed' : allChecked.toString();
            this.selectAll.setAttribute('aria-checked', ariaChecked);
        }
    }

    /**
     * filter which checkboxes should be visible based on a value
     */
    runFilter(value: string, updateScreenReaderText: boolean = false) {
        const cleanedValue: string = cleanString(value, true);
        const itemSelector: string = this.options.itemSelector;

        // reset visible array
        this.visibleCheckboxIndexes = [];

        // store indexes of checkboxes to keep visible
        this.checkboxes.forEach((checkbox: HTMLInputElement, index: number) => {
            // set all to hide initially - css only
            this.hide(this.getItemSelectorElem(checkbox, itemSelector));
            // always keep selected items visible
            const isChecked: boolean = this.checkedCheckboxIndexes.indexOf(index) > -1;
            if (isChecked || this.allCheckboxLabels[index].search(cleanedValue) !== -1) {
                this.visibleCheckboxIndexes.push(index);
            }
        });

        // show based on index
        this.visibleCheckboxIndexes.forEach((checkboxIndex: number) => {
            this.show(this.getItemSelectorElem(this.checkboxes[checkboxIndex], itemSelector));
        });

        // set screen reader text e.g. "12 found, 3 selected"
        if (updateScreenReaderText && this.srCount) {
            const found: number = this.visibleCheckboxIndexes.length;
            const foundText: string = this.options.srFoundText;
            const selected: number = this.checkedCheckboxIndexes.length;
            const selectedText: string = this.options.srSelectedText;
            this.srCount.textContent = `${found} ${foundText}, ${selected} ${selectedText}`;
        }

        // update cache with search value
        this.cache(CACHE_SEARCH_PROP, cleanedValue);
        this.updateCheckedStates();

        // trigger onFilter callback
        this.triggerOptionCallback('onFilter');
    }

    /**
     * filter checkbox list, and set input to show the value
     */
    filter(value: string, updateScreenReaderText?: boolean) {
        this.runFilter(value || '', updateScreenReaderText);
        // if search area exists, update value
        if (this.searchField) {
            this.searchField.value = this.cache(CACHE_SEARCH_PROP);
        }
    }

    /**
     * timer handling for list filtering
     */
    filterPrep(delayOverride?: number) {
        // throttle for fast typing
        const delay: number =
            typeof delayOverride === 'number'
                ? delayOverride
                : typeof this.options.filterDelay === 'number'
                ? this.options.filterDelay
                : 300;

        clearTimeout(this.filterTimeout);
        this.filterTimeout = setTimeout(() => {
            this.runFilter.call(this, this.searchField.value, true);
        }, delay);

        // only include escape to clear message if search field has a value
        const value = this.searchField.value;
        const describedBy = this.searchField.getAttribute('aria-describedby');
        if (value && !describedBy) {
            this.searchField.setAttribute('aria-describedby', this.ids.ESCAPE_TO_CLEAR);
        } else if (!value && describedBy) {
            this.searchField.removeAttribute('aria-describedby');
        }
    }

    /**
     * prepare to trigger filtering from keypresses
     */
    handleFilterKeyDown(event?: KeyboardEvent) {
        let delay: number;
        let shouldRun: boolean = isPrintableKeycode(event.keyCode);
        // trigger search immediately for enter and when clearing input using escape
        // also prevent form submissions on enter keypress
        if (event && event.keyCode === KEYS.ENTER) {
            delay = 0;
            shouldRun = true;
            event.preventDefault();
        }
        // on escape, clear input
        else if (event && event.keyCode === KEYS.ESCAPE) {
            delay = 0;
            shouldRun = true;
            event.preventDefault();
            event.stopPropagation();
            this.searchField.value = '';
        }
        // trigger filtering
        if (shouldRun) {
            this.filterPrep(delay);
        }
    }

    /**
     * get text used to label the list - used in toggle button and search label
     */
    getListLabel(): string {
        // start by checking the toggleButtonText option
        const storedButtonText: string = this.listLabel || this.options.listLabel;
        if (typeof storedButtonText === 'string') {
            return storedButtonText;
        }

        // check for aria-label, aria-labelledby, and label[for=]
        let listLabel: string = getLabelFor(this.list);

        // if no label now fieldset legend
        if (!listLabel && this.listFieldset) {
            const legend = this.listFieldset.querySelector('legend');
            listLabel = (legend && legend.textContent) || '';
        }

        // update the options property so that the user is aware of the value used and can update it
        // should we assume an asterisk is indicating required and remove it?
        this.listLabel = this.options.listLabel = trimString(listLabel);
        return this.listLabel;
    }

    /**
     * initial HTML structure generation
     */
    buildMarkup() {
        const newHtml: string[] = [];
        const cssNameSpace: string = this.cssNameSpace;
        const togglable: boolean = this.options.togglable;
        const srOnlyClasses: string = `${cssNameSpace}--sr-only visually-hidden sr-only`;
        const searchClass: string = this.options.filterClassName ? ` ${this.options.filterClassName}` : '';
        const toggleClass: string = this.options.toggleClassName ? ` ${this.options.toggleClassName}` : '';
        const listClass: string = this.options.listWrapperClassName ? ` ${this.options.listWrapperClassName}` : '';
        let wrapperClass: string = this.options.wrapperClassName ? ` ${this.options.wrapperClassName}` : '';

        // classes to add to component wrapper based on chosen options
        const wrapperClassPrefix = `${cssNameSpace}__wrapper`;
        if (this.options.togglable) {
            wrapperClass += ` ${wrapperClassPrefix}--togglable`;
        }
        if (this.options.autoClose) {
            wrapperClass += ` ${wrapperClassPrefix}--auto-close`;
        }
        if (this.options.filterable) {
            wrapperClass += ` ${wrapperClassPrefix}--filterable`;
        }
        if (this.options.selectAllControl) {
            wrapperClass += ` ${wrapperClassPrefix}--select-all`;
        }
        if (this.options.keyboardShortcuts) {
            wrapperClass += ` ${wrapperClassPrefix}--keyboard-shortcuts`;
        }

        newHtml.push(`<div id="${this.ids.WRAPPER}" class="${wrapperClassPrefix}${wrapperClass}">`);

        // if togglable, create button to toggle visibility
        // leave empty to begin with, as the text will be set later when checked counts are detected
        if (togglable) {
            newHtml.push(
                `<button aria-expanded="false" tabindex="${this.options.tabindex}" aria-controls="${this.ids.LIST_WRAPPER}" ` +
                    `class="${cssNameSpace}__toggle${toggleClass}" id="${this.ids.BUTTON}" type="button"></button>`
            );
        }

        // if no parent fieldset exists, and we have a listLabel, make the wrapper a grouping
        const listLabel = this.getListLabel();
        const grouping = listLabel && !this.listFieldset ? ` role="group" aria-label="${listLabel}"` : ``;

        // start the list wrapper element
        newHtml.push(
            `<div${grouping} class="${cssNameSpace}__list-wrapper${listClass}" ` +
                `id="${this.ids.LIST_WRAPPER}" aria-describedby="${this.ids.ESCAPE_TO_CLOSE}">`
        );

        // include screen reader element for announcement after filtering even if not filterable
        // in case filtering is triggered from the API
        newHtml.push(`<span class="${srOnlyClasses}" aria-live="polite" id="${this.ids.COUNT}"></span>`);

        // add descriptive text for escape to close
        if (togglable && this.options.keyboardShortcuts && this.options.srEscapeToCloseText) {
            newHtml.push(
                `<span class="${srOnlyClasses}" id="${this.ids.ESCAPE_TO_CLOSE}">` +
                    `${this.options.srEscapeToCloseText}</span>`
            );
        }

        // if filterable, create search control and screen reader area for search announcments
        if (this.options.filterable) {
            newHtml.push(
                `<div class="${cssNameSpace}__filter">` +
                    // hidden filtering label
                    `<label for="${this.ids.SEARCH}" class="${cssNameSpace}__filter-label ${srOnlyClasses}">${
                        this.options.srFilterText
                    } ${this.getListLabel()}</label>` +
                    // add the filtering input
                    `<input class="${cssNameSpace}__filter-input${searchClass}" value="" type="search" ` +
                    `id="${this.ids.SEARCH}" aria-controls="${this.ids.LIST}" />` +
                    // screen reader only explainer of esc to clear behaviour on the input
                    `<span class="${srOnlyClasses}" id="${this.ids.ESCAPE_TO_CLEAR}">${this.options.srEscapeToClearText}</span>` +
                    // close the filtering area
                    `</div>`
            );
        }

        // select all control
        if (this.options.selectAllControl) {
            newHtml.push(
                `<div class="${cssNameSpace}__select-all">` +
                    // generate the checkbox as a span, due to issues with
                    // updating indeterminate state on native checkboxes in some browsers
                    `<span class="${cssNameSpace}__select-all-checkbox" id="${this.ids.SELECT_ALL}" role="checkbox" ` +
                    `tabindex="${this.options.tabindex}" aria-labelledby="${this.ids.SELECT_ALL_LABEL}"></span>` +
                    // add the custom label as a span because it will not be associated with a form element
                    `<span class="${cssNameSpace}__select-all-label" id="${this.ids.SELECT_ALL_LABEL}">` +
                    `${this.options.selectAllText}</span></div>`
            );
        }

        // close the wrapper and insert into the dom;
        newHtml.push(`</div></div>`);
        this.list.insertAdjacentHTML('beforebegin', newHtml.join(''));

        // set element references
        this.srCount = document.getElementById(this.ids.COUNT) as HTMLSpanElement;
        this.button = document.getElementById(this.ids.BUTTON) as HTMLButtonElement;
        this.listWrapper = document.getElementById(this.ids.LIST_WRAPPER) as HTMLDivElement;
        this.componentWrapper = document.getElementById(this.ids.WRAPPER) as HTMLDivElement;
        this.searchField = document.getElementById(this.ids.SEARCH) as HTMLInputElement;
        this.selectAll = document.getElementById(this.ids.SELECT_ALL) as HTMLSpanElement;

        // move original list into the new wrapper
        this.listWrapper.appendChild(this.list);
        addClass(this.list, `${cssNameSpace}__list`);
    }

    /*
     * close the container when clicking outside of it
     */
    handleAutoClose(event: Event) {
        if (!this.options.togglable || !this.options.autoClose || !this.listWrapper) {
            this.unbindAutoClose();
            return;
        }
        // must use a timer, so that focusout event fires after focus has moved to a new element
        clearTimeout(this.autoCloseTimeout);
        this.autoCloseTimeout = setTimeout(() => {
            // do nothing if moving to an element that's part of the component
            const wrapper: HTMLElement = this.componentWrapper;
            const activeElem: Element = document.activeElement;
            const target: HTMLElement = event.target as HTMLElement;
            if ((event.type === 'click' && wrapper.contains(target)) || wrapper.contains(activeElem)) {
                return;
            }
            // hide and unbind document click, as it's not needed until re-opened
            this.hide.call(this);
            this.unbindAutoClose();
        }, 100);
    }

    /**
     * select or de-select all checkboxes recognised by the component
     */
    toggleAllVisibleCheckboxes(event?: Event | KeyboardEvent) {
        // if from click or keydown event, check disabled state of the selectAll
        const isClickOrKeydown = event && (event.type === 'click' || event.type == 'keydown');
        if (isClickOrKeydown && this.selectAll && this.selectAll.getAttribute('aria-disabled') === 'true') {
            return;
        }

        let toSet: boolean;
        // base the value to set on the selectAll checkbox state if we can
        if (this.selectAll) {
            toSet = this.selectAll.getAttribute('aria-checked') !== 'true';
        } else {
            // if we could not get current state from selectAll checkbox, check visible ones;
            // if any are not checked, we will set all to checked
            for (let i = 0, l = this.visibleCheckboxIndexes.length; i < l; i += 1) {
                const index = this.visibleCheckboxIndexes[i];
                if (this.checkboxes[index].checked === false) {
                    toSet = true;
                    break;
                }
            }
        }

        // ensure value to set is a boolean
        toSet = !!toSet;
        // set all and update other elements
        this.visibleCheckboxIndexes.forEach((visibleIndex: number) => {
            this.checkboxes[visibleIndex].checked = toSet;
        });
        this.updateCheckedStates();
    }

    /**
     * move focus to a new checkbox from the current one, based on the key used
     */
    moveFocusToCheckboxIndex(event: Event, current: HTMLElement | EventTarget, keyCode: number) {
        let index: number;
        const checkboxes: HTMLInputElement[] = this.checkboxes;
        const elem: HTMLInputElement = current as HTMLInputElement;
        if (!isCheckboxOrRadio(elem) || (index = checkboxes.indexOf(elem)) === -1) {
            return;
        }

        // get the index of the current checkbox within the currently visible checkboxes
        const visibleIndexes = this.visibleCheckboxIndexes;
        const visibleCount = visibleIndexes.length - 1;
        let idxToFocus = visibleIndexes.indexOf(index);

        // existence check
        if (idxToFocus === -1) {
            return;
        }

        // now prevent default behaviour
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }

        // handle modifier for moving focus
        switch (keyCode) {
            case KEYS.PAGE_DOWN:
                const downMod = this.options.pageDownModifier;
                idxToFocus += typeof downMod === 'number' ? downMod : 10;
                break;
            case KEYS.PAGE_UP:
                const upMod = this.options.pageUpModifier;
                idxToFocus += typeof upMod === 'number' ? upMod : -10;
                break;
            case KEYS.HOME:
                idxToFocus = 0;
                break;
            case KEYS.END:
                idxToFocus = visibleCount;
                break;
        }

        // handle going beyond first or last
        if (idxToFocus > visibleCount) {
            idxToFocus = visibleCount;
        } else if (idxToFocus < 0) {
            idxToFocus = 0;
        }

        const toFocus = checkboxes[visibleIndexes[idxToFocus]];
        if (toFocus && typeof toFocus.focus === 'function') {
            toFocus.focus();
        }
    }

    /**
     * keydown handling on the list wrapper
     */
    handleKeyDown(event: KeyboardEvent) {
        if (!this.options.keyboardShortcuts) {
            return;
        }

        const key: number = event.keyCode;
        if (key === KEYS.ESCAPE && this.options.togglable) {
            this.hide();
            if (this.button && this.button.focus) {
                this.button.focus();
            }
            return;
        }

        if (key === KEYS.PAGE_DOWN || key === KEYS.PAGE_UP || key === KEYS.HOME || key === KEYS.END) {
            this.moveFocusToCheckboxIndex(event, event.target, key);
        }
    }

    /*
     * bind toggling and searching behaviour
     */
    bindEvents() {
        // autoclosing - bind this regardless, and do the options check inside
        this.autoCloseEvent = this.handleAutoClose.bind(this);
        this.bindAutoClose();

        // update button text and count
        this.listChangeEvent = (event: Event) => {
            const target: HTMLInputElement = event.target as HTMLInputElement;
            if (target && target.nodeName === 'INPUT' && (target.type === 'checkbox' || target.type === 'radio')) {
                this.updateCheckedStates();
            }
        };
        this.list.addEventListener('change', this.listChangeEvent);

        // button toggling
        if (this.button) {
            this.buttonClickEvent = (event: Event) => {
                event.preventDefault();
                this.cache(CACHE_VISIBLE_PROP) ? this.hide() : this.show();
            };
            this.button.addEventListener('click', this.buttonClickEvent);
        }

        // bind search behaviour
        if (this.searchField) {
            this.searchFieldKeyDownEvent = this.handleFilterKeyDown.bind(this);
            this.searchFieldInputEvent = this.filterPrep.bind(this);
            this.searchField.addEventListener('keydown', this.searchFieldKeyDownEvent);
            // trigger filter on input event as well as keydown to cover bases
            // e.g. clearing the value using the clear icon in Internet Explorer
            this.searchField.addEventListener('input', this.searchFieldInputEvent);
        }

        // close the container when pressing escape key from anywhere inside it
        this.listWrapperKeyDownEvent = this.handleKeyDown.bind(this);
        this.listWrapper.addEventListener('keydown', this.listWrapperKeyDownEvent);

        // select all toggling
        if (this.selectAll) {
            // bind to parent so that clicks on the label are noticed too
            const selectAllWrapper: HTMLElement = this.selectAll.parentElement;
            this.selectAllClickEvent = this.toggleAllVisibleCheckboxes.bind(this);
            this.selectAllFocusInEvent = () => {
                const classes = `${this.cssNameSpace}__select-all-checkbox--focus focus focused`;
                addClass(this.selectAll, classes);
            };
            this.selectAllFocusOutEvent = () => {
                const classes = `${this.cssNameSpace}__select-all-checkbox--focus focus focused`;
                removeClass(this.selectAll, classes);
            };
            this.selectAllKeyDownEvent = (event: KeyboardEvent) => {
                // trigger using space key
                if (event.keyCode === 32) {
                    event.preventDefault();
                    this.toggleAllVisibleCheckboxes(event);
                }
            };
            selectAllWrapper.addEventListener('click', this.selectAllClickEvent);
            selectAllWrapper.addEventListener('focusin', this.selectAllFocusInEvent);
            selectAllWrapper.addEventListener('focusout', this.selectAllFocusOutEvent);
            selectAllWrapper.addEventListener('keydown', this.selectAllKeyDownEvent);
        }
    }

    /**
     * set important arrays of checkbox labels and visible indexes
     */
    setCheckboxArrays() {
        const checkboxes = this.list.querySelectorAll('input[type="checkbox"], input[type="radio"]');
        const selectAllExists = this.options.selectAllControl && this.selectAll;
        const hideClass = `${this.cssNameSpace}--hide`;
        this.checkboxes = Array.prototype.slice.call(checkboxes);

        this.visibleCheckboxIndexes = [];
        this.allCheckboxLabels = [];

        this.checkboxes.forEach((checkbox: HTMLInputElement, index: number) => {
            const checkboxLabel = getLabelFor(checkbox);
            // ensure all checkboxes have ids if using select all control
            if (selectAllExists && !checkbox.id) {
                checkbox.setAttribute('id', `${this.ids.LIST_WRAPPER}-checkbox-${index}`);
            }

            // clean and store labels
            const cleanedLabel = cleanString(checkboxLabel);
            this.allCheckboxLabels.push(cleanedLabel);

            // do a shallow visibility check for updating visible checkboxes array
            if (checkbox.getAttribute('hidden') !== 'hidden' && !hasClass(checkbox, hideClass)) {
                this.visibleCheckboxIndexes.push(index);
            }
        });
    }

    /*
     * undo markup structure and remove events
     */
    destroy(clearInternalCache: boolean = false) {
        // destroy method can be called if markup structure was already present
        // so we need to make sure the list wrapper exists, and check if the button toggle does
        if (!this.listWrapper) {
            this.listWrapper = this.list.parentElement as HTMLDivElement;
            if (!this.listWrapper.matches(`.${this.cssNameSpace}__list-wrapper`)) {
                return;
            }
            if (!this.button) {
                const possibleButton: Element = this.listWrapper.previousElementSibling;
                if (
                    possibleButton.nodeName === 'BUTTON' &&
                    possibleButton.matches(`.${this.cssNameSpace}__toggle`)
                ) {
                    this.button = possibleButton as HTMLButtonElement;
                }
            }
        }

        if (!this.componentWrapper) {
            this.componentWrapper = this.listWrapper.parentElement as HTMLDivElement;
            if (!this.componentWrapper.matches(`.${this.cssNameSpace}__wrapper`)) {
                return;
            }
        }

        // remove selectAll events
        if (this.selectAll) {
            const selectAllParent: HTMLElement = this.selectAll.parentElement;
            removeEvent(selectAllParent, 'click', this.selectAllClickEvent);
            removeEvent(selectAllParent, 'keydown', this.selectAllKeyDownEvent);
            removeEvent(selectAllParent, 'focusin', this.selectAllFocusInEvent);
            removeEvent(selectAllParent, 'focusout', this.selectAllFocusOutEvent);
        }

        // remove search events
        if (this.searchField) {
            removeEvent(this.searchField, 'input', this.searchFieldInputEvent);
            removeEvent(this.searchField, 'keydown', this.searchFieldKeyDownEvent);
        }

        // remove button toggle and events
        if (this.button) {
            removeEvent(this.button, 'click', this.buttonClickEvent);
            this.button.parentElement.removeChild(this.button);
        }

        // move the original list back into place
        if (this.list) {
            removeEvent(this.list, 'change', this.listChangeEvent);
            removeClass(this.list, `${this.cssNameSpace}__list`);
            this.componentWrapper.parentElement.insertBefore(this.list, this.componentWrapper);
            // delete instance from element
            if (this.list[API_STORAGE_PROP]) {
                delete this.list[API_STORAGE_PROP];
            }
        }

        // unbind auto-close if it is still bound
        this.unbindAutoClose();

        // remove the wrapper itself and its events
        removeEvent(this.listWrapper, 'keydown', this.listWrapperKeyDownEvent);
        this.componentWrapper.parentElement.removeChild(this.componentWrapper);

        // set all checkboxes back to being visible
        if (this.checkboxes && this.checkboxes.length) {
            const selector = this.options.itemSelector;
            this.checkboxes.forEach((checkbox: HTMLInputElement) => {
                this.show(this.getItemSelectorElem(checkbox, selector));
            });
        }

        // remove listWrapper storage in case of any lingering autoClose events
        this.listWrapper = null;

        // delete cached states
        if (clearInternalCache) {
            this.cache(true);
        }
    }

    /**
     * initialise component
     */
    init() {
        // if it seems that markup structure is already present, destroy and remake
        this.cssNameSpace = this.options.cssNameSpace;
        if (
            this.list.parentElement.matches(`.${this.cssNameSpace}__list-wrapper`) &&
            this.list.parentElement.parentElement.matches(`.${this.cssNameSpace}__wrapper`)
        ) {
            this.destroy();
        }

        // create html structure
        this.buildMarkup();

        // set core app variables
        this.setCheckboxArrays();

        // set starting states
        // use setListState directly so that the onShow or onHide callbacks are not triggered
        this.setListState();
        this.updateCheckedStates();

        // bind state updates
        this.bindEvents();

        // set up the API
        this.api = new EnhancedListApi(this);

        // fire onready
        this.triggerOptionCallback('onReady');

        // trigger a search immediately if a value is available in the cache
        if (this.options.filterable && this.cache() && typeof this.cache(CACHE_SEARCH_PROP) !== 'undefined') {
            this.filter(this.cache(CACHE_SEARCH_PROP));
        }
    }
}
