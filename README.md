# wsGrid

This project is a basic table/grid that gets it's data from a WebSocket connection.

## Features

This grid...

* does NOT rely on any third party libraries.
* it uses modern JavaScript technologies, so it isn't backwards compatible[1].
* is designed to be easily themed.
* is designed to be used with or without WebSockets.

This project takes some inspiration from jqGrid. Hopefully my API is a little cleaner and consistent. :)

[1] This project is a test bed for all sorts of new ECMAScript features, it should be stable, but it should also be cutting edge.

Some of the ECMAScript features that are used in this project are:

* block scoping (let)
* arrow function declarations
* const
* classes
* default parameters
* parameter context matching
* promises
* modules (import & export)

Because some of these features are new in browsers you must be using at least Chrome 60, or Firefox 54, and you must have experimental flags turned on for everything to work.
