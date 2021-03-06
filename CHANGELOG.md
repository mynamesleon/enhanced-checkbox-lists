# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0]

### Added

-   `toggleButtonText` option that accepts either a string or a function
-   new `update` method in the API, to refetch checkboxes, and update the toggle button text and select all state, for if the selected checkboxes have been changed by external code
-   `checkboxSelector` option

### Changed

-   The `srEscapeToClearText` is now only associated with the filter input when the input has a value
-   Destroy method is now more defensive

### Fixed

-   Issue with the `autoClose` behaviour which wasn't always working when blurring off of the component
-   Issue with the `autoClose` click and focusout events persisting if a list is removed from the DOM (but not properly destroyed) and another autoClose list with the same ID is later added and initialised

[1.1.0]: https://github.com/mynamesleon/enhanced-checkbox-lists/compare/v1.0.0...v1.1.0
