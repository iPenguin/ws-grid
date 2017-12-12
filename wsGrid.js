/**
 * This module contains a Grid class that will create a table/grid for displaying and editing tabular data.
 *
 *Options:
 *
 * column_defaults: - An object containing default values for all columns.
 * column_model:    - a list of options that will define how each column displays it's data.
 *     name      - String          - Name of data field passed into grid.
 *     label     - String          - Label to show at the top of the column.
 *     visible   - Boolean         - Is the column visible?
 *     width     - Number          - How wide to make the column, (number only) but this is calculated in pixels.
 *     align     - String          - A string: left, right, or center.
 *     fixed     - Boolean         - When loading always start with the width given.
 *     type      - String/function - The type is used to determine the sorting.
 *                                   Valid values are: text, string, number, date, datetime, time
 *                                   NOTE: you can also assign a function and it will run the custom function.
 *     editable  - Boolean         - Can this column be edited?
 *     frozen    - Boolean         - Is this column locked in place? left or right?
 *     classes   - String          - Custom css classes to apply to the column
 *     format    - String/function - On how to format the data, a function should return a string.
 * connection:
 *     type      - String          - Type of connection used: 'Ajax' or 'Socket'.
 *     url       - String          - URL used to connect to the server.
 *                                   examples: '/api/grid/data', 'wss://example.com/api/grid/data'
 * currency:        - Override function for how to format numbers as currency.
 * events:          - an object containing functions as elements.
 *     click( row, column, rowData )         - Click event for a given cell.
 *     dblclick( row, column_name, rowData ) - Double click event for cells, the grid passes in row,
 *                                             column name, and row data.
 *     load_complete( data )                 - After the data has been given to the grid,
 *                                             but before the ui is generated.
 *     data_loaded( data )                   - After the data is loaded, but before the grid is generated.
 *     data_changed( change )                - Fires when the internal data for the grid is changed.
 *                                             change contains row_id, column_name, new_value, old_value,
 *     grid_complete( data )                 - After the data has been given to the grid
 *                                             and after the ui has been generated.
 *
 *     sort_row                              - After the user has manually changed the row order.
 *     after_edit                            - After the user has edited the data, and the editor has closed.
 *     after_save                            - After the editor has closed and the data has been saved.
 *
 *    before_inline_opened( row, column_name, value, row_data )     - return '' to prevent a dialog opening.
 *    before_inline_closed( row, column_name, value, row_data )     - can prevent the editor from closing and loosing focus.
 *    before_inline_submitted( row, column_name, value, row_data )  - can manipulate the data before it's saved to the local data model.
 * filters:         - An object with filtering functions.
 * height:          - Height of grid. Set the height to an empty string to allow the grid to be the height of the data.
 * id:              - ID of DOM element that will contain this grid.
 * overflow         - Allow the columns to overflow the width of the grid. (default: false)
 * width:           - Width of grid.
 *
 **/

import { Object_Base } from './object_base.js';
import { CreateConnection } from './connection.js';
import { Socket } from './socket.js';
import { Ajax } from './ajax.js';

const wsgrid_prefix      = 'wsgrid_';
const wsgrid_table       = `${wsgrid_prefix}_table`;
const wsgrid_header      = `${wsgrid_prefix}_header`;
const wsgrid_body        = `${wsgrid_prefix}_body`;
const wsgrid_footer      = `${wsgrid_prefix}_footer`;
const wsgrid_row         = `${wsgrid_prefix}_row`;
const wsgrid_column      = `${wsgrid_prefix}_column`;
const wsgrid_cell        = `${wsgrid_prefix}_cell`;
const wsgrid_editor      = `${wsgrid_prefix}_editor`;
const wsgrid_totals      = `${wsgrid_prefix}_totals`;
const wsgrid_multiselect = `${wsgrid_prefix}_multiselect`;
const wsgrid_data        = `${wsgrid_prefix}_data`;

let column_defaults = {
    name:         '',
    label:        '',
    width:        100,
    align:        'left',
    fixed:        true,
    visible:      true,
    type:         'text',
    editable:     false,
    frozen_left:  false,
    frozen_right: false,
    classes:      '',
    format:       ( value ) => {
        return value;
    }
};

let grid_defaults = {
    height:          200,
    width:           200,
    events:          {},
    filters:         [],
    overflow:        false,
    sort_column:     '',
    sort_direction:  'asc',
    column_reorder:  false,
    column_resize:   true,
    column_sort:     true,
    row_reorder:     false,
    multi_select:    false,
    connection:     {
        type:    'Socket',
        url:     '',
        options: {},
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
            'id', 'column_model',
        ] );

        //extend the default options with the user options
        let all_options = Object.assign( {}, grid_defaults, options );
        this._setup_object( all_options );

        this.drag = {
            started: false,
            type:    undefined,
        };

        this.connection = CreateConnection.create_connection( this.connection );
        this.grid_container = document.getElementById( this.id );

        this._parse_column_info();
        this._create_lookup_tables( all_options.column_model );
        this._calculate_columns();

        this.grid = this.generate_grid();
        this.is_filtered = false;

        this.drag = {
            started: false,
            type:    undefined,
        };

        this.event_trigger = undefined;

        this.sort_column = '';
        this.sort_direction = 'asc';

        // conect events.
        this.grid.addEventListener( 'click', ( event ) => { this.click.call( this, event ); } );
        this.grid.addEventListener( 'dblclick', ( event ) => { this.dblclick.call( this, event ); } );
        this.grid.addEventListener( 'load_complete', ( event ) => { this.load_complete.call( this, event ); } );
        this.grid.addEventListener( 'mousedown', ( event ) => { this.mousedown.call( this, event ); } );
        this.grid.addEventListener( 'mousemove', ( event ) => { this.mousemove.call( this, event ); } );
        this.grid.addEventListener( 'mouseup', ( event ) => { this.mouseup.call( this, event ); } );
        this.grid.addEventListener( `${wsgrid_data}.cell_changed`, ( event ) => { this.data_changed.call( this, event ); } );
        window.addEventListener( 'resize', ( event ) => { this.resize.call( this, event ); } );

        // Needed for grid resizing.
        this.grid.style.position = 'relative';
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

        this.data = [];
        this.totals_data = undefined;

        // Make sure the element the user wants is actually in the DOM, if not throw an error the user can figure out.
        let gridElement = document.getElementById( this.id );
        if( gridElement == null ) {
            throw new Error( `Could not find grid element. Is ${this.id} an element in the DOM?` );
        }
    }

    /**
     * Mouse down resize event handler, start the resize event.
     * @param  {Event} e     - trigger event for resize start.
     */
    _column_resize_start( e ) {
        e.preventDefault();

        if( typeof( this.seperator ) == 'undefined' ) {
            this.seperator = document.createElement( 'div' );
            this.seperator.id = `${wsgrid_header}_column_resize_visual`;
            this.seperator.dataset.width_delta = 0;
        }
        this.seperator.dataset.column = e.target.dataset.column;
        let rect = this.grid.getBoundingClientRect();
        this.seperator.style.top = `${rect.top}px`;
        this.seperator.style.height = `${rect.height}px`;
        this.seperator.style.left = `${e.pageX}px`;
        this.seperator.start_drag = e.pageX;
        this.grid.append( this.seperator );
    }
    /**
     * Mouse move resize event handler
     * @param  {Event} e     - trigger event for mouse moving
     */
    _column_resize( e ) {
        e.preventDefault();

        this.seperator.dataset.width_delta = ( e.pageX - this.seperator.start_drag );
        this.seperator.style.left = `${e.pageX}px`;
    }
    /**
     * Mouse up resize event handler
     * @param  {Event} e     - trigger event for mouse up
     */
    _column_resize_end( e ) {
        e.preventDefault();
        let column_name = this.seperator.dataset.column;

        let width = Number( this.columns.width[ column_name ] ) + Number( this.seperator.dataset.width_delta );
        this.set_column_width( column_name, width );

        // reset delta so we don't keep changning the column width, by just clicking on it.
        this.seperator.dataset.width_delta = 0;
        this.seperator.parentElement.removeChild( this.seperator );
    }

    /**
     * Mouse down column move event handler, start the column move event.
     * @param  {Event} e     - trigger event for mouse down
     */
    _column_move_start( e ) {
        e.preventDefault();

        if( typeof( this.seperator ) == 'undefined' ) {
            this.seperator = document.createElement( 'div' );
            this.seperator.id = `${wsgrid_header}_column_resize_visual`;
        }

        this.seperator.dataset.column = e.target.dataset.column;
        let rect = this.grid.getBoundingClientRect();
        this.seperator.style.top = `${rect.top}px`;
        this.seperator.style.height = `${rect.height}px`;
        this.seperator.style.left = `${e.pageX}px`;
        this.seperator.start_drag = e.pageX;
        this.grid.append( this.seperator );
        this.grid.style.cursor = 'move';
    }
    /**
     * Mouse move column move event handler
     * @param  {Event} e     - trigger event for mouse moving
     */
    _column_move( e ) {
        e.preventDefault();

        let header_row = this.grid.querySelector( 'thead tr' );
        let children = header_row.children;

        for( let i = 0; i < children.length; i++ ) {
            let rect = children[ i ].getBoundingClientRect();
            let split = rect.left + ( rect.width * ( 2 / 3 ) );

            if( e.pageX > rect.left && e.pageX <= rect.right ) {
                if( e.pageX < split ) {
                    this.seperator.style.left = `${rect.left}px`;
                    continue;
                }
                else {
                    this.seperator.style.left = `${rect.right}px`;
                    continue;
                }
            }
        }
    }
    /**
     * Mouse up column move event handler
     * @param  {Event} e     - trigger event for mouse up
     */
    _column_move_end( e ) {
        e.preventDefault();

        let column_name = this.seperator.dataset.column;
        let next_column = '';

        let header_row = this.grid.querySelector( 'thead tr' );
        let children = header_row.children;

        for( let i = 0; i < children.length; i++ ) {
            let rect = children[ i ].getBoundingClientRect();
            let split = rect.left + ( rect.width * ( 2 / 3 ) );

            if( e.pageX > rect.left && e.pageX <= rect.right ) {
                if( e.pageX < split ) {
                    this.seperator.style.left = `${rect.left}px`;
                    next_column = children[ i ];
                    continue;
                }
                else {
                    this.seperator.style.left = `${rect.right}px`;
                    next_column = children[ i + 1 ];
                    continue;
                }
            }
        }

        let next_column_name = undefined;

        if( typeof( next_column ) !== 'undefined' ) {
            next_column_name = next_column.dataset.column;
        }

        this.set_column_position( column_name, next_column_name );

        this.seperator.parentElement.removeChild( this.seperator );
        this.grid.style.cursor = '';
    }

    /**
     * turn the column model on it's side so we can do property lookups using the column name.
     * @param  {Object} column_model        - Column model used to create this grid.
     */
    _create_lookup_tables( column_model ) {
        let colCount = column_model.length;

        this.columns = {};
        this.column_order = [];

        // loop through the columns and create a set of lookup tables for all properties.
        for( let i = 0; i < colCount; i++ ) {
            // fill in any missing default values.
            this.column_model[ i ] = Object.assign( {}, column_defaults, column_model[ i ] );

            let keys = Object.keys( column_defaults );
            let column_name = this.column_model[ i ].name;

            // Keep track of the column order.
            this.column_order[ i ] = column_name;

            // keep track of all properties by column name.
            for( let key of keys ) {
                if( typeof( this.columns[ key ] ) == 'undefined' ) {
                    this.columns[ key ] = {};
                }

                this.columns[ key ][ column_name ] = this.column_model[ i ][ key ];
            }
        }

        console.log( "columns", this.columns );
    }

    /**
     * using all the properties from the grid figure out
     * what all the widths for all the columns should be
     * @param  {Boolean} [user_set=false]   - If the user changes the column width, don't override
     *                                        it with variable column size calculations
     */
    _calculate_columns( user_set = false ) {
        let count = this.column_model.length;

        let grid_width = document.getElementById( this.id ).offsetWidth;
        let fixed_width = 0;
        let flex_width = 0;

        // loop through the columns and gather info
        for( let i = 0; i < count; i++ ) {
            let column_name = this.column_order[ i ];

            let isFixed = this.columns.fixed[ column_name ];

            fixed_width += ( isFixed ? this.columns.width[ column_name ] : 0 );
            flex_width += ( isFixed ? 0 : this.columns.width[ column_name ] );
        }

        // calculate the widths of flexable columns.
        let remaining_width = grid_width - fixed_width;

        for( let i = 0; i < count; i++ ) {
            let column_name = this.column_order[ i ];

            let new_width = this.columns.width[ column_name ];

            if( ! user_set && ! this.columns.fixed[ column_name ] ) {

                let percent = new_width / flex_width;
                new_width = Math.floor( remaining_width * percent );
            }

            this.columns.width[ column_name ] = new_width;
        }

        if( this.overflow ) {
            this.min_column_width = fixed_width + flex_width;
        }
        else {
            this.min_column_width = 0;
        }
    }

    /**
     * Set a new column width, update the column calculations, and recreat the table.
     * @param {String} column_name   - Name of the column to update the width for
     * @param {Number} width         - The new width of the column
     */
    set_column_width( column_name, width ) {
        // set minimum width so we can still resize it
        // and the column doesn't completely disappear.
        if( width < 2 ) {
            width = 2;
        }

        this.columns.width[ column_name ] = width;
        this._calculate_columns( true );
        this.refresh();
    }

    /**
     * Generate the shell of the grid from scratch
     */
    generate_grid() {
        let table_header = this._generate_column_headers();

        let html = `<table class="${wsgrid_table} ${wsgrid_table}_${this.id}">`
            + `<thead class="${wsgrid_header} ${wsgrid_header}_${this.id}">${table_header}</thead>`
            + `<tbody class="${wsgrid_body} ${wsgrid_body}_${this.id}"></tbody>`
            + `<tfoot class="${wsgrid_footer}"></tfoot>`
            + '</table>';

        this.grid_container.innerHTML = html;

        return document.querySelector( `table.${wsgrid_table}_${this.id}` );
    }

    /**
     * Fill the grid with the given data and generate a table for display.
     * @param  {Array} data - Array of objects containing data in the form key: value
     */
    display( data ) {

        if( typeof( data ) != 'undefined' ) {
            this.data = data;
        }

        this.refresh();
    }

    /**
     * Generate the table rows using the internal data array
     */
    _generate_rows() {

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

            let classes = '';

            if( zebra % 2 == 0 ) {
                classes += ` ${wsgrid_row}_even `;
            }
            else {
                classes += ` ${wsgrid_row}_odd `;
            }
            zebra++;

            row_html += this._generate_row( i, this.data[ i ], '', classes );
        }

        //TODO: move outside of this function...
        let event = document.createEvent( 'HTMLEvents' );
        event.initEvent( 'load_complete', true, true );
        this.grid.dispatchEvent( event );

        return row_html;
    }

    /**
     * Generate the html for the given row of data.
     */
    _generate_row( record_id, data, row_classes = '', column_classes = '' ) {
        /*********************************************************************************
         * Generate Rows
         *********************************************************************************/
        let row_html = `<tr class="${wsgrid_row} ${wsgrid_row}_${record_id} ${row_classes}"`
                    + ( record_id == '' ? '' : `data-recordid="${record_id}"` )
                    + ` style="min-width:${this.min_column_width}px">`;

        if( this.multi_select ) {
            row_html += `<td class="${wsgrid_multiselect}_cell ${column_classes}" style="position:sticky;left:0;z-index:5;">`
                      + this._generate_multiselect( record_id ) + '</td>';
        }

        for( let column = 0; column < this.column_order.length; column++ ) {
            let column_name = this.column_order[ column ];

            let value = '';

            // if there is data to display figure out how to display it.
            if( typeof( data[ column_name ] ) !== 'undefined' ) {
                if( typeof( this.columns.format[ column_name ] ) == 'string' ) {
                    let formatType = this.columns.format[ column_name ];
                    value = this[ `format_${formatType.toLowerCase()}` ]( data[ column_name ] );
                }
                else if( typeof( this.columns.format[ column_name ] ) == 'function' ) {
                    value = this.columns.format[ column_name ]( data[ column_name ], data );
                }
                else {
                    value = data[ column_name ];
                }
            }

            /*********************************************************************************
             * Generate Columns
             *********************************************************************************/
            let user_classes = '';
            if( typeof( this.columns.classes[ column_name ] ) != 'undefined' ) {
                user_classes = this.columns.classes[ column_name ];
            }

            let display = '';
            if( ! this.columns.visible[ column_name ] ) {
                display = 'display: none;';
            }

            let frozen_style = this._generate_frozen_styles( column_name );

            let alignment = this.columns.align[ column_name ];
            row_html += `<td class="${wsgrid_column} ${wsgrid_cell} ${column_classes} ${wsgrid_column}_${column_name}`
                    + ` ${user_classes}"`
                    + ` data-recordid='${record_id}' data-column='${column_name}' data-columnid="${column}"`
                    + ` style="${display} ${frozen_style} width:${this.columns.width[ column_name ]}px;text-align:${alignment};">`
                    + `${value}</td>`;
        }
        row_html += '</tr>';

        return row_html;
    }

    /**
     * Move the column column_name before next_column.
     * If no column name is given or it is undefined places the column at the end of the grid.
     *
     * @param {String} column_name    - Column to move
     * @param {String} next_element   - Column to move in front of
     */
    set_column_position( column_name, next_element ) {
        this.column_order.splice( this.column_order.indexOf( column_name ), 1 );
        this.column_order.splice( this.column_order.indexOf( next_element ), 0, column_name );
        this.refresh();
    }

    /**
     * Event, checking the checkbox in the column header, (un)checks all the checkboxes
     * @param  {Boolean} state    - The state to set the checkboxes to
     */
    _multiselect_header_checked( state ) {
        let checkboxes = this.grid.querySelectorAll( `input[class^="${wsgrid_multiselect}_id"]` );

        for( let i = 0; i < checkboxes.length; i++ ) {
            checkboxes[ i ].checked = state;
            checkboxes[ i ].parentElement.classList.toggle( `${wsgrid_row}_selected`, state );
        }
    }

    /**
     * Using the column model properties create the column headers
     * @return {String}               - HTML string of all <th> element in the row.
     */
    _generate_column_headers() {
        let header_row = '';

        if( this.multi_select ) {
            header_row += `<th class="${wsgrid_multiselect}_cell"  style="position:sticky;left:0;z-index:5;">`
                        + this._generate_multiselect( 'header' ) + '</th>';
        }

        for( let column = 0; column < this.column_order.length; column++ ) {
            let column_name = this.column_order[ column ];

            let sort_styling = '';
            let decoration_side = 'left';
            if( column_name == this.sort_column ) {
                if( this.columns.align[ column_name ] == 'left' ) {
                    decoration_side = 'right';
                }
                sort_styling = `<span class="${wsgrid_header}_sort" style="${decoration_side}:5px"><i class="fa fa-sort-${this.sort_direction} fa-sm"></i></span>`;
            }

            let move_handle = '';
            let resize_handle = '';

            // if this isn't the first column in a multi_select then...
            if( this.multi_select && column == 0 ) {
                move_handle = '';
                resize_handle = '';
            }
            else {
                if( this.column_reorder ) {
                    move_handle = `<span class='${wsgrid_header}_column_move' data-column='${column_name}'></span>`;
                }

                if( this.column_resize ) {
                    resize_handle = `<span class="${wsgrid_header}_column_resize" data-column="${column_name}"></span>`;
                }
            }
            /*********************************************************************************
             * Generate Columns
             *********************************************************************************/

            let display = '';
            if( ! this.columns.visible[ column_name ] ) {
                display = 'display: none;';
            }

            let frozen_style = this._generate_frozen_styles( column_name );

            header_row += `<th class="${wsgrid_header}_column ${wsgrid_column}_${column_name}"`
                        + ` data-column="${column_name}" data-columnid="${column}"`
                        + ` style="width:${this.columns.width[ column_name ]}px;`
                        + ` text-align:${this.columns.align[ column_name ]};${display} ${frozen_style}">`
                        + `${move_handle} ${this.columns.label[ column_name ]} ${sort_styling} ${resize_handle}</th>`;
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

        this.refresh();
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
     * Generate the styles used for this column based on if the column is frozen or not.
     * @param  {String} column_name   - Name of the column we're generating styles for.
     * @return {String}               - CSS styles in a string for use inline on the td elemement.
     */
    _generate_frozen_styles( column_name ) {
        let frozen_style = '';
        let fixed_position = 0;
        let frozen_count = 0;
        let col_count = 1;

        if( this.columns.frozen_left[ column_name ] ) {

            let keys = Object.keys( this.columns.frozen_left );
            for( let key of keys ) {
                if( this.columns.frozen_left[ key ] ) {
                    frozen_count++;
                }
            }

            if( this.multi_select ) {
                fixed_position += 20 + 7;
            }

            for( let i = 0; i < this.column_order.length; i++ ) {

                let current_column = this.column_order[ i ];
                if( current_column == column_name ) {
                    break;
                }
                else if( this.columns.visible[ current_column ] ) {
                    col_count++;
                    fixed_position += this.columns.width[ current_column ] + 6 + i;
                }
            }

            let border = '';
            if( col_count == frozen_count ) {
                border = 'border-right: 3px solid black;';
            }

            frozen_style = `position:sticky;left:${fixed_position}px;z-index:5;${border}`;

        }
        else if( this.columns.frozen_right[ column_name ] ) {

            let keys = Object.keys( this.columns.frozen_right );
            for( let key of keys ) {
                if( this.columns.frozen_right[ key ] ) {
                    frozen_count++;
                }
            }

            for( let i = this.column_order.length; i >= 0; i-- ) {
                let current_column = this.column_order[ i ];
                if( current_column == column_name ) {
                    break;
                }
                else if( this.columns.visible[ current_column ] ) {
                    col_count++;
                    let etc = this.column_order.length - i;
                    fixed_position += this.columns.width[ current_column ] + 5 + etc;
                }
            }

            let border = '';
            if( col_count == frozen_count ) {
                border = 'border-left: 3px solid black;';
            }

            frozen_style = `position:sticky;right:${fixed_position}px;z-index:5;${border}`;
        }

        return frozen_style;
    }

    /**
     * Generate the HTML for the checkbox used on each row of the multi-select grid.
     * @param  {String} row_id     - Row ID, 'header', or ''
     * @return {String}            - Contents/checkbox for the multiselect.
     *                               If row_id == '', return no checkbox,
     *                               If row_id == 'header' return a header checkbox
     *                               If row_id == Row Number, return a per record checkbox.
     */
    _generate_multiselect( row_id ) {
        let class_name = row_id;

        if( row_id === '' ) {
            return '';
        }
        // if the row_id is a number...
        else if( row_id !== 'header' ) {
            class_name = `id_${row_id}`;
        }

        return `<input class="${wsgrid_multiselect}_${class_name}" type="checkbox" data-recordid="${row_id}">`;
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

        let grid_footer = document.getElementsByClassName( `.${wsgrid_footer}` );
        if( grid_footer.length != 0 ) {
            let element = grid_footer.querySelector( `.${wsgrid_totals}` );
            if( element !== null ) {
                element.remove();
            }
            let headerData = this._generate_totals_row();
            grid_footer.append( headerData );
        }
    }

    /**
     * Generate the html for a totals row for the footer of the table.
     * @return {String}      - HTML for the totals row.
     */
    _generate_totals_row() {
        if( this.totals_data === undefined ) {
            return '';
        }

        return this._generate_row( '', this.totals_data, `${wsgrid_totals}`, `${wsgrid_totals}_column` );
    }

    /**
     * Refresh the data displayed in the grid.
     * This updates the displayed data using the data stored data array.
     */
    refresh() {
        let header = this.grid.querySelector( `.${wsgrid_header}` );
        header.innerHTML = this._generate_column_headers();

        let body = this.grid.querySelector( `.${wsgrid_body}` );
        body.innerHTML = this._generate_rows();

        let footer = this.grid.querySelector( `.${wsgrid_footer}` );
        footer.innerHTML = this._generate_totals_row();

        let event = document.createEvent( 'HTMLEvents' );
        event.initEvent( 'grid_complete', true, true );
        this.grid.dispatchEvent( event );
    }

    /**
     * Add a record to the data
     * @param {Object} record  - a Javascript object containing keys matching the columns
     */
    append_row( record ) {

        this.data.push( record );
        $( `#${this.id} .${wsgrid_body}` ).empty();
        let rowData = this.generateRows();
        $( `#${this.id} .${wsgrid_body}` ).append( rowData );
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

        this.refresh();
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
     * Get the record ids of the selected row.
     * @return {[type]} [description]
     */
    get_selected_rows() {
        let records = [];

        if( this.multi_select ) {
            let checkboxes = this.grid.querySelectorAll( `input[class^="${wsgrid_multiselect}_id"]` );

            for( let i = 0; i < checkboxes.length; i++ ) {
                if( checkboxes[ i ].checked ) {
                    records.push( checkboxes[ i ].dataset.recordid );
                }
            }
        }
        else {
            records.push( $( `#${this.id} .selected` ).data( 'recordid' ) );
        }

        return records;
    }

    /**
     * Show/hide column based on the state.
     * @param  {String}  column_name   - Name of the column to show/hide.
     * @param  {Boolean} [state=true] - show the column?
     */
    show_column( column_name, state = true ) {
        this.columns.visible[ column_name ] = state;

        $( `.${wsgrid_column}_${column_name}` ).css( 'display', ( state ? '' : 'none' ) );
    }

    /**
     * Wrapper for showColumn( column_name, false );
     */
    hide_column( column_name ) {
        this.show_column( column_name, false );
    }

    /**
     * Wrapper for showColumn( column_name, ! state );
     */
    toggle_column( column_name ) {
        let newState = ! ( this.columns.visible[ column_name ] );
        this.showColumn( column_name, newState );
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
        let column_name = event.target.dataset.column;
        let row = 0;

        if( this.drag.started ) {
            return;
        }

        // get the column name
        classList.forEach( ( c ) => {
            if( c.startsWith( `${wsgrid_column}_` ) ) {
                column_name = c.replace( `${wsgrid_column}_`, '' );
            }
            else if( c == `${wsgrid_header}_column` ) {
                this.header_click( event );
            }
            else if( c == `${wsgrid_totals}_column` ) {
                return;
            }
            else if( classList.contains( `${wsgrid_multiselect}_header` ) ) {
                this._multiselect_header_checked( event.target.checked );
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
        row = event.target.dataset.recordid;

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

        if( this.drag.started ) {
            return;
        }


        if( classList.contains( `${wsgrid_cell}` ) ) {
            let row = Number( event.target.dataset.recordid );
            let column_name = event.target.dataset.column;

            // only call the user defined function if it exists.
            if( typeof( this.events.dblclick ) == 'function' ) {
                this.events.dblclick( row, column_name, this.data[ row ] );
            }
            else {
                // If this column is editable create an editor
                // for the user to change the data.
                if( this.columns.visible[ column_name ]
                    && this.columns.editable[ column_name ]
                ) {
                    let properties = {};
                    let keys = Object.keys( column_defaults );
                    for( let key of keys ) {
                        properties[ key ] = this.columns[ key ][ column_name ];
                    }

                    this._inline_editor( event.target, properties );
                }
            }
        }
    }

    /**
     * Resize event, recalculate the size of the grid and re-draw it.
     * @param  {Event} e     - Trigger event for resizing
     */
    resize( e ) {
        this._calculate_columns();
        this.refresh();
    }

    /**
     * Mouse down event handler
     * @param  {Event} e     - trigger event
     */
    mousedown( e ) {
        let classList = e.target.classList;
        if( classList.contains( `${wsgrid_header}_column_resize` ) ) {
            this.drag.started = true;
            this.drag.type = 'resize';
            this._column_resize_start( e );
        }
        else if( classList.contains( `${wsgrid_header}_column_move` ) ) {
            this.drag.started = true;
            this.drag.type = 'move';
            this._column_move_start( e );
        }
    }
    /**
     * Mouse move event handler
     * @param  {Event} e     - trigger event
     */
    mousemove( e ) {
        if( e.buttons == 1 && this.drag.started ) {
            if( this.drag.type == 'resize' ) {
                this._column_resize( e );
            }
            else if( this.drag.type == 'move' ) {
                this._column_move( e );
            }
        }
    }
    /**
     * Mouse up event handler
     * @param  {Event} e     - trigger event
     */
    mouseup( e ) {
        if( this.drag.started ) {
            switch( this.drag.type ) {
                case 'resize':
                    this._column_resize_end( e );
                    break;
                case 'move':
                    this._column_move_end( e );
                    break;
                default:
                    break;
            }

            this.drag.started = false;
            this.drag.started = undefined;
        }
    }

    /**
     * grid_complete event handler
     * @param  {Event} e     - trigger event
     */
    grid_complete( e ) {

        if( typeof( this.events.grid_complete ) == 'function' ) {
            this.events.grid_complete( this.data );
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
        if( ! this.column_sort ) {
            return;
        }
        let column_name = event.target.dataset.column;

        // only call the user defined function if it exists.
        if( typeof( this.events.header_click ) == 'function' ) {
            this.events.header_click( column_name );
        }
        else {

            this.data.sort( ( a, b ) => {
                return this._basic_sorting( column_name, a, b );
            } );

            this.sort_column = column_name;
            this.sort_direction = ( this.sort_direction == 'asc' ? 'desc' : 'asc' );

            this.refresh();
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
        let type = this.columns.type[ column_name ];
        let value = object[ column_name ];

        if( typeof( type ) == 'function' ) {
            return type( value );
        }

        switch( type ) {
            case 'text':
            case 'string':
                return String( value ).toLowerCase();
            case 'number':
                value = this.from_currency( value );
                return Number( value );
            // case 'date':
            //     if( value == '' || value == undefined ) {
            //         return 0;
            //     }
            //     let date_format = 'YYYY-MM-DD';
            //     if( value.indexOf( '/' ) != -1 ) {
            //         date_format = 'M/D/YYYY';
            //     }
            //     return Number( moment( value, date_format ).format( 'YYYYMMDD' ) );
            // case 'datetime':
            //     return Number( moment( value, 'YYYY-MM-DD HH:mm:ss' ).format( 'YYYYMMDDHHmmss' ) );
            default:
                return String( value );
        }
    }

    /**
     * Generate the inline editor dialogs.
     * @param  {HTMLElment} cell       - HTML Elment of the table cell.
     * @param  {[type]} properties
     * @return {[type]}            [description]
     */
    _inline_editor( cell, properties ) {
        let editor = '';
        let cell_value = this.data[ cell.dataset.recordid ][ properties.name ];

        // Only open an editor if one isn't already open.
        if( cell.firstChild == '#text' ) {
            return cell.innerHTML;
        }

        let value = convert_html_entities( String( cell_value ) );

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
                + `style="width:calc( 100% - 10px );text-align:${properties.align}" `
                + `value=\"${value}\" ${checked}>`;

        cell.dataset.oldvalue = cell.innerHTML;
        cell.innerHTML = editor;
        let self = this;

        cell.firstChild.addEventListener( 'keydown', ( event ) => {

            switch( event.keyCode ) {
                case 9:  //tab
                case 13: // enter
                //case 37: // left arrow
                case 38: // up arrow
                //case 39: // right arrow
                case 40: // down arrow
                    event.preventDefault();
                    break;
                default:
                    break;
            }

            this.event_trigger = event;
        } );

        // Force an enter event to be a blur event and leave the field.
        cell.firstChild.addEventListener( 'keyup', ( event ) => {

            switch( event.keyCode ) {
                case 9:  // tab
                case 13: // enter
                //case 37: // left arrow
                case 38: // up arrow
                //case 39: // right arrow
                case 40: // down arrow
                    cell.firstChild.blur();
                    break;
                default:
                    break;
            }
        } );

        // Force the blur event to save and close the editor.
        cell.firstChild.addEventListener( 'blur', ( event ) => {
            let e = new Event( 'click' );
            document.dispatchEvent( e );

            if( typeof( this.event_trigger ) !== 'undefined' ) {
                let keyCode = this.event_trigger.keyCode;
                switch( keyCode ) {
                    // case 37: // left arrow
                    //     this._open_left_editor( event, cell );
                    //     break;
                    case 38: // up arrow
                        this._open_up_editor( event, cell );
                        break;
                    // case 39: // right arrow
                    //     this._open_right_editor( event, cell );
                    //     break;
                    case 40: // down arrow
                        this._open_down_editor( event, cell );
                        break;
                    case 9:
                        if( this.event_trigger.shiftKey ) {
                            this._open_previous_editor( event, cell );
                        }
                        else {
                            this._open_next_editor( event, cell );
                        }
                        break;
                    default:
                        break;
                }
            }

            this.event_trigger = undefined;
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
    _close_editor( event, cell ) {
        if( typeof( this.events.before_inline_closed ) == 'function' ) {
            if( ! this.events.before_inline_closed( row, column, value, row_data ) ) {
                return false;
            }
        }

        //TODO: is there a better way to get the recordId instead of hard coding it?
        let row_id = cell.dataset.recordid;
        let column_name = cell.dataset.column;
        let new_value = cell.firstChild.value;

        if( cell.firstChild.type == 'checkbox' ) {
            if( cell.firstChild.checked ) {
                new_value = 1;
            }
            else {
                new_value = 0;
            }
        }

        let formatType = typeof( this.columns.format[ column_name ] );
        if( formatType == 'string' ) {
            new_value = this[ `format_${this.columns.format[ column_name ].toLowerCase()}` ]( new_value );
        }
        else if( formatType == 'function' ) {
            new_value = this.columns.format[ column_name ]( new_value );
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

    /**
     * Find the next editor to open and open it.
     * @param  {Event} event   - DOM event
     * @param  {Element} cell   - HTML Element
     */
    _open_next_editor( event, cell ) {
        let current_record = cell.dataset.recordid;
        let column_id = cell.dataset.columnid;

        let next_id = Number( column_id ) + 1;
        for( let i = next_id; i <= this.column_order.length; i++ ) {
            //if we've checked all the fields in this record move on to the next record...
            if( i == this.column_order.length ) {
                current_record++;
                i = 0;
            }

            let current_column = this.column_order[ i ];
            if( this.columns.visible[ current_column ] && this.columns.editable[ current_column ] ) {
                let e = new Event( 'dblclick', { bubbles: true } );
                let target = this.grid.querySelector( `.${wsgrid_row}_${current_record} td.${wsgrid_column}_${current_column}` );

                if( target !== null ) {
                    target.dispatchEvent( e );
                }
                return;
            }
        }
    }

    /**
     * Find the previous editor to open and open it.
     * @param  {[type]} cell [description]
     * @return {[type]}      [description]
     */
    _open_previous_editor( event, cell ) {
        let current_record = cell.dataset.recordid;
        let column_id = cell.dataset.columnid;

        let next_id = Number( column_id ) - 1;
        for( let i = next_id; i >= 0; i-- ) {
            //if we've checked all the fields in this record move on to the next record...
            if( i == 0 ) {
                current_record--;
                i = this.column_order.length - 1;
            }

            let current_column = this.column_order[ i ];
            if( this.columns.visible[ current_column ] && this.columns.editable[ current_column ] ) {
                let e = new Event( 'dblclick', { bubbles: true } );
                let target = this.grid.querySelector( `.${wsgrid_row}_${current_record} td.${wsgrid_column}_${current_column}` );

                if( target !== null ) {
                    target.dispatchEvent( e );
                }

                return;
            }
        }
    }

    /**
     * Find the previous editor to open and open it.
     * @param  {[type]} cell [description]
     * @return {[type]}      [description]
     */
    _open_up_editor( event, cell ) {
        let current_record = cell.dataset.recordid;
        let column_name = cell.dataset.column;

        current_record--;

        if( current_record == -1 ) {
            current_record += this.data.length;
        }

        let e = new Event( 'dblclick', { bubbles: true } );
        let target = this.grid.querySelector( `.${wsgrid_row}_${current_record} td.${wsgrid_column}_${column_name}` );
        target.dispatchEvent( e );
    }

    /**
     * Find the previous editor to open and open it.
     * @param  {[type]} cell [description]
     * @return {[type]}      [description]
     */
    _open_down_editor( event, cell ) {
        let current_record = cell.dataset.recordid;
        let column_name = cell.dataset.column;

        current_record++;

        if( current_record == this.data.length ) {
            current_record = 0;
        }

        let e = new Event( 'dblclick', { bubbles: true } );
        let target = this.grid.querySelector( `.${wsgrid_row}_${current_record} td.${wsgrid_column}_${column_name}` );
        target.dispatchEvent( e );
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
     * Format a given value with a 'X' or ''
     * @param  {String} cellValue    - Value to be formatted: 1 or 0
     * @return {String}              - Formatted string
     */
    format_boolean( cellValue ) {
        if( Number( cellValue ) == 1 ) {
            return "X";
        }

        return '';
    }

    /**
     * Format a given value as a date in the form of M/D/YYYY
     * @param  {String} cellValue    - Date in form or YYYY-MM-DD or M/D/YYYY
     * @return {String}              - Formatted date of M/D/YYYY
     */
    format_date( cellValue ) {
        if( cellValue == '' || cellValue == undefined ) {
            return '';
        }

        let format = 'YYYY-MM-DD';

        if( cellValue.indexOf( '/' ) >= 0 ) {
            format = 'M/D/YYYY';
        }

        let date = moment( cellValue, format );
        return date.format( 'M/D/YYYY' );
    }

    /**
     * format the data as currency, a custom user function can override the default abilty.
     * @param  {String} cellValue     - Value to format
     * @return {String}               - Formatted value
     */
    format_currency( cellValue ) {
        // Check for a user defined currency function first.
        if( typeof( this.currency ) == 'function' ) {
            return this.currency( cellValue );
        }

        let value = this.from_currency( cellValue );
        return this.to_currency( value );
    }

    /**
     * Convert a dollar amount to a simple number.
     * @param  {String} string       - Currency formatted string
     * @return {Number}              - amount as a number
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
     * TODO: add thousands seperator
     *
     * @param  {Number/String} amount  - value that we want to format as an amount as currecy.
     * @return {String}                - Amount with symbols as string.
     */
    to_currency( amount ) {
        amount = this.with_precision( amount, 2, true );

        if( typeof( amount ) == 'number' ) {
            let isNegative = false;

            if( amount < 0 ) {
                amount = Math.abs( amount );
                isNegative = true;
            }
            amount = ( isNegative == true ? `($${amount})` : `$${amount}` );
        }
        else if( typeof( amount ) == 'string' ) {
            amount = this.with_precision( amount, 2, true );
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
