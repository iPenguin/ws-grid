/**
 * This file contains a test implementation of the wsGrid class.
 */
import {wsGrid} from './wsGrid.js';

function sort_height( a, b ) {

    return 1;
}

let columns = [
    { name: 'id',         hidden: true,                                    },
    { name: 'first_name', label: 'First Name', width: 200, align: 'left',   fixed: false, sort: 'string' },
    { name: 'last_name',  label: 'Last Name',  width: 200, align: 'left',   fixed: false, sort: 'string' },
    { name: 'age',        label: 'Age',        width: 100, align: 'right',  fixed: true,  sort: 'number' },
    { name: 'height',     label: 'Height',     width: 100, align: 'center', fixed: true,  sort: 'custom', sort_function: sort_height },
    { name: 'dob',        label: 'DOB',        width: 100, align: 'center', fixed: true,  sort: 'date',  },
];

let grid = new wsGrid( {
    id:           'grid',
    url:          'ws://localhost:8000',
    column_model: columns,
    height:       200,
    width:        1000,
    events:       {
        click( row, column_name, data ) {
            console.log( "click", row, column_name );
        },
        dblclick( row, column_name, data ) {
            console.log( "dbl click", row, column_name );
        }
    }
} );

grid.fill_grid( [
    { id: 1, first_name: 'John', last_name: 'Smith',   age: 28, height: '5\'10"', dob: '1985-10-21' },
    { id: 2, first_name: 'Jane', last_name: 'Doe',     age: 26, height: '5\'6"', dob: '1982-12-03' },
    { id: 3, first_name: 'Matt', last_name: 'Miller',  age: 45, height: '5\'9"', dob: '1990-04-07' },
    { id: 4, first_name: 'Emma', last_name: 'Johnson', age: 48, height: '5\'3"', dob: '1998-02-05' },
    { id: 11, first_name: 'John', last_name: 'Smith',   age: 28, height: '5\'10"', dob: '2001-04-30' },
    { id: 12, first_name: 'Jane', last_name: 'Doe',     age: 26, height: '5\'6"', dob: '2005-11-6' },
    { id: 13, first_name: 'Matt', last_name: 'Miller',  age: 45, height: '5\'9"', dob: '1985-10-21' },
    { id: 14, first_name: 'Emma', last_name: 'Johnson', age: 48, height: '5\'3"', dob: '1982-12-03' },
    { id: 21, first_name: 'John', last_name: 'Smith',   age: 1,  height: '5\'10"', dob: '1990-04-07' },
    { id: 22, first_name: 'Jane', last_name: 'Doe',     age: 10, height: '5\'6"', dob: '1998-02-05' },
    { id: 23, first_name: 'Matt', last_name: 'Miller',  age: 100, height: '5\'9"', dob: '2001-04-30' },
    { id: 24, first_name: 'Emma', last_name: 'Johnson', age: 48, height: '5\'3"', dob: '2005-11-6'  },
    { id: 31, first_name: 'John', last_name: 'Smith',   age: 28, height: '5\'10"', dob: '1985-10-21' },
    { id: 32, first_name: 'Jane', last_name: 'Doe',     age: 26, height: '5\'6"', dob: '1982-12-03' },
    { id: 33, first_name: 'Matt', last_name: 'Miller',  age: 45, height: '5\'9"', dob: '1990-04-07' },
    { id: 34, first_name: 'Emma', last_name: 'Johnson', age: 48, height: '5\'3"', dob: '1998-02-05' },
    { id: 111, first_name: 'John', last_name: 'Smith',   age: 28, height: '5\'10"', dob: '2001-04-30' },
    { id: 112, first_name: 'Jane', last_name: 'Doe',     age: 26, height: '5\'6"', dob: '2005-11-6'  },
    { id: 113, first_name: 'Matt', last_name: 'Miller',  age: 45, height: '5\'9"', dob: '1985-10-21' },
    { id: 114, first_name: 'Emma', last_name: 'Johnson', age: 48, height: '5\'3"', dob: '1982-12-03' },
    { id: 121, first_name: 'John', last_name: 'Smith',   age: 28, height: '5\'10"', dob: '1990-04-07' },
    { id: 122, first_name: 'Jane', last_name: 'Doe',     age: 26, height: '5\'6"', dob: '1998-02-05' },
    { id: 123, first_name: 'Matt', last_name: 'Miller',  age: 45, height: '5\'9"', dob: '2001-04-30' },
    { id: 124, first_name: 'Emma', last_name: 'Johnson', age: 48, height: '5\'3"', dob: '2005-11-6'  },
] );
