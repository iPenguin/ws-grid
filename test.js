/**
 * This file contains a test implementation of the wsGrid class.
 */
import {wsGrid} from './wsGrid.js';

let columns = [
    { name: 'id',         hidden: true,                                    },
    { name: 'first_name', label: 'First Name', width: 200, align: 'left'   },
    { name: 'last_name',  label: 'Last Name',  width: 200, align: 'left'   },
    { name: 'age',        label: 'Age',        width: 100, align: 'right'  },
    { name: 'height',     label: 'Height',     width: 100, align: 'center' },
];

let grid = new wsGrid( {
    id:           'grid',
    url:          'ws://localhost:8000',
    column_model: columns,
} );

grid.fill_grid( [
    { id: 1, first_name: 'John', last_name: 'Smith',   age: 28, height: '5\'10"' },
    { id: 2, first_name: 'Jane', last_name: 'Doe',     age: 26, height: '5\'6"' },
    { id: 3, first_name: 'Matt', last_name: 'Miller',  age: 45, height: '5\'9"' },
    { id: 4, first_name: 'Emma', last_name: 'Johnson', age: 48, height: '5\'3"' },
] );
