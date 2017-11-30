/**
 * This file contains a test implementation of the wsGrid class.
 */
import {Grid} from './wsGrid.js';

let columns = [
    { name: 'id',         hidden: true,                                    },
    { name: 'first_name', label: 'First Name', width: 200, align: 'left',   fixed: false, type: 'text'   },
    { name: 'last_name',  label: 'Last Name',  width: 200, align: 'left',   fixed: false, type: 'text',   editable: true },
    { name: 'age',        label: 'Age',        width: 75, align: 'right',  fixed: true,  type: 'number', editable: true },
    { name: 'height',     label: 'Height',     width: 100, align: 'center', fixed: true,  type: 'text',   editable: true },
    { name: 'dob',        label: 'DOB',        width: 100, align: 'center', fixed: true,  type: 'text',   editable: true},
    { name: 'color',      label: 'Color',      width: 75, align: 'center', fixed: true,  type: 'color',  editable: true},
];

let grid = new Grid( {
    id:           'grid',
    url:          'ws://localhost:8000',
    column_model: columns,
    height:       300,
    width:        1200,
    events:       {
        click( row, column_name, data ) {
        },
    },
    connection: {
        type: 'Socket',
        url:  'ws://localhost:1337',
    }
} );

grid.set_totals_row( {
    first_name: 'This is a totals row',
    age:        '45',
} );

grid.display( [
    { id: 1, first_name: 'John', last_name: 'Smith',   age: 28, height: '5\'10"', dob: '1985-10-21', color: '#FFC0CB' },
    { id: 2, first_name: 'Jane', last_name: 'Doe',     age: 26, height: '5\'6"', dob: '1982-12-03', color: '#DB7093' },
    { id: 3, first_name: 'Matt', last_name: 'Miller',  age: 45, height: '5\'9"', dob: '1990-04-07', color: '#FA8072' },
    { id: 4, first_name: 'Emma', last_name: 'Johnson', age: 23, height: '5\'3"', dob: '1998-02-05', color: '#CD5C5C' },
    { id: 11, first_name: 'John', last_name: 'Smith',   age: 28, height: '5\'10"', dob: '2001-04-30', color: '#DC143C' },
    { id: 12, first_name: 'Jane', last_name: 'Doe',     age: 26, height: '5\'6"', dob: '2005-11-6', color: '#8B0000' },
    { id: 13, first_name: 'Matt', last_name: 'Miller',  age: 45, height: '5\'9"', dob: '1985-10-21', color: '#FF4500' },
    { id: 14, first_name: 'June', last_name: 'Johnson', age: 47, height: '5\'3"', dob: '1982-12-03', color: '#FF6347' },
    { id: 21, first_name: 'John', last_name: 'Smith',   age: 1,  height: '5\'10"', dob: '1990-04-07', color: '#FF8C00' },
    { id: 22, first_name: 'Jane', last_name: 'Doe',     age: 10, height: '5\'6"', dob: '1998-02-05', color: '#FFA500' },
    { id: 23, first_name: 'Matt', last_name: 'Miller',  age: 100, height: '5\'9"', dob: '2001-04-30', color: '#FFFFE0' },
    { id: 24, first_name: 'Jimmy', last_name: 'Johnson', age: 13, height: '5\'3"', dob: '2005-11-6', color: '#FFFACD'  },
    { id: 31, first_name: 'John', last_name: 'Smith',   age: 28, height: '5\'10"', dob: '1985-10-21', color: '#BDB76B' },
    { id: 32, first_name: 'Jane', last_name: 'Doe',     age: 26, height: '5\'6"', dob: '1982-12-03', color: '#FFD700' },
    { id: 33, first_name: 'Matt', last_name: 'Miller',  age: 45, height: '5\'9"', dob: '1990-04-07', color: '#FFDEAD' },
    { id: 34, first_name: 'Terri', last_name: 'Johnson', age: 89, height: '5\'3"', dob: '1998-02-05', color: '#D2B48C' },
    { id: 111, first_name: 'John', last_name: 'Smith',   age: 28, height: '5\'10"', dob: '2001-04-30', color: '#D2691E' },
    { id: 112, first_name: 'Jane', last_name: 'Doe',     age: 26, height: '5\'6"', dob: '2005-11-6', color: '#8B4513'  },
    { id: 113, first_name: 'Matt', last_name: 'Miller',  age: 45, height: '5\'9"', dob: '1985-10-21', color: '#A52A2A' },
    { id: 114, first_name: 'Beth', last_name: 'Johnson', age: 50, height: '5\'3"', dob: '1982-12-03', color: '#800000' },
    { id: 121, first_name: 'John', last_name: 'Smith',   age: 28, height: '5\'10"', dob: '1990-04-07', color: '#556B2F' },
    { id: 122, first_name: 'Jane', last_name: 'Doe',     age: 26, height: '5\'6"', dob: '1998-02-05', color: '#00FF00' },
    { id: 124, first_name: 'Beverly', last_name: 'Johnson', age: 62, height: '5\'3"', dob: '2005-11-6', color: '#228B22'  },
    { id: 123, first_name: 'Matt', last_name: 'Miller',  age: 45, height: '5\'9"', dob: '2001-04-30', color: '#006400' },
] );

let select = document.getElementById( 'filter_column' );
//Create a drop down to select the column to filter on.
columns.forEach( ( column ) => {
    let holder = document.createElement( 'div' );
    holder.innerHTML = `<option value="${column.name}">${column.label}</option>`;

    select.append( holder.firstChild );
} );

let filter = document.getElementById( 'filter' );
filter.onchange = () => {
    if( filter.value == '' ) {
        grid.filter( false );
    }
    else {
        grid.filter( [
            {
                field:    select.options[ select.selectedIndex ].value,
                type:     'string',
                operator: '==',
                test:     filter.value,
            }
        ] );
    }

};
