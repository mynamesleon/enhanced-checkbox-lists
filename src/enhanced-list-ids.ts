// ids used for DOM queries and accessibility attributes e.g. aria-controls
let index = 0;
export default class {
    LIST: string;
    PREFIX: string;
    COUNT: string;
    SEARCH: string;
    BUTTON: string;
    WRAPPER: string;
    SELECT_ALL: string;
    SELECT_ALL_LABEL: string;
    ESCAPE_TO_CLOSE: string;
    ESCAPE_TO_CLEAR: string;

    constructor(list: HTMLElement) {
        index += 1;
        const baseId = list.id;

        this.LIST = baseId;
        this.PREFIX = `${baseId || ''}enhanced-checkbox-list-${index}`;
        this.COUNT = `${this.PREFIX}-count`;
        this.SEARCH = `${this.PREFIX}-search`;
        this.BUTTON = `${this.PREFIX}-button`;
        this.WRAPPER = `${this.PREFIX}-wrapper`;
        this.SELECT_ALL = `${this.PREFIX}-select-all`;
        this.SELECT_ALL_LABEL = `${this.PREFIX}-select-all-label`;
        this.ESCAPE_TO_CLOSE = `${this.PREFIX}-escape-to-close`;
        this.ESCAPE_TO_CLEAR = `${this.PREFIX}-escape-to-clear`;

        // always have a listId for accessibility and caching state
        if (!this.LIST) {
            this.LIST = `${this.PREFIX}-list`;
            list.setAttribute('id', this.LIST);
        }
    }
}
