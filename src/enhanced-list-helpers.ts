// regex constants used for string cleaning
const REGEX_AMPERSAND: RegExp = /&/g;
const REGEX_DUPE_WHITESPACE: RegExp = /\s\s+/g;
const REGEX_TO_IGNORE: RegExp = /[\u2018\u2019',:\u2013-]/g;
const REGEX_MAKE_SAFE: RegExp = /[\-\[\]{}()*+?.,\\\^$|#\s]/g;

/**
 * element api storage
 */
export const API_STORAGE_PROP: string = 'enhancedCheckboxList';

/**
 * trim string helper for consistent response, and general handling
 */
export function trimString(theString: string): string {
    return theString == null ? '' : (theString + '').trim();
}

/**
 * clean string of some characters, and make safe for regex searching
 */
export function cleanString(theString: string, makeSafeForRegex = false): string {
    theString = trimString(theString)
        // case insensitive searching
        .toLowerCase()
        // ignore quotes, commas, colons, and hyphens
        .replace(REGEX_TO_IGNORE, '')
        // treat & and 'and' as the same
        .replace(REGEX_AMPERSAND, 'and')
        // ignore duplicate whitespace
        .replace(REGEX_DUPE_WHITESPACE, ' ');

    // make safe for regex searching
    if (makeSafeForRegex) {
        theString = theString.replace(REGEX_MAKE_SAFE, '\\$&');
    }
    return theString;
}

/**
 * get text from a possible element
 */
export function getElementText(element: HTMLElement): string {
    return element && element.nodeType === 1 ? trimString(element.textContent) : '';
}

export function getLabelFor(element: HTMLElement): string {
    // check for aria-label first, as it is a quick check
    let labelText: string = trimString(element.getAttribute('aria-label'));

    // now for DOM interrogation...
    // check for labelledby
    if (!labelText) {
        const labelledbyAttr: string = element.getAttribute('aria-labelledby');
        if (labelledbyAttr) {
            labelText = getElementText(document.getElementById(labelledbyAttr));
        }
    }

    // check if someone linked a label to the list
    if (!labelText && element.id) {
        labelText = getElementText(document.querySelector(`[for="${element.id}"]`));
    }

    // still nothing? also check for parent label
    if (!labelText) {
        labelText = getElementText(element.closest('label'));
    }

    // always return a string
    return labelText || '';
}

/**
 * check if an element is a checkbox or radio input
 */
export function isCheckboxOrRadio(element: HTMLElement | EventTarget): boolean {
    const e: HTMLInputElement = element as HTMLInputElement;
    return e && e.nodeType === 1 && e.nodeName === 'INPUT' && (e.type === 'checkbox' || e.type === 'radio');
}

/**
 * remove event listener helper
 */
export function removeEvent(
    element: HTMLElement,
    event: string,
    eventListener: EventListenerOrEventListenerObject
) {
    if (element && event && eventListener && element.removeEventListener) {
        element.removeEventListener(event, eventListener);
    }
}
