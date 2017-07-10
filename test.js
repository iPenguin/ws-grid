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
    height:       200,
    width:        750,
} );

grid.fill_grid( [
    { id: 1, first_name: 'John', last_name: 'Smith',   age: 28, height: '5\'10"' },
    { id: 2, first_name: 'Jane', last_name: 'Doe',     age: 26, height: '5\'6"' },
    { id: 3, first_name: 'Matt', last_name: 'Miller',  age: 45, height: '5\'9"' },
    { id: 4, first_name: 'Emma', last_name: 'Johnson', age: 48, height: '5\'3"' },
    { id: 11, first_name: 'John', last_name: 'Smith',   age: 28, height: '5\'10"' },
    { id: 12, first_name: 'Jane', last_name: 'Doe',     age: 26, height: '5\'6"' },
    { id: 13, first_name: 'Matt', last_name: 'Miller',  age: 45, height: '5\'9"' },
    { id: 14, first_name: 'Emma', last_name: 'Johnson', age: 48, height: '5\'3"' },
    { id: 21, first_name: 'John', last_name: 'Smith',   age: 28, height: '5\'10"' },
    { id: 22, first_name: 'Jane', last_name: 'Doe',     age: 26, height: '5\'6"' },
    { id: 23, first_name: 'Matt', last_name: 'Miller',  age: 45, height: '5\'9"' },
    { id: 24, first_name: 'Emma', last_name: 'Johnson', age: 48, height: '5\'3"' },
    { id: 31, first_name: 'John', last_name: 'Smith',   age: 28, height: '5\'10"' },
    { id: 32, first_name: 'Jane', last_name: 'Doe',     age: 26, height: '5\'6"' },
    { id: 33, first_name: 'Matt', last_name: 'Miller',  age: 45, height: '5\'9"' },
    { id: 34, first_name: 'Emma', last_name: 'Johnson', age: 48, height: '5\'3"' },
    { id: 111, first_name: 'John', last_name: 'Smith',   age: 28, height: '5\'10"' },
    { id: 112, first_name: 'Jane', last_name: 'Doe',     age: 26, height: '5\'6"' },
    { id: 113, first_name: 'Matt', last_name: 'Miller',  age: 45, height: '5\'9"' },
    { id: 114, first_name: 'Emma', last_name: 'Johnson', age: 48, height: '5\'3"' },
    { id: 121, first_name: 'John', last_name: 'Smith',   age: 28, height: '5\'10"' },
    { id: 122, first_name: 'Jane', last_name: 'Doe',     age: 26, height: '5\'6"' },
    { id: 123, first_name: 'Matt', last_name: 'Miller',  age: 45, height: '5\'9"' },
    { id: 124, first_name: 'Emma', last_name: 'Johnson', age: 48, height: '5\'3"' },
] );
