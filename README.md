# wsGrid

This project is a basic table/grid that can get it's data from a remote source.
It is intentionally using modern JavaScript features that do not work with older browsers.

## Features

* Optional header clicking to sort columns.
* Optional zebra striping.
* Optional cell/row click, double click events.
* Optional multi-selection of rows.
* Optional Frozen columns on the right and/or left.
* Optional Column resizing.
* Optional Column reordering.
* Does not require any third party libraries to use.
* It uses modern JavaScript technologies, so don't expect it to work in older browser.
* Is designed to be easily themed.
* Is designed to be used with WebSockets, but also to be used with other data sources.

This project takes some inspiration from jqGrid.

Because I'm using module import/export, you need to be using at least Chrome 60, or Firefox 54, and you must have experimental flags turned on.
