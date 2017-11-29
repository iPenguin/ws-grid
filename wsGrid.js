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
const wsgrid_table = `${wsgrid_prefix}_table`;
const wsgrid_body = `${wsgrid_prefix}_body`;
const wsgrid_column = `${wsgrid_prefix}_column`;
const wsgrid_row = `${wsgrid_prefix}_row`;
const wsgrid_editor = `${wsgrid_prefix}_editor`;

let column_defaults = {
    name:     '',
    label:    '',
    width:    100,
    align:    'left',
    fixed:    true,
    hidden:   false,
    sort:     'text',
    editable: false,
};

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

        let grid_width = this.width; //this.grid.offsetWidth;
        let fixed_width = 0;
        let flex_width = 0;
        this.column_types = {};

        this.data = [];
        this.totalsData = undefined;

        // loop through the columns and gather information about widths...
        for( let i = 0; i < count; i++ ) {
            // Create a quick lookup table for column type/format, so we know how to sort data
            this.column_types[ this.column_model[ i ].name ] = this.column_model[ i ].type;

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

        // Make sure the element the user wants is actually in the DOM, if not throw an error the user can figure out.
        let gridElement = document.getElementById( this.id );
        if( gridElement == null ) {
            throw new Error( `Could not find grid element. Is ${this.id} an element in the DOM?` );
        }


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
            + `<tbody class="${wsgrid_body}" style="height:${this.height}px;`
            + `width:${this.width + 42 }px"></tbody>`
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

        this.fill_grid();
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

    /***********************************************************************************
     * Event handlers:
     *
     *   The events below can have custom event handlers passed in by the user.
     ***********************************************************************************/

    /**
     * click( row, columnName, rowData )
     * Event - Fires when the user clicks on a cell.
     * Paraemeters:
     *    row        - record id in data array or the row clicked on.
     *    columnName - Name of the column clicked on.
     *    rowData    - data object for the row clicked on.
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
     * dblclick( row, columnName, rowData )
     * Event - Fires when the user double clicks on a cell.
     * Paraemeters:
     *    row        - record id in data array or the row clicked on.
     *    columnName - Name of the column clicked on.
     *    rowData    - data object for the row clicked on.
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

            this.fill_grid();
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
                return String( value );
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
        editor = `<input type="${properties.type}" class="${wsgrid_editor}_main_editor"`
                + `style="width:${this.column_widths[ index ]}px;text-align:${properties.align}" `
                + `value=\"${value}\">`;

        cell.innerHTML = editor;
        let self = this;

        cell.firstChild.addEventListener( 'keyup', ( event ) => {
            if( event.keyCode == 13 ) {
                let e = new Event( 'click' );
                cell.dispatchEvent( e );
            }
        } );

        document.addEventListener( 'click', function click_close_editor( event ) {

            // if we're clicking in the editor don't close it.
            if( typeof( cell.firstChild ) != 'undefined'
                && event.target == cell.firstChild ) {
                return;
            }

            if( self._close_editor( event, cell ) ) {
                document.removeEventListener( 'click', click_close_editor );
            }
        } );

        // Let the user edit right away.
        cell.firstChild.focus();
    }

    /**
     * Close event for the inline editor.
     * The user can override it by creating an before_inline_closed event and returning false;
     * @param  {Event} event   -
     * @return {[type]}       [description]
     */
    _close_editor( event, cell ) {
        if( typeof( this.events.before_inline_closed ) == 'function' ) {
            if( ! this.events.before_inline_closed( row, column, value, row_data ) ) {
                return false;
            }
        }

        cell.innerHTML = cell.firstChild.value;
        return true;
    }

    /**
     * Count of the rows of data in the record set.
     * @return {Number} - record set count
     */
    row_count() {
        return this.data.length;
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

};
