/**
 * This file contains a test implementation of the wsGrid class.
 */
import {Number_Utility} from './number_utility.js';
import {Grid} from './wsGrid.js';

let columns = [
    { name: 'id',         visible: false,                                    },
    { name: 'first_name', label: 'First Name', width: 200, align: 'left',   fixed: false, type: 'text',     editable: true                                          },
    { name: 'last_name',  label: 'Last Name',  width: 200, align: 'left',   fixed: false, type: 'text',     editable: false                                         },
    { name: 'age',        label: 'Age',        width: 75,  align: 'right',  fixed: true,  type: 'number',   editable: true                                          },
    { name: 'salary',     label: 'Salary',     width: 100, align: 'right',  fixed: true,  type: 'number',   editable: true, format: 'currency'                      },
    { name: 'employer',   label: 'Employer',   width: 175, align: 'left',   fixed: true,  type: 'text',     editable: true, visible: false                          },
    { name: 'division',   label: 'Division',   width: 175, align: 'left',   fixed: true,  type: 'text',     editable: true, visible: false                          },
    { name: 'height',     label: 'Height',     width: 75,  align: 'center', fixed: true,  type: 'text',     editable: true                                          },
    { name: 'dob',        label: 'DOB',        width: 100, align: 'center', fixed: true,  type: 'date',     editable: true                                          },
    { name: 'color',      label: 'Color',      width: 75,  align: 'center', fixed: true,  type: 'color',    editable: true                                          },
    { name: 'gender',     label: 'Gender',     width: 75,  align: 'left',   fixed: true,  type: 'dropdown', editable: true, options: { 'female': 'Female', 'male': 'Male' } },
    { name: 'selected',   label: 'Check',      width: 50,  align: 'center', fixed: true,  type: 'checkbox', editable: true, format: 'boolean'                       },
];

function employer_header( group_header, group_value, row_data ) {
    return `<h4 class="employee_header">${group_value}</h4>`;
}

function division_header( group_header, group_value, row_data ) {
    return `<h5 class="division_header">${group_value}</h5>`;
}

let grid = new Grid( {
    id:             'grid',
    url:            'ws://localhost:8000',
    overflow:       false,
    row_reorder:    true,
    column_reorder: true,
    column_model:   columns,
    multi_select:   true,
    grouping:       [
        { column: 'employer', sort_order: 'asc',  header: employer_header, footer: 'test'    },
        { column: 'division', sort_order: 'desc', header: division_header, footer: 'test 2'  },
        //{ column: 'division', sort_order: 'desc',                       },
    ],
    events:         {
        click( row, column_name, data ) {
        },
        load_complete( data ) {
            let average = 0;

            for( let row of data ) {
                average += row.age;
            }

            average = average / data.length;
            average = Number_Utility.with_precision( average );

            grid.set_totals_row( {
                first_name: 'Average:',
                age:        average,
            } );
        }
    },
    connection_options: {
        type: 'Socket',
        url:  'ws://localhost:1337',
    }
} );

grid.display( [
    { id: 1,   first_name: 'John',    last_name: 'Smith',   age: 28,  salary: '28000',  height: '5\'10"', dob: '1985-10-21', gender: 'male',    employer: 'Alphabet, LLC',       division: 'IT',                color: '#FFC0CB', selected: 1, },
    { id: 2,   first_name: 'Jane',    last_name: 'Doe',     age: 26,  salary: '90000',  height: '5\'6"',  dob: '1982-12-03', gender: 'female',  employer: 'Zebra & Co.',         division: 'Software Engineer', color: '#DB7093', selected: 0, },
    { id: 3,   first_name: 'Matt',    last_name: 'Miller',  age: 45,  salary: '103948', height: '5\'9"',  dob: '1990-04-07', gender: 'male',    employer: 'Shadowman, Inc.',     division: 'Management',        color: '#FA8072', selected: 1, },
    { id: 4,   first_name: 'Emma',    last_name: 'Johnson', age: 23,  salary: '75000',  height: '5\'3"',  dob: '1998-02-05', gender: 'female',  employer: 'White Flag',          division: 'Software Engineer', color: '#CD5C5C', selected: 0, },
    { id: 11,  first_name: 'John',    last_name: 'Smith',   age: 28,  salary: '60000',  height: '5\'10"', dob: '2001-04-30', gender: 'male',    employer: 'Zebra & Co.',         division: 'Management',        color: '#DC143C', selected: 0, },
    { id: 12,  first_name: 'Jane',    last_name: 'Doe',     age: 26,  salary: '62000',  height: '5\'6"',  dob: '2005-11-6',  gender: 'female',  employer: 'Alphabet, LLC',       division: 'IT',                color: '#8B0000', selected: 1, },
    { id: 13,  first_name: 'Matt',    last_name: 'Miller',  age: 45,  salary: '64023',  height: '5\'9"',  dob: '1985-10-21', gender: 'male',    employer: 'White Flag',          division: 'Software Engineer', color: '#FF4500', selected: 1, },
    { id: 14,  first_name: 'June',    last_name: 'Johnson', age: 47,  salary: '89234',  height: '5\'3"',  dob: '1982-12-03', gender: 'female',  employer: 'Alphabet, LLC',       division: 'Management',        color: '#FF6347', selected: 0, },
    { id: 21,  first_name: 'John',    last_name: 'Smith',   age: 1,   salary: '54322',  height: '5\'10"', dob: '1990-04-07', gender: 'male',    employer: 'Shadowman, Inc.',     division: 'IT',                color: '#FF8C00', selected: 0, },
    { id: 22,  first_name: 'Jane',    last_name: 'Doe',     age: 10,  salary: '87354',  height: '5\'6"',  dob: '1998-02-05', gender: 'female',  employer: 'Zebra & Co.',         division: 'Software Engineer', color: '#FFA500', selected: 0, },
    { id: 23,  first_name: 'Matt',    last_name: 'Miller',  age: 100, salary: '98374',  height: '5\'9"',  dob: '2001-04-30', gender: 'male',    employer: 'Alphabet, LLC',       division: 'IT',                color: '#FFFFE0', selected: 1, },
    { id: 24,  first_name: 'Jimmy',   last_name: 'Johnson', age: 13,  salary: '109743', height: '5\'3"',  dob: '2005-11-6',  gender: 'male',    employer: 'White Flag',          division: 'Management',        color: '#FFFACD', selected: 0, },
    { id: 31,  first_name: 'John',    last_name: 'Smith',   age: 28,  salary: '84947',  height: '5\'10"', dob: '1985-10-21', gender: 'male',    employer: 'Alphabet, LLC',       division: 'IT',                color: '#BDB76B', selected: 0, },
    { id: 32,  first_name: 'Jane',    last_name: 'Doe',     age: 26,  salary: '62538',  height: '5\'6"',  dob: '1982-12-03', gender: 'female',  employer: 'Alphabet, LLC',       division: 'Software Engineer', color: '#FFD700', selected: 1, },
    { id: 33,  first_name: 'Matt',    last_name: 'Miller',  age: 45,  salary: '53982',  height: '5\'9"',  dob: '1990-04-07', gender: 'male',    employer: 'Zebra & Co.',         division: 'Accountant',        color: '#FFDEAD', selected: 1, },
    { id: 34,  first_name: 'Terri',   last_name: 'Johnson', age: 89,  salary: '45000',  height: '5\'3"',  dob: '1998-02-05', gender: 'female',  employer: 'Alphabet, LLC',       division: 'Software Engineer', color: '#D2B48C', selected: 1, },
    { id: 111, first_name: 'John',    last_name: 'Smith',   age: 28,  salary: '40298',  height: '5\'10"', dob: '2001-04-30', gender: 'male',    employer: 'Somerset, Ltd.',      division: 'IT',                color: '#D2691E', selected: 1, },
    { id: 112, first_name: 'Jane',    last_name: 'Doe',     age: 26,  salary: '73876',  height: '5\'6"',  dob: '2005-11-6',  gender: 'female',  employer: 'Acme Co.',            division: 'Software Engineer', color: '#8B4513', selected: 0, },
    { id: 113, first_name: 'Matt',    last_name: 'Miller',  age: 45,  salary: '37000',  height: '5\'9"',  dob: '1985-10-21', gender: 'male',    employer: 'Custom Coders, Inc.', division: 'Accountant',        color: '#A52A2A', selected: 1, },
    { id: 114, first_name: 'Beth',    last_name: 'Johnson', age: 50,  salary: '36000',  height: '5\'3"',  dob: '1982-12-03', gender: 'female',  employer: 'Somerset, Ltd.',      division: 'Software Engineer', color: '#800000', selected: 1, },
    { id: 121, first_name: 'John',    last_name: 'Smith',   age: 28,  salary: '34000',  height: '5\'10"', dob: '1990-04-07', gender: 'male',    employer: 'White Flag',          division: 'Software Engineer', color: '#556B2F', selected: 0, },
    { id: 122, first_name: 'Jane',    last_name: 'Doe',     age: 26,  salary: '32000',  height: '5\'6"',  dob: '1998-02-05', gender: 'female',  employer: 'Zebra & Co.',         division: 'Software Engineer', color: '#00FF00', selected: 0, },
    { id: 124, first_name: 'Beverly', last_name: 'Johnson', age: 62,  salary: '30000',  height: '5\'3"',  dob: '2005-11-6',  gender: 'female',  employer: 'Shadowman, Inc.',     division: 'Accountant',        color: '#228B22', selected: 0, },
    { id: 123, first_name: 'Matt',    last_name: 'Miller',  age: 45,  salary: '27000',  height: '5\'9"',  dob: '2001-04-30', gender: 'male',    employer: 'Alphabet, LLC',       division: 'IT',                color: '#006400', selected: 1, },
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

let selection_button = document.getElementById( 'show-selection' );
selection_button.onclick = () => {
    let rows = grid.get_selected_rows();
    let text = '';

    for( let i = 0; i < rows.length; i++ ) {
        let fname = grid.cell_value( 'first_name', rows[ i ] );
        let lname = grid.cell_value( 'last_name', rows[ i ] );

        text += `${fname} ${lname}\n`;
    }

    if( rows.length == 0 ) {
        text += 'No selection';
    }
    alert( text );
};
