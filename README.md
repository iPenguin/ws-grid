# wsGrid

This project is a basic table/grid that gets it's data from a WebSocket connection.

This project is also test bed for all sorts of new ECMAScript features.

Some of the ECMAScript features that are used in this project are:

block scoping (let)
arrow function declarations
const
classes
default parameters
parameter context matching
    function g ({ name: n, val: v }) {
        console.log(n, v)
    }
promises
module importing and exporting

Because these features are use you must be using at least Chrome 60, or Firefox 54, and you must have experimental flags turned on.
