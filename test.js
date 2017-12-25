/**
 * This file contains a test implementation of the wsGrid class.
 */
import {Grid} from './wsGrid.js';

let columns = [
    { name: 'id',         visible: false,                                    },
    { name: 'first_name', label: 'First Name', width: 200, align: 'left',   fixed: false, type: 'text',     editable: true },
    { name: 'last_name',  label: 'Last Name',  width: 200, align: 'left',   fixed: false, type: 'text',     editable: false },
    { name: 'age',        label: 'Age',        width: 75,  align: 'right',  fixed: true,  type: 'number',   editable: true },
    { name: 'salary',     label: 'Salary',     width: 75,  align: 'right',  fixed: true,  type: 'number',   editable: true, format: 'currency' },
    { name: 'height',     label: 'Height',     width: 100, align: 'center', fixed: true,  type: 'text',     editable: true },
    { name: 'dob',        label: 'DOB',        width: 100, align: 'center', fixed: true,  type: 'date',     editable: true },
    { name: 'color',      label: 'Color',      width: 75,  align: 'center', fixed: true,  type: 'color',    editable: true },
    { name: 'selected',   label: 'Check',      width: 50,  align: 'center', fixed: true,  type: 'checkbox', editable: true, format: 'boolean' },
];

let grid = new Grid( {
    id:             'grid',
    url:            'ws://localhost:8000',
    overflow:       false,
    row_reorder:    true,
    column_reorder: true,
    column_model:   columns,
    multi_select:   true,
    events:         {
        click( row, column_name, data ) {
        },
    },
    connection_options: {
        type: 'Socket',
        url:  'ws://localhost:1337',
    }
} );

grid.set_totals_row( {
    first_name: 'This is a totals row',
    age:        '45',
} );

grid.display( [
    { id: 1,   first_name: 'John',    last_name: 'Smith',   age: 28,  salary: '28000',  height: '5\'10"', dob: '1985-10-21', color: '#FFC0CB', selected: 1, },
    { id: 2,   first_name: 'Jane',    last_name: 'Doe',     age: 26,  salary: '90000',  height: '5\'6"',  dob: '1982-12-03', color: '#DB7093', selected: 1, },
    { id: 3,   first_name: 'Matt',    last_name: 'Miller',  age: 45,  salary: '103948', height: '5\'9"',  dob: '1990-04-07', color: '#FA8072', selected: 1, },
    { id: 4,   first_name: 'Emma',    last_name: 'Johnson', age: 23,  salary: '75000',  height: '5\'3"',  dob: '1998-02-05', color: '#CD5C5C', selected: 1, },
    { id: 11,  first_name: 'John',    last_name: 'Smith',   age: 28,  salary: '60000',  height: '5\'10"', dob: '2001-04-30', color: '#DC143C', selected: 1, },
    { id: 12,  first_name: 'Jane',    last_name: 'Doe',     age: 26,  salary: '62000',  height: '5\'6"',  dob: '2005-11-6',  color: '#8B0000', selected: 1, },
    { id: 13,  first_name: 'Matt',    last_name: 'Miller',  age: 45,  salary: '64023',  height: '5\'9"',  dob: '1985-10-21', color: '#FF4500', selected: 1, },
    { id: 14,  first_name: 'June',    last_name: 'Johnson', age: 47,  salary: '89234',  height: '5\'3"',  dob: '1982-12-03', color: '#FF6347', selected: 1, },
    { id: 21,  first_name: 'John',    last_name: 'Smith',   age: 1,   salary: '54322',  height: '5\'10"', dob: '1990-04-07', color: '#FF8C00', selected: 1, },
    { id: 22,  first_name: 'Jane',    last_name: 'Doe',     age: 10,  salary: '87354',  height: '5\'6"',  dob: '1998-02-05', color: '#FFA500', selected: 1, },
    { id: 23,  first_name: 'Matt',    last_name: 'Miller',  age: 100, salary: '98374',  height: '5\'9"',  dob: '2001-04-30', color: '#FFFFE0', selected: 1, },
    { id: 24,  first_name: 'Jimmy',   last_name: 'Johnson', age: 13,  salary: '109743', height: '5\'3"',  dob: '2005-11-6',  color: '#FFFACD', selected: 1, },
    { id: 31,  first_name: 'John',    last_name: 'Smith',   age: 28,  salary: '84947',  height: '5\'10"', dob: '1985-10-21', color: '#BDB76B', selected: 1, },
    { id: 32,  first_name: 'Jane',    last_name: 'Doe',     age: 26,  salary: '62538',  height: '5\'6"',  dob: '1982-12-03', color: '#FFD700', selected: 1, },
    { id: 33,  first_name: 'Matt',    last_name: 'Miller',  age: 45,  salary: '53982',  height: '5\'9"',  dob: '1990-04-07', color: '#FFDEAD', selected: 1, },
    { id: 34,  first_name: 'Terri',   last_name: 'Johnson', age: 89,  salary: '45000',  height: '5\'3"',  dob: '1998-02-05', color: '#D2B48C', selected: 1, },
    { id: 111, first_name: 'John',    last_name: 'Smith',   age: 28,  salary: '40298',  height: '5\'10"', dob: '2001-04-30', color: '#D2691E', selected: 1, },
    { id: 112, first_name: 'Jane',    last_name: 'Doe',     age: 26,  salary: '73876',  height: '5\'6"',  dob: '2005-11-6',  color: '#8B4513', selected: 1, },
    { id: 113, first_name: 'Matt',    last_name: 'Miller',  age: 45,  salary: '37000',  height: '5\'9"',  dob: '1985-10-21', color: '#A52A2A', selected: 1, },
    { id: 114, first_name: 'Beth',    last_name: 'Johnson', age: 50,  salary: '36000',  height: '5\'3"',  dob: '1982-12-03', color: '#800000', selected: 1, },
    { id: 121, first_name: 'John',    last_name: 'Smith',   age: 28,  salary: '34000',  height: '5\'10"', dob: '1990-04-07', color: '#556B2F', selected: 1, },
    { id: 122, first_name: 'Jane',    last_name: 'Doe',     age: 26,  salary: '32000',  height: '5\'6"',  dob: '1998-02-05', color: '#00FF00', selected: 1, },
    { id: 124, first_name: 'Beverly', last_name: 'Johnson', age: 62,  salary: '30000',  height: '5\'3"',  dob: '2005-11-6',  color: '#228B22', selected: 1, },
    { id: 123, first_name: 'Matt',    last_name: 'Miller',  age: 45,  salary: '27000',  height: '5\'9"',  dob: '2001-04-30', color: '#006400', selected: 1, },
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

let button = document.getElementById( 'toggle-first-name' );
button.onclick = () => {
    grid.toggle_column( 'first_name' );
};
