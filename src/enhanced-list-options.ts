export default class EnhancedListOptions {
    /**
     * generate an input to allow filtering the list
     */
    filterable: boolean = true;

    /**
     * delay after typing in the filter input before filtering (to allow for fast typers)
     */
    filterDelay: number = 300;

    /**
     * selector above checkbox to determine which element to show/hide after filtering
     */
    itemSelector: string = `li`;

    /**
     * allow toggling visibility by generate a toggle button
     */
    togglable: boolean = true;

    /**
     * if togglable, close when clicking or blurring outside of the container/button
     */
    autoClose: boolean = false;

    /**
     * if togglable, determines initial visibility
     */
    visible: boolean = false;

    /**
     * text to use for the toggle button
     */
    toggleButtonText: string | ((listLabel: string, checkedCount: number) => string);

    /**
     * include a custom select all control;
     * this has to be a custom element due to issues with updating
     * the indeterminate state on native checkboxes in many browsers
     */
    selectAllControl: boolean = true;

    /**
     * text for select all control
     */
    selectAllText: string = `Select all`;

    /**
     * if keyboard focus is on a checkbox, allow: home, end, pageup, and pagedown shortcuts
     * to move to first, last, -10, or +10 checkbox respectively;
     * and escape key to close the wrapper if togglable
     */
    keyboardShortcuts: boolean = true;

    /**
     * the index modifier for the pageup shortcut,
     * e.g. if on the 15th checkbox, use pageup to go to the 5th
     */
    pageUpModifier: number = -10;

    /**
     * the index modifier for the pagedown shortcut,
     * e.g. if on the 5th checkbox, use pagedown to go to the 15th
     */
    pageDownModifier: number = 10;

    /**
     * selector to use when finding the checkboxes in the list
     */
    checkboxSelector: string = `input[type="checkbox"], input[type="radio"]`;

    /**
     * control the tabindex added to custom elements generated by the module
     * in case your checkbox list sits at a certain point in the page's tabbing order
     */
    tabindex: number | string = `0`;

    /**
     * string to prepend to classes for BEM naming
     * e.g. enhanced-checkbox-list__wrapper
     */
    cssNameSpace: string = `enhanced-checkbox-list`;

    /**
     * custom class name to add to the component wrapper
     */
    wrapperClassName: string;

    /**
     * custom class name to add to the toggle button
     */
    toggleClassName: string;

    /**
     * custom class name to add to the filter text input
     */
    filterClassName: string;

    /**
     * custom class name to add to the list wrapper
     */
    listWrapperClassName: string;

    /**
     * label for the checkbox list - used for the toggle button text and
     * the label for the filter input; if not provided, the module will search for one
     * using aria-label or aria-labelledby attributes, or looking for a parent fieldset's legend
     */
    listLabel: string;

    /**
     * screen reader text added to list wrapper advising shortcut to close the wrapper
     * (if toggling enabled)
     */
    srEscapeToCloseText: string = `Esc to close`;

    /**
     * screen reader text added to filter field advising shortcut to clear filter value
     * (if filtering enabled)
     */
    srEscapeToClearText: string = `Esc to clear`;

    /**
     * screen reader text used for label explaining the search/filter input;
     * combines with listLabel if available e.g. "filter departments"
     */
    srFilterText: string = `filter`;

    /**
     * partial screen reader text used in message after filtering e.g. "12 found, 3 selected"
     */
    srFoundText: string = `found`;

    /**
     * partial screen reader text used in message after filtering e.g. "12 found, 3 selected"
     */
    srSelectedText: string = `selected`;

    /**
     * callback after a filter has run
     */
    onFilter: () => void;

    /**
     * callback once ready
     */
    onReady: () => void;

    /**
     * callback when the list is toggled visible
     */
    onShow: () => void;

    /**
     * callback when the list is toggled hidden
     */
    onHide: () => void;

    constructor(options: any = {}) {
        for (const i in options) {
            if (options.hasOwnProperty(i) && typeof options[i] !== 'undefined') {
                this[i] = options[i];
            }
        }
    }
}
