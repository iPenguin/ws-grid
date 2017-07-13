/**
 *
 *Options:
 * id:              - id of DOM element that will contain this grid.
 * height:          - height of grid. Set the height to an empty string to allow the grid to be the height of the data.
 * width:           - width of grid.
 * column_defaults: - Default values for all columns.
 * column_model:    - a list of options that will define how each column displays it's data.
 *    name              - String   - name of the column in the data.
 *    label             - String   - Label to put in the column header.
 *    width             - Number   - minimum width of the column.
 *    align             - String   - text alignment, left, right, center.
 *    fixed             - Boolean  - is the width of this column fixed?
 *    hidden            - Boolean  - is the field hidden?
 *    sort              - String   - what method to use when sorting this column, string, number, date, currency, custom,
 *    sort_function     - Function - when sort is set to custom this contains the function it will use to do sorting.
 *                                   the return value of this function should follow standard JavaScript sort functions.
 * events:        - an object containing functions as elements.
 *    click( row, column_name, row_data )
 *    dblclick( row, column_name, row_data )
 *    contextmenu( row, column_name, row_data )
 *    header_click( column_name )
 **/

const wsgrid_prefix = 'wsgrid_';
const wsgrid_header = `${wsgrid_prefix}_header`;
const wsgrid_table = `${wsgrid_prefix}_table`;
const wsgrid_body = `${wsgrid_prefix}_body`;
const wsgrid_column = `${wsgrid_prefix}_column`;
const wsgrid_row = `${wsgrid_prefix}_row`;

let column_defaults = {
    name:   '',
    label:  '',
    width:  100,
    align:  'left',
    fixed:  true,
    hidden: false,
    sort:   'string',
};

export class wsGrid {
    constructor( options ) {

        this._required_options( options, [
            'id', 'column_model', 'height', 'width',
        ] );

        let grid_defaults = {
            height: 200,
            width:  200,
            events: {},
        };

        //extend the default options with the user options
        let all_options = Object.assign( {}, grid_defaults, options );

        this._setup_object( all_options );

        this.grid_container = document.getElementById( this.id );

        this._parse_column_info();
        this.grid = this.generate_grid();

        let grid_body = this.grid.querySelector( `.${wsgrid_body}` );
        console.log( "grid_body", grid_body, wsgrid_body );
        // conect events.
        grid_body.addEventListener( 'click', ( event ) => { this.click.call( this, event ); } );
        grid_body.addEventListener( 'dblclick', ( event ) => { this.dblclick.call( this, event ); } );
        grid_body.addEventListener( 'contextmenu', ( event ) => { this.contextmenu.call( this, event ); } );

        let grid_header = this.grid.querySelector( `.${wsgrid_header}` );
        grid_header.addEventListener( 'click', ( event ) => { this.header_click.call( this, event ); } );
    }

    /**
     * Test options passed in against a list of required options.
     * @param  {Object} options  - An object of options
     * @param  {Array} required  - An array of options that are required.
     */
    _required_options( options, required ) {
        for( let i in required ) {
            let key = required[ i ];
            let value = options[ key ];
            if( typeof( value ) == 'undefined' ) {
                throw new Error( "wsGrid: missing required argument: " + key );
            }
        }
    }

    /**
     * assign all the options to the object so they can be used esle where in the object.
     * @param  {Object} options - An object of options to be assigned to this object.
     */
    _setup_object( options ) {
        for( let key in options ) {
            this[ key ] = options[ key ];
        }
    }

    /**
     * Parse information in the column model so we can do some calculations
     * for column width and other things.
     *
     * Rules for calculating column widths:
     *   1) fixed widths are always the same width. (fixed)
     *   2) all remaining columns are calculated as a percentage of the remaining space.
     *       That percentage is calculated from the default width of the column / the width of all flexable columns.
     */
    _parse_column_info() {
        let count = this.column_model.length;
        this.column_width_info = new Array( count );

        // fill in default values for all column properties so we always have something to work with.
        for( let i = 0; i < count; i++ ) {
            this.column_model[ i ] = Object.assign( {}, column_defaults, this.column_model[ i ] );
        }

        let grid_width = this.width; //this.grid.offsetWidth;
        let fixed_width = 0;
        let flex_width = 0;

        // loop through the columns and gather information about widths...
        for( let i = 0; i < count; i++ ) {
            let isHidden = this.column_model[ i ].hidden;
            if( isHidden ) {
                continue;
            }

            let isFixed = this.column_model[ i ].fixed;

            fixed_width += ( isFixed ? this.column_model[ i ].width : 0 );
            flex_width += ( isFixed ? 0 : this.column_model[ i ].width );
        }

        // calculate the widths of flexable columns.
        let remaining_width = grid_width - fixed_width;

        let column_widths = this.column_model.map( ( x ) => {
            if( x.fixed ) {
                return x.width;
            }

            let percent = x.width / flex_width;
            return Math.floor( remaining_width * percent );
        } );

        this.column_widths = column_widths;
    }

    /**
     * Generate the shell of the grid from scratch
     */
    generate_grid() {
        let column_count = this.column_model.length;

        let table_header = `<tr class="${wsgrid_header}_row">`;

        for( let i = 0; i < column_count; i++ ) {
            let isHidden = this.column_model[ i ].hidden;
            if( typeof( isHidden ) !== 'undefined' && isHidden == true ) {
                continue;
            }
            let column_name = this.column_model[ i ].name;
            table_header += `<th class="${wsgrid_header}_column ${wsgrid_header}_column_${column_name}" `
                + `style="width:${this.column_widths[ i ]}px;`
                + `text-align:${this.column_model[ i ].align};">`
                + this.column_model[ i ].label
                + '</th>';
        }
        table_header += '</tr>';

        let html = `<table class="${wsgrid_table} ${wsgrid_table}_${this.id}">`
            + `<thead class="${wsgrid_header}">${table_header}</thead>`
            + `<tbody class="${wsgrid_body}" style="height:${this.height}px;"></tbody>`
            + '</table>';

        this.grid_container.innerHTML = html;

        return document.querySelector( `table.${wsgrid_table}_${this.id}` );
    }

    /**
     * fill the grid with the given data.
     * @param  {Array} data - Array of objects containing data in the form key: value
     */
    fill_grid( data ) {
        let table_body = document.querySelector( `table.${wsgrid_table}_${this.id} .${wsgrid_body}` );

        table_body.innerHTML = '';

        if( typeof( data ) != 'undefined' ) {
            this.data = data;
        }

        let rowHtml = '';
        let count = this.data.length;
        for( let i = 0; i < count; i++ ) {
            let classes = `${wsgrid_row} ${wsgrid_row}_id_${i}`;

            if( i % 2 == 0 ) {
                classes += ` ${wsgrid_row}_even `;
            }
            else {
                classes += ` ${wsgrid_row}_odd `;
            }

            rowHtml += '<tr class="' + classes + '">';
            let col_count = this.column_model.length;
            for( let j = 0; j < col_count; j++ ) {
                let isHidden = this.column_model[ j ].hidden;

                if( typeof( isHidden ) !== 'undefined' && isHidden == true ) {
                    continue;
                }
                let column_name =  this.column_model[ j ].name;
                rowHtml += `<td class="${wsgrid_column}_${column_name}"`
                    + `style="width:${this.column_widths[j]}px;`
                    + `text-align:${this.column_model[ j ].align};">`
                    + this.data[ i ][ column_name ]
                    + '</td>';
            }
            rowHtml += '</tr>';
        }

        table_body.innerHTML = rowHtml;
    }

    /***********************************************************************************
     * Event handlers:
     *
     *   The events below can have custom event handlers passed in by the user.
     ***********************************************************************************/

    click( event ) {
        let classList = event.target.classList;
        let column_name = '';
        let row = 0;

        // get the column name
        classList.forEach( ( c ) => {
            if( c.startsWith( `${wsgrid_column}_` ) ) {
                column_name = c.replace( `${wsgrid_column}_`, '' );
            }
        } );

        // get the row
        let row_element = event.target.closest( `.${wsgrid_row}` );
        row_element.classList.forEach( ( c ) => {
            if( c.startsWith( `${wsgrid_row}_id_` ) ) {
                row = c.replace( `${wsgrid_row}_id_`, '' );
            }
        } );

        // only call the user defined function if it exists.
        if( typeof( this.events.click ) == 'function' ) {
            this.events.click( row, column_name, this.data[ row ] );
        }
    }

    dblclick( event ) {
        let classList = event.target.classList;
        let column_name = '';
        let row = 0;

        // get the column name
        classList.forEach( ( c ) => {
            if( c.startsWith( wsgrid_column ) ) {
                column_name = c.replace( `${wsgrid_column}_`, '' );
            }
        } );

        // get the row
        let row_element = event.target.closest( `.${wsgrid_row}` );
        row_element.classList.forEach( ( c ) => {
            if( c.startsWith( `${wsgrid_row}_id_` ) ) {
                row = c.replace( `${wsgrid_row}_id_`, '' );
            }
        } );

        // only call the user defined function if it exists.
        if( typeof( this.events.dblclick ) == 'function' ) {
            this.events.dblclick( row, column_name, this.data[ row ] );
        }
    }

    contextmenu( event ) {
        let classList = event.target.classList;
        let column_name = '';
        let row = 0;

        // get the column name
        classList.forEach( ( c ) => {
            if( c.startsWith( wsgrid_column ) ) {
                column_name = c.replace( `${wsgrid_column}_`, '' );
            }
        } );

        // get the row
        let row_element = event.target.closest( `.${wsgrid_row}` );
        row_element.classList.forEach( ( c ) => {
            if( c.startsWith( `${wsgrid_row}_id_` ) ) {
                row = c.replace( `${wsgrid_row}_id_`, '' );
            }
        } );

        // only call the user defined function if it exists.
        if( typeof( this.events.contextmenu ) == 'function' ) {
            this.events.contextmenu( row, column_name, this.data[ row ] );
        }
    }

    header_click( event ) {
        let classList = event.target.classList;
        let column_name = '';

        // get the column name
        classList.forEach( ( c ) => {
            if( c.startsWith( `${wsgrid_header}_column_` ) ) {
                column_name = c.replace( `${wsgrid_header}_column_`, '' );
            }
        } );

        // only call the user defined function if it exists.
        if( typeof( this.events.header_click ) == 'function' ) {
            this.events.header_click( column_name );
        }
        else {

            this.data.sort( ( a, b ) => {
                return this._basic_sorting( column_name, a, b );
            } );

            this.fill_grid();
        }
    }

    _basic_sorting( column_name, a, b ) {
        if( a[ column_name ] > b[ column_name ] ) {
            return 1;
        }
        else {
            return -1;
        }
    }
};
