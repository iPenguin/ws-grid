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
 *    header_click( column_name )
 * filters:
 *
 * connection:
 *     type              - String  - Type of connection used: 'Ajax' or 'Socket'.
 *     url               - String  - URL used to connect to the server.
 *                                   examples: '/api/grid/data', 'wss://example.com/api/grid/data'
 * Editing Events:
 *    before_inline_opened( row, column_name, value, row_data ) - return '' to prevent a dialog opening.
 *    before_inline_closed( row, column_name, value, row_data ) - can prevent the editor from closing and loosing focus.
 *    before_inline_submitted( row, column_name, value, row_data )  - can manipulate the data before it's saved to the local data model.
 *
 **/

import { Object_Base } from './object_base.js';
import { CreateConnection } from './connection.js';
import { Socket } from './socket.js';
import { Ajax } from './ajax.js';

const wsgrid_prefix = 'wsgrid_';
const wsgrid_header = `${wsgrid_prefix}_header`;
const wsgrid_table  = `${wsgrid_prefix}_table`;
const wsgrid_body   = `${wsgrid_prefix}_body`;
const wsgrid_row    = `${wsgrid_prefix}_row`;
const wsgrid_column = `${wsgrid_prefix}_column`;
const wsgrid_cell   = `${wsgrid_prefix}_cell`;
const wsgrid_editor = `${wsgrid_prefix}_editor`;
const wsgrid_totals = `${wsgrid_prefix}_totals`;
const wsgrid_data   = `${wsgrid_prefix}_data`;

let column_defaults = {
    name:     '',
    label:    '',
    width:    100,
    align:    'left',
    fixed:    true,
    hidden:   false,
    sort:     'text',
    editable: false,
    format:   ( value ) => {
        return value;
    }
};

/**
 * Convert HTML entities into encoded elements that can be displayed on the page.
 * @param  {String} string - String we are parsing
 * @return {String}        - New string with the HTML elements converted.
 */
function convert_html_entities( string ) {
    let tags_to_replace = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
    };
    return string.replace( /[&<>\"]/g, ( tag ) => {
        return tags_to_replace[tag] || tag;
    } );
};

export class Grid extends Object_Base {
    constructor( options ) {
        super( options );

        this._required_options( options, [
            'id', 'column_model', 'height', 'width',
        ] );

        let grid_defaults = {
            height:          200,
            width:           200,
            events:          {},
            filters:         [],
            overflow:        false,
            connection: {
                type:    'Socket',
                url:     '',
                options: {},
            }
        };

        //extend the default options with the user options
        let all_options = Object.assign( {}, grid_defaults, options );

        this._setup_object( all_options );

        this.connection = CreateConnection.create_connection( this.connection );
        this.grid_container = document.getElementById( this.id );

        this._parse_column_info();
        this.grid = this.generate_grid();
        this.is_filtered = false;

        this.sort_direction = 'asc';

        let grid_body = this.grid.querySelector( `.${wsgrid_body}` );

        // conect events.
        grid_body.addEventListener( 'click', ( event ) => { this.click.call( this, event ); } );
        grid_body.addEventListener( 'dblclick', ( event ) => { this.dblclick.call( this, event ); } );
        grid_body.addEventListener( 'load_complete', ( event ) => { this.load_complete.call( this, event ); } );
        grid_body.addEventListener( `${wsgrid_data}.cell_change`, ( event ) => { this.data_changed.call( this, event ); } );

        let grid_header = this.grid.querySelector( `.${wsgrid_header}` );
        grid_header.addEventListener( 'click', ( event ) => { this.header_click.call( this, event ); } );
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

        this.column_types = {};
        this.column_hidden = {};

        this.data = [];
        this.totals_data = undefined;

        // loop through the columns and gather information about widths...
        for( let i = 0; i < count; i++ ) {
            // fill in any missing default values.
            this.column_model[ i ] = Object.assign( {}, column_defaults, this.column_model[ i ] );

            // Create a quick lookup table for column type/format, so we know how to sort data
            this.column_types[ this.column_model[ i ].name ] = this.column_model[ i ].type;

            // Quick lookup and session storage for the column's state.
            this.column_hidden[ this.column_model[ i ].name ] = this.column_model[ i ].hidden;
        }

        this._calculate_columns();

        // Make sure the element the user wants is actually in the DOM, if not throw an error the user can figure out.
        let gridElement = document.getElementById( this.id );
        if( gridElement == null ) {
            throw new Error( `Could not find grid element. Is ${this.id} an element in the DOM?` );
        }
    }

    _calculate_columns() {
        let count = this.column_model.length;

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

        if( this.overflow ) {
            this.min_column_width = fixed_width + flex_width;
        }
        else {
            this.min_column_width = 0;
        }
    }

    /**
     * Generate the shell of the grid from scratch
     */
    generate_grid() {
        let column_count = this.column_model.length;

        let table_header = `<tr class="${wsgrid_header}_row" style="min-width:${this.min_column_width}px">`;

        table_header += this._generate_column_headers( '' );
        table_header += '</tr>';

        let html = `<table class="${wsgrid_table} ${wsgrid_table}_${this.id}">`
            + `<thead class="${wsgrid_header} ${wsgrid_header}_${this.id}">${table_header}</thead>`
            + `<tbody class="${wsgrid_body} ${wsgrid_body}_${this.id}" style="height:${this.height}px;`
            + `width:${this.width + 42 }px"></tbody>`
            + '</table>';

        this.grid_container.innerHTML = html;

        return document.querySelector( `table.${wsgrid_table}_${this.id}` );
    }

    /**
     * fill the grid with the given data and generate a table for display.
     * @param  {Array} data - Array of objects containing data in the form key: value
     */
    display( data ) {

        if( typeof( data ) != 'undefined' ) {
            this.data = data;
        }

        this._generate_rows();
    }

    /**
     * Generate the table rows using the internal data array
     */
    _generate_rows() {
        // this tables body.
        let table_body = document.querySelector( `table.${wsgrid_table}_${this.id} .${wsgrid_body}` );
        table_body.innerHTML = '';

        if( typeof( this.events.data_loaded ) == 'function' ) {
            this.events.data_loaded( this.data );
        }

        let row_html = '';
        let count = this.data.length;

        let zebra = 0;

        for( let i = 0; i < count; i++ ) {

            if( this._is_selected( i ) == false ) {
                continue;
            }

            let classes = `${wsgrid_row} ${wsgrid_row}_id_${i}`;

            if( zebra % 2 == 0 ) {
                classes += ` ${wsgrid_row}_even `;
            }
            else {
                classes += ` ${wsgrid_row}_odd `;
            }
            zebra++;

            row_html += this._generate_row( this.data[ i ], classes, i );
        }

        row_html += this._generate_totals_row();

        table_body.innerHTML = row_html;

        let event = document.createEvent( 'HTMLEvents' );
        event.initEvent( 'load_complete', true, true );
        this.grid.dispatchEvent( event );
    }

    /**
     * Generate the html for the given row of data.
     */
    _generate_row( data, classes, record_id ) {
        /*********************************************************************************
         * Generate Rows
         *********************************************************************************/
        let row_html = `<tr class="${classes}" data-recordid="${record_id}">`;
        let col_count = this.column_model.length;
        for( let col = 0; col < col_count; col++ ) {
            let column_name = this.column_model[ col ].name;
            let isHidden = this.column_hidden[ column_name ];

            if( isHidden == true ) {
                continue;
            }

            let value = '';
            // if there is data to display figure out how to display it.
            if( typeof( data[ column_name ] ) !== 'undefined' ) {
                if( typeof( this.column_model[ col ].format ) == 'string' ) {
                    let formatType = this.column_model[ col ].format;
                    value = this[ `format_${formatType.toLowerCase()}` ]( data[ column_name ] );
                }
                else if( typeof( this.column_model[ col ].format ) == 'function' ) {
                    value = this.column_model[ col ].format( data[ column_name ], data );
                }
                else {
                    value = data[ column_name ];
                }
            }

            /*********************************************************************************
             * Generate Columns
             *********************************************************************************/
            let user_classes = '';
            if( typeof( this.column_model[ col ].classes ) != 'undefined' ) {
                user_classes = this.column_model[ col ].classes;
            }

            row_html += `<td class="${wsgrid_column}_${column_name} ${user_classes}"`
                + `style="width:${this.column_widths[ col ]}px;`
                + `text-align:${this.column_model[ col ].align};">`
                + value + '</td>';
        }
        row_html += '</tr>';

        return row_html;
    }

    _generate_column_headers( columnClasses ) {
        let header_row = '';

        for( let column = 0; column < this.column_model.length; column++ ) {
            let column_name = this.column_model[ column ].name;

            // Don't display hidden columns.
            if( this.column_hidden[ column_name ] ) {
                continue;
            }

            /*********************************************************************************
             * Generate Columns
             *********************************************************************************/

            header_row += `<th class=" ${wsgrid_header}_column `
                        + `${wsgrid_header}_column_${this.column_model[ column ].name}" `
                        + `style="width:${this.column_widths[ column ]}px; `
                        + `text-align:${this.column_model[ column ].align};">`
                        + this.column_model[ column ].label + '</th>';
        }

        return header_row;
    }

    /**
     * Create a filter and apply it to the data.
     * @param  {Array} filters - An Array of filter Objects containing the following options:
     *     type     - string - 'string', 'number',
     *     operator - '==', '<', '>', '<=', '>=', '!=',
     *     test     - string or number to test against.
     *     join     - How to join this filter to the previous one.
     * ie: [ { type: 'string', operator: '==', test: 'John' } ]
     */
    filter( filters ) {

        if( typeof( filters ) == 'boolean' ) {
            this.is_filtered = filters;
        }
        else {
            this.filters = filters;
            this.is_filtered = true;
        }

        this.display();
    }

    /**
     * Should we filter out this record?
     * @param  {Number}  index - the index number to test the filtering on.
     * @return {Boolean}
     */
    _is_selected( index ) {

        // If the filter isn't turned on, select everything.
        if( ! this.is_filtered ) {
            return true;
        }

        let row_data = this.data[ index ];

        for( let i = 0; i < this.filters.length; i++ ) {
            let f = this.filters[ i ];
            if( row_data[ f.field ] == f.test ) {
                return true;
            }
        }
        return false;
    }

    /**
     * Set the data to be used for the totals row at the bottom.
     * If there is no totals data don't set anything.
     * @param {Object} row_data    - Object containing the rows to total using the Column Model column names.
     */
    set_totals_row( row_data ) {
        if( Array.isArray( row_data ) ) {
            console.log( "Only using the first row of data" );
            this.totals_data = row_data[ 0 ];
        }
        else {
            this.totals_data = row_data;
        }

        let grid_body = document.getElementsByClassName( `.${wsgrid_body}` );
        if( grid_body.length != 0 ) {
            let element = grid_body.querySelector( `.${wsgrid_totals}` );
            if( element !== null ) {
                element.remove();
            }
            let headerData = this._generate_totals_row();
            grid_body.append( headerData );
        }
    }

    _generate_totals_row() {
        if( this.totals_data === undefined ) {
            return '';
        }

        return this._generate_row( this.totals_data, `${wsgrid_totals}`, '' );
    }

    /**
     * Refresh the data displayed in the grid.
     * This updates the displayed data using the data stored data array.
     */
    refresh() {
        //TODO: make a refresh button work
        // $( `#${this.id} .${wsgrid_body}` ).empty();
        // let rowData = this.generateRows();
        //
        // $( `#${this.id} .${wsgrid_body}` ).append( rowData );
        //
        // $( `#${this.id} .${wsgrid_header}_row` ).empty();
        // let headerData = this._generate_column_headers();
        // $( `#${this.id} .${wsgrid_header}_row` ).append( headerData );
        //
        // let gridElement = document.getElementById( this.id );
        // let event = document.createEvent( 'HTMLEvents' );
        // event.initEvent( 'gridComplete', true, true );
        // gridElement.dispatchEvent( event );
    }

    /**
     * Delete all rows listed in the given array.
     * @param  {Array} rows     - List of rows in the form of an array.
     */
    delete_rows( rows ) {

        for( let i = 0; i < rows.length; i++ ) {
            let row = rows[ i ];
            this.data[ row ].splice( row, 1 );
        }

        //TODO: make a refresh function
        //this.refresh();
    }

    /**
     * Getter/setter for the value of a given cell.
     * @param  {String} column_name - Name of the column to get the data from
     * @param  {Number} rowId      - record id number.
     * @param  {Mixed}  value      - If setting the value of a cell, this is the value to set.
     * @return {Mixed}             - If getting the value of a cell, this is the value returned.
     */
    cell_value( column_name, row_id, value ) {

        if( typeof( value ) == 'undefined' ) {
            return this.data[ row_id ][ column_name ];
        }
        else {
            let old_value = this.data[ rowId ][ column_name ];

            if( old_value == value ) {
                return;
            }

            this.data[ row_id ][ column_name ] = value;
            let e = new Event( `${wsgrid_data}.cell_changed`, { bubbles: true } );
            e.change = [ {
                row:       row_id,
                column:    column_name,
                new_value:  value,
                old_value: old_value,
            } ];
            document.dispatchEvent( e );
        }
    }

    /**
     * Return all rows that are currently selected.
     * If no row is selected return an empty array.
     * @return {Array} - array of rows numbers.
     */
    get_selected_rows() {
        let selection = $( `#${this.id} .selected` );
        let records = [];

        if( selection.length > 0 ) {
            for( let i = 0; i < selection.length; i++ ) {
                records.push( selection[ i ].data( 'record-id' ) );
            }
        }

        return records;
    }

    /**
     * Show/hide column based on the state.
     * @param  {String}  column_name   - Name of the column to show/hide.
     * @param  {Boolean} [state=true] - show the column?
     */
    show_column( column_name, state = true ) {
        this.column_hidden[ column_name ] = ( state ? false : true );

        //TODO: reset column widths

        //TODO: make a refresh function
        //this.refresh();
    }

    /**
     * Wrapper for showColumn( column_name, false );
     */
    hide_column( column_name ) {
        this.show_column( column_name, false );
    }

    toggleColumn( column_name ) {
        let newState = ( ! this.column_hidden[ column_name ] == true );
        this.column_hidden[ column_name ] = newState;
        this.refresh();
    }

    /***********************************************************************************
     * Event handlers:
     *
     *   The events below can have custom event handlers passed in by the user.
     ***********************************************************************************/

    /**
     * click( row, column_name, row_data )
     * Event - Fires when the user clicks on a cell.
     * Paraemeters:
     *    row        - record id in data array or the row clicked on.
     *    column_name - Name of the column clicked on.
     *    row_data    - data object for the row clicked on.
     */
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

        // Set the selected cell.
        let selected = document.getElementsByClassName( 'selected' );
        let count = selected.length;

        for( let i = 0; i < count; i++ ) {
            selected[ i ].classList.remove( 'selected' );
        }
        classList.add( 'selected' );

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

    /**
     * dblclick( row, column_name, row_data )
     * Event - Fires when the user double clicks on a cell.
     * Paraemeters:
     *    row        - record id in data array or the row clicked on.
     *    column_name - Name of the column clicked on.
     *    row_data    - data object for the row clicked on.
     */
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
        else {
            // If this column is editable create an editor
            // for the user to change the data.
            let count = this.column_model.length;
            for( let i = 0; i < count; i++ ) {
                if( this.column_model[ i ].name == column_name
                    && this.column_model[ i ].editable == true ) {

                    this._inline_editor( event.target, i, this.column_model[ i ] );
                }
            }
        }
    }

    /**
     * loadComplete( data )
     * Event - Fires once the table has been generate and the data added to it.
     * Parameters:
     *      data    - An array of row objects
     */
    load_complete( event ) {
        if( typeof( this.events.load_complete ) == 'function' ) {
            this.events.load_complete( this.data );
        }
    }

    /**
     * data_changed( change )
     * Event - Fires when the user clicks on a cell.
     * Paraemeters:
     *    row         - record id in data array or the row clicked on.
     *    column_name - Name of the column clicked on.
     *    row_data    - data object for the row clicked on.
     */
    data_changed( event ) {
        if( typeof( this.events.data_changed ) == 'function' ) {
            this.events.data_changed( e.change );
        }
    }

    /**
     * This event fires when the header columns are clicked
     * The default event is to sort the data by the given column.
     * Asending first, then descending.
     *
     * @param  {Event} event   - DOM Event.
     */
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

            this.sort_direction = ( this.sort_direction == 'asc' ? 'desc' : 'asc' );

            this.display();
        }
    }

    /**
     * Do generic asc / desc sorting.
     * @param  {String} column_name - Which column are we sorting asc/desc.
     * @param  {Object} a           - 1st row to compare for sorting.
     * @param  {Object} b           - 2nd row to compre for sorting.
     * @return {Number}             - 1 sort a up, -1 sort a down.
     */
    _basic_sorting( column_name, a, b ) {
        let a_value = this._get_value( column_name, a );
        let b_value = this._get_value( column_name, b );

        if( this.sort_direction == 'asc' ) {

            if( a_value >= b_value ) {
                return 1;
            }
            else {
                return -1;
            }
        }
        else if( this.sort_direction == 'desc' ) {

            if( a_value <= b_value ) {
                return 1;
            }
            else {
                return -1;
            }
        }
    }

    /**
     * Based on the type provided in the column model convert the value
     * to something that can be sorted by the sort() function.
     *
     * @param  {[type]} column_name [description]
     * @param  {[type]} object      [description]
     * @return {[type]}             [description]
     */
    _get_value( column_name, object ) {
        let type = this.column_types[ column_name ];
        let value = object[ column_name ];

        if( typeof( type ) == 'function' ) {
            return type( value );
        }

        switch( type ) {
            case 'text':
            case 'string':
                return String( value ).toLowerCase();
            case 'number':
                return Number( value );
            //TODO: include moment.js
            // case 'date':
            //     return Number( moment( value ).format( 'YYYYMMDD' ) );
            // case 'datetime':
            //     return Number( moment( value ).format( 'YYYYMMDDHHmmss' ) );
            default:
                return String( value );
        }
    }

    /**
     * Generate the inline editor dialogs.
     * @param  {HTMLElment} cell       - HTML Elment of the table cell.
     * @param  {Number} index          - Index of the properties in the column_model
     * @param  {[type]} properties
     * @return {[type]}            [description]
     */
    _inline_editor( cell, index, properties ) {
        let editor = '';
        let cell_value = cell.innerHTML;

        // Only open an editor if one isn't already open.
        if( cell.firstChild == '#text' ) {
            return cell.innerHTML;
        }

        let value = convert_html_entities( cell_value );

        if( properties.type == 'number' ) {
            value = this.from_currency( value );
        }

        let checked = '';

        if( properties.type == 'checkbox' &&
            Number( value ) == 1 ) {
            checked = 'checked';
        }
        else if( properties.type == 'date' ) {
            if( value.indexOf( '/' ) >= 0 ) {
                value = moment( value, 'MM/DD/YYYY' ).format( 'YYYY-MM-DD' );
            }
        }

        editor = `<input type="${properties.type}" class="${wsgrid_editor}_main_editor"`
                + `style="width:${this.column_widths[ index ]}px;text-align:${properties.align}" `
                + `value=\"${value}\" ${checked}>`;

        cell.dataset.oldvalue = cell.innerHTML;
        cell.innerHTML = editor;
        let self = this;

        // Force an enter event to be a blur event and leave the field.
        cell.firstChild.addEventListener( 'keyup', ( event ) => {
            if( event.keyCode == 13 ) {
                cell.firstChild.blur();
            }
        } );

        // Force the blur event to save and close the editor.
        cell.firstChild.addEventListener( 'focusout', ( event ) => {
            let e = new Event( 'click' );
            document.dispatchEvent( e );
        } );

        document.addEventListener( 'click', function click_close_editor( event ) {

            // if we're clicking in the editor don't close it.
            if( typeof( cell.firstChild ) != 'undefined'
                && event.target == cell.firstChild ) {
                return;
            }

            let column_name = self.column_model[ index ].name;
            if( self._close_editor( event, cell, column_name ) ) {
                document.removeEventListener( 'click', click_close_editor );
            }
        } );

        // Let the user edit right away.
        cell.firstChild.focus();
        cell.firstChild.select();
    }

    /**
     * Close event for the inline editor.
     * The user can override it by creating an before_inline_closed event and returning false;
     * @param  {Event} event   -
     * @param
     * @param
     * @return {Boolean}       - did the editor close?
     */
    _close_editor( event, cell, column_name ) {
        if( typeof( this.events.before_inline_closed ) == 'function' ) {
            if( ! this.events.before_inline_closed( row, column, value, row_data ) ) {
                return false;
            }
        }

        //TODO: is there a better way to get the recordId instead of hard coding it?
        let row_id = cell.closest( `.${wsgrid_row}` ).dataset.recordid;
        let new_value = cell.firstChild.value;

        if( cell.firstChild.type == 'checkbox' ) {
            if( cell.firstChild.checked ) {
                new_value = 1;
            }
            else {
                new_value = 0;
            }
        }

        let column_number = this._get_number_from_column_name( column_name );

        let formatType = typeof( this.column_model[ column_number ].format );
        if( formatType == 'string' ) {
            new_value = this[ `format_${this.column_model[ column_number ].format.toLowerCase()}` ]( new_value );
        }
        if( formatType == 'function' ) {
            new_value = this.column_model[ column_number ].format( new_value );
        }

        cell.innerHTML = new_value;

        this.data[ row_id ][ column_name ] = new_value;

        let old_value = cell.dataset.oldvalue;

        let e = new Event( `${wsgrid_data}.cell_changed`, { bubbles: true } );
        e.changes = [ {
            row:       row_id,
            column:    column_name,
            new_value: new_value,
            old_value: old_value,
        } ];
        cell.dispatchEvent( e );

        return true;
    }

    _get_number_from_column_name( column_name ) {
        for( let i = 0; i < this.column_model.length; i++ ) {
            if( this.column_model[ i ].name == column_name ) {
                return i;
            }
        }
    }

    /**
     * Count of the rows of data in the record set.
     * @return {Number} - record set count
     */
    row_count() {
        return this.data.length;
    }

    /**
     * Print this grid on paper.
     * Code leveraged from: http://www.trirand.com/blog/?page_id=393/help/improved-print-grid-function
     */
    print() {
        // attach print container style and div to DOM.
        $( 'head' ).append( '<style type="text/css">.prt-hide {display:none;}</style>' );
        $( 'body' ).append( '<div id="prt-container" class="prt-hide"></div>' );

        // empty the print div container.
        $( '#prt-container' ).empty();

        // copy and append grid view to print div container.
        $( `#${this.id}` ).clone().appendTo( '#prt-container' ).css( { 'page-break-after': 'auto' } );

        // remove navigation div.
        $( '#prt-container div' ).remove( '.ui-jqgrid-toppager,.ui-jqgrid-titlebar,.ui-jqgrid-pager' );

        // print the contents of the print container.
        $( '#prt-container' ).printElement( {
            pageTitle:          this.title,
            overrideElementCSS: [ {
                href:  'include/wsGrid.css',
                media: 'print'
            } ]
        } );
    }

    /**
     * Copy the data to the clipboard in a form that can be pasted into a
     * spreadsheet.
     */
    copy() {

        let body = document.body;
        let range;
        let sel;
        let el = document.getElementById( this.id );

        if( document.createRange && window.getSelection ) {
            range = document.createRange();
            sel = window.getSelection();
            sel.removeAllRanges();
            try{
                range.selectNodeContents( el );
                sel.addRange( range );
            }
            catch( e ) {
                range.selectNode( el );
                sel.addRange( range );
            }
        }
        else if( body.createTextRange ) {
            range = body.createTextRange();
            range.moveToElementText( el );
            range.select();
        }
        document.execCommand( 'copy' );

        if( window.getSelection ) {
            if( window.getSelection().empty ) {  // Chrome
                window.getSelection().empty();
            }
            else if( window.getSelection().removeAllRanges ) {  // Firefox
                window.getSelection().removeAllRanges();
            }
        }
        else if( document.selection ) {  // IE?
            document.selection.empty();
        }

        //TODO: user feedback alert( "data copied");
    }

    /**********************************************************************
     * Format functions
     **********************************************************************/

    /**
     * A field formatter for boolean data.
     * True is 'X' false, is blank.
     */
    format_boolean( cellValue ) {
        if( Number( cellValue ) == 1 ) {
            return "X";
        }

        return '';
    }

    /**
     * Field formatter for dates.
     */
    format_date( cellValue ) {
        let format = 'YYYY-MM-DD';

        if( cellValue.indexOf( '/' ) >= 0 ) {
            format = 'M/D/YYYY';
        }

        let date = moment( cellValue, format );
        return date.format( 'M/D/YYYY' );
    }

    format_currency( cellValue ) {
        let value = this.from_currency( cellValue );
        return this.to_currency( value );
    }


    /**
     * Convert a dollar amount to a simple number.
     */
    from_currency( string ) {

        if( typeof( string ) == 'string' ) {
            if( string.indexOf( '$' ) != -1 ) {
                string = string.replace( '$', '' );
            }
            if( string.indexOf( ',' ) != -1 ) {
                string = string.replace( ',', '' );
            }

            // make it negative
            if( string.indexOf( '(' ) != -1 ) {
                string = string.replace( '(', '-' );
                string = string.replace( ')', '' );
            }
        }

        return Number( string );
    }

    /**
     * Convert a number to a dollar amount string.
     **/
    to_currency( amount ) {
        amount = numberNs.with_precision( amount, 2, true );

        // Perl module Data::Money passes the value as a number.
        if( typeof( amount ) == 'number' ) {
            let isNegative = false;

            if( amount < 0 ) {
                amount = Math.abs( amount );
                isNegative = true;
            }
            amount = ( isNegative == true ? `($${amount})` : `$${amount}` );

        // Perl module Math::Currency passes the value as a string.
        }
        else if( typeof( amount ) == 'string' ) {
            amount = numberNs.with_precision( amount, 2, true );
            let floatAmount = Number( amount );

            let isNegative = false;

            if( floatAmount < 0 ) {
                amount = amount.replace( '-', '' );
                isNegative = true;
            }

            if( amount.indexOf( '$' ) == -1 ) {
                amount = ( isNegative == true ? `($${amount})` : `$${amount}` );
            }
        }

        return amount;
    }

    /**
     * If there isn't enough precision in the number add it,
     * but don't truncate if there is more then the minimum precision,
     * unless the limitPrecision flag is set.
     *
     * @retval stirng
     **/
    with_precision( number, places = 2, limitPrecision = false ) {
        let numberString = String( number );
        number = Number( number );

        let newVal = '';
        let index = numberString.indexOf( '.' );

        index++; //index is zero based, correct for position in string.

        if( ( numberString.length - index ) > places ) {
            newVal = Math.round( number * Math.pow( 10, places ), places ) / Math.pow( 10, places );
        }
        else {
            newVal = number;
        }

        return newVal.toFixed( places );
    }
};
