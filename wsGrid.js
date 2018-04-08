/**
 * @class
 * This module contains a Grid class that will create a table/grid for displaying and editing tabular data.
 *
 *Options:
 *
 * column_defaults: - An object containing default values for all columns.
 * column_model:    - a list of options that will define how each column displays it's data.
 *     name         - String           - Name of data field passed into grid.
 *     label        - String           - Label to show at the top of the column.
 *     visible      - Boolean          - Is the column visible?
 *     width        - Number           - How wide to make the column, (number only) but this is calculated in pixels.
 *     align        - String           - A string: left, right, or center.
 *     fixed        - Boolean          - When loading always start with the width given.
 *     type         - String/function  - The type is used to determine the sorting.
 *                                       Valid values are: text, string, number, date, datetime, time, dropdown
 *                                       NOTE: you can also assign a function and it will run the custom function.
 *     options      - Object           - Key/value pairs for a type: "dropdown" column.
 *     editable     - Boolean/function - Can this column be edited?
 *     frozen_left  - Boolean          - Is this column locked in place on the left?
 *     frozen_right - Boolean          - Is this column locked in place on the left?
 *     classes      - String/function  - Custom CSS classes to apply to the column
 *     format       - String/function  - On how to format the data, a function should return a string.
 *                                       String can be 'date', 'currency', 'boolean', or 'nonzero'
 *     style        - String/function  - Is or returns a string of CSS styles to apply to the cell
 *     max_length   - Number           - How long can the string/number be?
 *     min_length   - Number           - Minimum length of input.
 *
 * column_reorder:                 - Enable reordering of columns using drag and drop.
 * connection:
 *     type      - String          - Type of connection used: 'Ajax' or 'Socket'.
 *     url       - String          - URL used to connect to the server.
 *                                   examples: '/api/grid/data', 'wss://example.com/api/grid/data'
 * currency:        - Override function for how to format numbers as currency.
 * events:          - an object containing user orverride event functions as elements.
 *                    all events are executed with 'this' set to the current grid.
 *     click( row, column, rowData )         - Click event for a given cell.
 *     dblclick( row, column_name, rowData ) - Double click event for cells, the grid passes in row,
 *                                             column name, and row data.
 *     load_complete( data )                 - After the data has been given to the grid,
 *                                             but before the ui is generated.
 *     data_loaded( data )                   - After the data is loaded, but before the grid is generated.
 *     data_changed( change )                - Fires when the internal data for the grid is changed.
 *                                             change contains row_id, column_name, new_value, old_value,
 *
 *     sort_row                              - After the user has manually changed the row order.
 *     after_edit                            - After the user has edited the data, and the editor has closed.
 *     after_save                            - After the editor has closed and the data has been saved.
 *
 *     before_inline_opened( row, column_name, value, row_data )     - return '' to prevent a dialog opening.
 *     before_close( row, column_name, value, row_data )     - can prevent the editor from closing and loosing focus.
 *     before_inline_submitted( row, column_name, value, row_data )  - can manipulate the data before it's saved to the local data model.
 * filters:         - An object with filtering functions.
 * height:          - Height of grid. Set the height to an empty string to allow the grid to be the height of the data.
 * id:              - ID of DOM element that will contain this grid.
 * overflow:        - Allow the columns to overflow the width of the grid. (default: false)
 * width:           - Width of grid.
 * grouping:        - Array of objects containing grouping options. A grouping object can contain the following options:
 *     column:                               - column name to sort or
 *     sort_order                            - sort order asc, or desc
 *     header
 *     footer
 *
 **/

import { Number_Utility } from './number_utility.js';
import { Object_Base } from './object_base.js';
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
    style:        '',
    tooltip:      '',
    options:      {},
    max_length:   undefined,
    min_length:   undefined,
    format:       ( value ) => {
        if( value === undefined ) {
            return '';
        }

        return value;
    }
};

let grid_defaults = {
    height:             200,
    width:              200,
    events:             {},
    filters:            [],
    overflow:           true,
    sort_column:        '',
    sort_direction:     'asc',
    column_model:       [],
    column_reorder:     false,
    column_resize:      true,
    column_sort:        true,
    row_reorder:        false,
    multi_select:       false,
    grouping_model:     [],
    connection_type:    'socket',
    connection_options: {
        url: '',
    },
};

/**
 * This structure contains data about the cells.
 * each cell has a changed flag and classes placeholder.
 *
 * These contain the state of the cell so that when we refresh
 * the grid those changes are not lost.
 */
let cell_metadata = {
    changed:    false,
    last_value: undefined,
    classes:    '',
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
        return tags_to_replace[ tag ] || tag;
    } );
};

/**
 * Grid class.
 * @class
 */
export class Grid extends Object_Base {
    constructor( options ) {
        super( options );

        this._required_options( options, [
            'id', 'column_model',
        ] );

        //extend the default options with the user options
        let all_options = Object.assign( {}, grid_defaults, options );
        this._setup_object( all_options );

        // Make sure the element the user wants is actually in the DOM, if not throw an error the user can figure out.
        let gridElement = document.getElementById( this.id );
        if( gridElement == null ) {
            throw new Error( `Could not find grid element. Is ${this.id} an element in the DOM?` );
        }

        this.drag = {
            started: false,
            type:    undefined,
        };

        switch( this.connection_type ) {
            case 'socket':
                this.connection = new Socket( this.connection_options );
                break;
            case 'ajax':
                this.connection = new Ajax( this.connection_options );
                break;
        }

        this.event_trigger = undefined;

        this.data = [];
        this.metadata = [];
        this.totals_data = undefined;

        this.is_filtered = false;

        this._create_lookup_tables( all_options.column_model, all_options.grouping_model );
        this._calculate_columns();

        this.grid = this._create_base_table();

        this.sort_column = '';
        this.sort_direction = 'asc';

        // conect events.
        this.grid.addEventListener( 'click', ( event ) => { this.click.call( this, event ); } );
        this.grid.addEventListener( 'dblclick', ( event ) => { this.dblclick.call( this, event ); } );
        this.grid.addEventListener( 'change', ( event ) => { this.change.call( this, event ); } );
        this.grid.addEventListener( 'load_complete', ( event ) => { this.load_complete.call( this, event ); } );
        this.grid.addEventListener( 'mousedown', ( event ) => { this.mousedown.call( this, event ); } );
        this.grid.addEventListener( 'mousemove', ( event ) => { this.mousemove.call( this, event ); } );
        this.grid.addEventListener( 'mouseup', ( event ) => { this.mouseup.call( this, event ); } );
        this.grid.addEventListener( `${wsgrid_data}.cell_changed`, ( event ) => { this.data_changed.call( this, event ); } );
        this.grid.addEventListener( `${wsgrid_data}.row_moved`, ( event ) => { this.row_moved.call( this, event ); } );
        window.addEventListener( 'resize', ( event ) => { this.resize.call( this, event ); } );

        // Needed for grid resizing.
        this.grid.style.position = 'relative';
    }

    /**
     * turn the column model on it's side so we can do property lookups using the column name.
     * @param  {Object} column_model        - Column model used to create this grid.
     */
    _create_lookup_tables( column_model = null, grouping_model = null ) {
        if( column_model === null ) {
            column_model = this.column_model;
        }

        if( grouping_model === null ) {
            grouping_model = this.grouping_model;
        }

        let colCount = column_model.length;

        this.columns = {};
        this.columns.order = [];
        this.row_order = [];

        // loop through the columns and create a set of lookup tables for all properties.
        for( let i = 0; i < colCount; i++ ) {
            // fill in any missing default values.
            this.column_model[ i ] = Object.assign( {}, column_defaults, column_model[ i ] );

            let keys = Object.keys( column_defaults );
            let column_name = this.column_model[ i ].name;

            // Keep track of the column order.
            this.columns.order[ i ] = column_name;

            // keep track of all properties by column name.
            for( let key of keys ) {
                if( typeof( this.columns[ key ] ) == 'undefined' ) {
                    this.columns[ key ] = {};
                }

                this.columns[ key ][ column_name ] = this.column_model[ i ][ key ];
            }
        }

        this.grouping = {
            columns:    [],
            sort_order: {},
            header:     {},
            footer:     {},
        };

        if( grouping_model.length != 0 ) {

            for( let i = 0; i < grouping_model.length; i++ ) {
                this.grouping.columns[ i ] = grouping_model[ i ].column;
                this.grouping.sort_order[ grouping_model[ i ].column ] = grouping_model[ i ].sort_order;
                this.grouping.header[ grouping_model[ i ].column ] = grouping_model[ i ].header;
                this.grouping.footer[ grouping_model[ i ].column ] = grouping_model[ i ].footer;
            }
        }
    }

    /**
     * Create the base table element and the header for the table
     * based on the column model information.
     */
    _create_base_table() {
        let table_header = this._generate_column_headers();

        let html = `<table class="${wsgrid_table} ${wsgrid_table}_${this.id}">`
                    + `<thead class="${wsgrid_header} ${wsgrid_header}_${this.id}">${table_header}</thead>`
                    + `<tbody class="${wsgrid_body} ${wsgrid_body}_${this.id}"></tbody>`
                    + `<tfoot class="${wsgrid_footer}"></tfoot>`
                    + '</table>';

        // Insert Table
        document.getElementById( this.id ).innerHTML = html;

        return document.querySelector( `table.${wsgrid_table}_${this.id}` );
    }

    /**
     * using all the properties from the grid figure out
     * what all the widths for all the columns should be
     *
     * Rules for calculating column widths:
     *   1) fixed widths are always the same width. (fixed)
     *   2) all remaining columns are calculated as a percentage of the remaining space.
     *       That percentage is calculated from the default width of the column / the width of all flexable columns.
     *
     * @param  {Boolean} [user_set=false]   - If the user changes the column width, don't override
     *                                        it with variable column size calculations
     */
    _calculate_columns( user_set = false ) {
        let count = this.column_model.length;

        let grid_width = document.getElementById( this.id ).offsetWidth;

        if( this.row_reorder ) {
            grid_width -= 5;
        }

        if( this.multi_select ) {
            grid_width -= 20;
        }

        let fixed_width = 0;
        let flex_width = 0;

        // loop through the columns and gather info
        for( let i = 0; i < count; i++ ) {
            let column_name = this.columns.order[ i ];
            // if( ! this.columns.visible[ column_name ] ) {
            //     continue;
            // }

            let isFixed = this.columns.fixed[ column_name ];

            fixed_width += ( isFixed ? this.columns.width[ column_name ] : 0 );
            flex_width += ( isFixed ? 0 : this.columns.width[ column_name ] );
        }

        // calculate the widths of flexable columns.
        let remaining_width = grid_width - fixed_width;
        for( let i = 0; i < count; i++ ) {
            let column_name = this.columns.order[ i ];
            // if( ! this.columns.visible[ column_name ] ) {
            //     continue;
            // }

            let new_width = this.columns.width[ column_name ];
            if( ! user_set && ! this.columns.fixed[ column_name ] ) {

                let percent = new_width / flex_width;
                new_width = Math.floor( remaining_width * percent );
            }

            this.columns.width[ column_name ] = new_width;
        }

        if( this.overflow ) {
            this.min_row_width = fixed_width + flex_width;
        }
        else {
            this.min_row_width = 0; //grid_width; //fixed_width + flex_width;
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
        let next_column = undefined;

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

    _row_move_start( e ) {
        e.preventDefault();
        if( typeof( this.row_seperator ) == 'undefined' ) {
            this.row_seperator = document.createElement( 'div' );
            this.row_seperator.id = `${wsgrid_header}_row_resize_visual`;
        }

        this.row_seperator.dataset.source = e.target.dataset.recordid;
        let rect = this.grid.getBoundingClientRect();
        this.row_seperator.style.left = `${rect.left}px`;
        this.row_seperator.style.width = `${rect.width}px`;
        this.row_seperator.style.top = `${e.pageY}px`;
        this.row_seperator.start_drag = e.pageY;
        this.grid.append( this.row_seperator );
        this.grid.style.cursor = 'move';
    }
    _row_move( e ) {
        e.preventDefault();

        let move_targets = this.grid.querySelectorAll( `.${wsgrid_column}_row_move_target` );

        for( let i = 0; i < move_targets.length; i++ ) {
            let rect = move_targets[ i ].getBoundingClientRect();
            let split = rect.top + ( rect.height * ( 2 / 3 ) );

            if( e.pageY > rect.top && e.pageY <= rect.bottom ) {
                if( e.pageY < split ) {
                    this.row_seperator.style.top = `${rect.top}px`;
                    continue;
                }
                else {
                    this.row_seperator.style.top = `${rect.bottom}px`;
                    continue;
                }
            }
        }
    }
    _row_move_end( e ) {
        let previous_row = 0;

        e.preventDefault();

        let move_targets = this.grid.querySelectorAll( `.${wsgrid_column}_row_move_target` );

        for( let i = 0; i < move_targets.length; i++ ) {
            let rect = move_targets[ i ].getBoundingClientRect();
            let split = rect.top + ( rect.height * ( 2 / 3 ) );

            if( e.pageY > rect.top && e.pageY <= rect.bottom ) {

                if( e.pageY < split ) {
                    this.row_seperator.style.top = `${rect.top}px`;
                    previous_row = move_targets[ i ];
                    continue;
                }
                else {
                    this.row_seperator.style.top = `${rect.bottom}px`;
                    previous_row = move_targets[ i ];
                    continue;
                }
            }
        }
        let previous_record = 0;

        if( previous_row ) {
            previous_record = previous_row.dataset.recordid;
        }

        this.set_row_position( this.row_seperator.dataset.source, previous_record );

        this.row_seperator.parentElement.removeChild( this.row_seperator );
        this.grid.style.cursor = '';
    }

    /**
     * Fill the grid with the given data and generate a table for display.
     * @param  {Array} data - Array of objects containing data in the form key: value
     */
    display( data ) {

        if( typeof( data ) != 'undefined' ) {
            this.data = data;
            this.metadata = [];

            let size = this.data.length;

            for( let i = 0; i < size; i++ ) {
                let row = {};
                for( let c = 0; c < this.columns.order.length; c++ ) {
                    row[ this.columns.order[ c ] ] = Object.assign( {}, cell_metadata ); // clone the metadata for each cell.
                }
                this.metadata.push( row );
            }
        }

        this._sort_data( '', 'asc' );
        this.refresh();
    }

    /**
     * Generate the table rows using the internal data array
     * @return {String}         - the row data as a string of HTML
     */
    _generate_rows() {

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

            // Generate the grouping headers
            if( this.grouping.columns.length > 0 ) {
                let group_count = this.grouping.columns.length;

                let flag_new_group = false;
                for( let g = 0; g < group_count; g++ ) {
                    let column = this.grouping.columns[ g ];
                    if( i == 0
                        || this.data[ i ][ column ] !== this.data[ i - 1 ][ column ]
                        || flag_new_group
                    ) {
                        flag_new_group = true;
                        if( typeof( this.grouping.header ) !== 'undefined' ) {
                            if( typeof( this.grouping.header[ column ] ) == 'function' ) {
                                row_html += this.grouping.header[ column ]( column, this.data[ i ][ column ], this.data[ i ] );
                            }
                            else {
                                row_html += this.grouping.header[ column ];
                            }
                        }
                    }
                }
            }

            // Generate regular rows
            row_html += this._generate_row( i, this.data[ i ], '', classes );

            // Generate the grouping footer
            if( this.grouping.columns.length > 0 ) {
                let group_count = this.grouping.columns.length;

                let flag_new_group = false;
                for( let g = 0; g < group_count; g++ ) {
                    let column = this.grouping.columns[ g ];
                    if( i == 0
                        || this.data[ i ][ column ] !== this.data[ i - 1 ][ column ]
                        || flag_new_group
                    ) {
                        flag_new_group = true;
                        if( typeof( this.grouping.footer ) !== 'undefined' ) {
                            if( typeof( this.grouping.footer[ column ] ) == 'function' ) {
                                row_html += this.grouping.footer[ column ]( column, this.data[ i ][ column ], this.data[ i ] );
                            }
                            else {
                                row_html += this.grouping.footer[ column ];
                            }
                        }
                    }
                }
            }
        }

        return row_html;
    }

    /**
     * Generate the HTML for the given record_id.
     * @param  {Number} record_id      - Id of the record to generate HTML for.
     * @param  {Object} data           - All key, value pairs to generate HTML for.
     * @param  {String} row_classes    - List of classes to add to the row.
     * @param  {String} column_classes - List of classes to add to each column
     * @return {String}                - All the HTML for this row in a string.
     */
    _generate_row( record_id, data, row_classes = '', column_classes = '', is_header = false ) {
        /*********************************************************************************
         * Generate Row
         *********************************************************************************/
        let row_html = `<tr class="${wsgrid_row} ${wsgrid_row}_${record_id} ${row_classes}"`
                    + ( record_id == '' ? '' : `data-recordid="${record_id}"` )
                    //+ ` style="min-width:${this.min_row_width}px;`
                    + ( this.overflow ? '' : `max-width:${this.min_row_width};` )
                    + `">`;

        let column_type = 'td';
        if( is_header ) {
            column_type = 'th';
        }

        if( this.row_reorder ) {
            row_html += `<${column_type} class="${wsgrid_column}_row_move_target" data-recordid="${record_id}"></${column_type}>`;
        }

        if( this.multi_select ) {
            row_html += `<${column_type} class="${wsgrid_multiselect}_cell ${column_classes}" style="position:sticky;left:0;z-index:5;">`
                    + this._generate_multiselect( ( is_header ? 'header' : record_id ) ) + `</${column_type}>`;
        }

        for( let column = 0; column < this.columns.order.length; column++ ) {
            let column_name = this.columns.order[ column ];

            let value = '';

            let sort_styling = '';
            let move_handle = '';
            let resize_handle = '';

            if( is_header ) {
                let decoration_side = 'left';
                if( column_name == this.sort_column ) {
                    if( this.columns.align[ column_name ] == 'left' ) {
                        decoration_side = 'right';
                    }
                    sort_styling = `<span class="${wsgrid_header}_sort" style="${decoration_side}:5px"><i class="fa fa-sort-${this.sort_direction} fa-sm"></i></span>`;
                }

                // if this isn't the first column in a multi_select then...
                if( this.multi_select && column == 0 ) {
                    move_handle = '';
                    resize_handle = '';
                }
                else {
                    // if the column can be re-ordered and the column isn't frozen, include the move handler.
                    if( this.column_reorder
                        && ( ! this.columns.frozen_right[ column_name ] && ! this.columns.frozen_left[ column_name ] ) ) {
                        move_handle = `<span class='${wsgrid_header}_column_move_target' data-column='${column_name}'></span>`;
                    }

                    if( this.column_resize ) {
                        resize_handle = `<span class="${wsgrid_header}_column_resize" data-column="${column_name}"></span>`;
                    }
                }

                value = `${move_handle} ${this.columns.label[ column_name ]} ${sort_styling} ${resize_handle}`;
            }
            else {

                // if there is data to display figure out how to display it.
                if( typeof( data[ column_name ] ) !== 'undefined' ) {

                    if( this.columns.type[ column_name ] == 'dropdown' ) {
                        let val = data[ column_name ];
                        value = this.columns.options[ column_name ][ val ];
                    }
                    else if( typeof( this.columns.format[ column_name ] ) == 'string' ) {
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
            }

            /*********************************************************************************
             * Generate Columns
             *********************************************************************************/
            let user_classes = '';
            if( typeof( this.columns.classes[ column_name ] ) == 'function' ) {
                user_classes = this.columns.classes[ column_name ]( record_id, value, data );
            }
            else {
                user_classes = this.columns.classes[ column_name ];
            }

            let display = '';
            if( ! this.columns.visible[ column_name ] ) {
                display = 'display: none;';
            }

            let frozen_style = this._generate_frozen_styles( column_name );

            //TODO: if( ! header ) {
            let user_styles = this._generate_user_styles( record_id, column_name, data );
            // }

            let tooltip = '';
            if( this.columns.tooltip[ column_name ] !== ''
                && is_header ) {
                tooltip = ` title="${this.columns.tooltip[ column_name ]}"`;
            }

            let alignment = this.columns.align[ column_name ];
            row_html += `<${column_type} class="${wsgrid_column} ${wsgrid_cell} ${column_classes} ${wsgrid_column}_${column_name}`
                        + ( is_header ? '' : ` ${user_classes}"` )
                        + ` id="${wsgrid_column}_${record_id}_${column_name}"`
                        + tooltip
                        + ` data-recordid='${record_id}' data-column='${column_name}' data-columnid="${column}"`
                        + ` style="${display} ${frozen_style} width:${this.columns.width[ column_name ]}px;text-align:${alignment};${user_styles};">`
                        + `${value}</${column_type}>`;
        }
        row_html += '</tr>';

        return row_html;
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
     * Move the column column_name before next_column.
     * If no column name is given or it is undefined places the column at the end of the grid.
     *
     * @param {String} column_name    - Column to move
     * @param {String} next_element   - Column to move in front of
     * @emits {column.moved} emits event when a column's position is changed.
     */
    set_column_position( column_name, next_element ) {
        this.columns.order.splice( this.columns.order.indexOf( column_name ), 1 );
        this.columns.order.splice( this.columns.order.indexOf( next_element ), 0, column_name );

        let e = new Event( 'column.moved', { bubbles: true } );
        e.data = {
            column: column_name,
            next:   next_element,
        };
        this.grid.dispatchEvent( e );

        this.refresh();
    }

    /**
     * Move the row row_id after previous_row.
     * If no previous_row is given or it is undefined places the row at the end of the grid.
     *
     * @param {Number} row_id         - row to move
     * @param {Number} previous_row   - place row_id after previous_row, if it exists or at the end of the grid.
     * @emits {wsgrid__data.row_moved} emits event when a row's position is changed.
     */
    set_row_position( row_id, previous_row ) {
        let row_data = this.data[ row_id ];
        this.data.splice( row_id, 1 );
        this.data.splice( previous_row, 0, row_data );

        let e = new Event( '${wsgrid_data}.row_moved', { bubbles: true } );
        e.data = {
            row:       row_id,
            previous:  previous_row,
        };
        this.grid.dispatchEvent( e );

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
        let column_name = '';

        return this._generate_row(
            '',
            {},
            '',
            `${wsgrid_header}_column ${wsgrid_column}_${column_name}`,
            /*is_header=*/true
        );
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
        let fix_columns = 0;

        if( this.columns.frozen_left[ column_name ] ) {

            let keys = Object.keys( this.columns.frozen_left );
            for( let key of keys ) {
                if( this.columns.frozen_left[ key ] ) {
                    frozen_count++;
                }
            }

            if( this.row_reorder ) {
                fixed_position += 5 + 7;
            }

            if( this.multi_select ) {
                fixed_position += 20 + 7;
            }

            for( let i = 0; i < this.columns.order.length; i++ ) {

                let current_column = this.columns.order[ i ];
                if( current_column == column_name ) {
                    break;
                }
                else if( this.columns.visible[ current_column ] ) {
                    col_count++;
                    fixed_position += this.columns.width[ current_column ];
                    fix_columns++;
                }
            }

            fixed_position += ( fix_columns * 6 ) + fix_columns;

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

            for( let i = this.columns.order.length; i >= 0; i-- ) {
                let current_column = this.columns.order[ i ];
                if( current_column == column_name ) {
                    break;
                }
                else if( this.columns.visible[ current_column ] ) {
                    col_count++;
                    fixed_position += this.columns.width[ current_column ];
                    fix_columns++;
                }
            }

            fixed_position += ( fix_columns * 6 ) + ( ( fix_columns == 0 ? 1 : fix_columns ) - 1 );

            let border = '';
            if( col_count == frozen_count ) {
                border = 'border-left: 3px solid black;';
            }

            frozen_style = `position:sticky;right:${fixed_position}px;z-index:5;${border}`;
        }

        return frozen_style;
    }

    /**
     * based on the row/column and possibly other data, add styles to the cell.
     * @param  {Number} row_id      - Record ID we're working with.
     * @param  {String} column_name - Column Name we're working with.
     * @param  {Object} row_data    - Key/Value pairs representing the data for this record.
     * @return {String}             - A String of CSS styles to apply to the cell we're working with.
     */
    _generate_user_styles( row_id, column_name, row_data ) {

        if( row_id === '' ) {
            return '';
        }
        if( typeof( this.columns.style[ column_name ] ) == 'function' ) {
            return this.columns.style[ column_name ]( row_id, column_name, row_data );
        }

        return this.columns.style[ column_name ];
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

        let footer = this.grid.querySelector( `.${wsgrid_footer}` );
        footer.innerHTML = this._generate_totals_row();
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
        event.initEvent( 'load_complete', true, true );
        this.grid.dispatchEvent( event );
    }

    /**
     * Add a record to the data
     * @param {Object} record  - a Javascript object containing keys matching the columns
     */
    append_rows( records ) {

        // To avoid issues with wrong column counts and additional columns
        // only pull in data for the columns defined in the grid.
        let new_records = [];

        for( let i = 0; i < records.length; i++ ) {
            let record = {};
            for( let c = 0; c < this.columns.order.length; c++ ) {
                let column_name = this.columns.order[ c ];
                record[ column_name ] = records[ i ][ column_name ];
            }

            new_records.push( record );
        }

        let old_length = this.data.length;
        //change data in place, add new elements...
        this.data.splice( old_length, 0, ...new_records );

        let new_length = this.data.length;

        for( let i = old_length; i < new_length; i++ ) {
            let row = {};
            for( let c = 0; c < this.columns.order.length; c++ ) {
                // clone the metadata for each cell.
                row[ this.columns.order[ c ] ] = Object.assign( {}, cell_metadata );
            }
            this.metadata.push( row );
        }

        let body = this.grid.querySelector( `.${wsgrid_body}` );
        body.innerHTML = this._generate_rows();
    }

    /**
     * Delete all rows listed in the given array.
     * @param  {Array} rows     - List of rows in the form of an array.
     */
    delete_rows( rows ) {

        for( let i = 0; i < rows.length; i++ ) {
            let row = rows[ i ];
            this.data.splice( row, 1 );
            this.metadata.splice( row, 1 );
        }

        this.refresh();
    }

    /**
     * Count of the rows of data in the record set.
     * @return {Number} - record set count
     */
    count() {
        return this.data.length;
    }

    /**
     * Update the given records based on the unique key.
     * @param  {String} unique_key      - name of the key field.
     * @param  {Array}  data            - Array of data including the key field to update.
     */
    update_records( unique_key, updated_data ) {
        let updated_count = updated_data.length;
        let count = this.data.length;

        for( let i = 0; i < updated_count; i++ ) {
            let keys = Object.keys( updated_data[ i ] );
            delete keys[ unique_key ];

            let key_value = updated_data[ i ][ unique_key ];

            for( let j = 0; j < count; j++ ) {
                if( this.data[ j ][ unique_key ] == key_value ) {
                    for( let k = 0; k < keys.length; k++ ) {
                        let key = keys[ k ];
                        this.data[ j ][ key ] = updated_data[ i ][ key ];
                    }
                    break;
                }
            }
        }
        this.refresh();
    }

    /**
     * Setter for cell values. This function does not emit any signals when
     * changing the data in the data model.
     *
     * @param {String} column_name - Name of the column to set data for
     * @param {Number} row_id      - Row number to set data for
     * @param {Mixed}  value       - Value to set in the row, column.
     */
    set_cell( column_name, row_id, value ) {
        if( typeof( this.data[ row_id ] ) == 'undefined' ) {
            throw new Error( "Cannot find row in data grid" );
        }
        if( ! this.data[ row_id ].hasOwnProperty( column_name ) ) {
            throw new Error( "Cannot find column in row data" );
        }

        let old_value = this.data[ row_id ][ column_name ];
        if( old_value == value ) {
            return;
        }

        this.data[ row_id ][ column_name ] = value;
        this.metadata[ row_id ][ column_name ].changed = true;
        this.refresh();
    }

    /**
     * Getter/setter for the value of a given cell.
     * @param  {String} column_name - Name of the column to get the data from
     * @param  {Number} row_id     - record id number.
     * @param  {Mixed}  value      - If setting the value of a cell, this is the value to set.
     * @return {Mixed}             - If getting the value of a cell, this is the value returned.
     * @emits  {wsgrid__data.cell_changed} emits event when the data in a cell is changed.
     */
    cell_value( column_name, row_id, value ) {

        if( typeof( value ) == 'undefined' ) {
            return this.data[ row_id ][ column_name ];
        }
        else {
            this.set_cell( column_name, row_id, value );
            let e = new Event( `${wsgrid_data}.cell_changed`, { bubbles: true } );
            e.change = [ {
                row:       row_id,
                column:    column_name,
                new_value: value,
                old_value: old_value,
            } ];
            document.dispatchEvent( e );
        }
    }

    /**
     * is the given cell editable?
     * @param  {String}  column_name - Name of the column to check
     * @param  {Number}  row_id      - Row id of the record to check.
     * @return {Boolean}             - is the cell editable?
     */
    is_editable( column_name, row_id ) {
        let editable = this.columns.editable[ column_name ];
        if( typeof( editable ) == 'function' ) {
            editable = editable( row_id, column_name, this.data );
        }

        return editable;
    }

    /**
     * return an array of all values from a given column.
     * @param  {String} column_name - Name of column to get the data form.
     * @return {Array}              - Array of values from the column.
     */
    column_values( column_name ) {
        let c_data = [];

        for( let i = 0; i < this.data.length; i++ ) {
            c_data.push( this.data[ i ][ column_name ] );
        }

        return c_data;
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
            let selected_rows = this.grid.querySelectorAll( '.selected' );
            for( let i = 0; i < selected_rows.length; i++ ) {
                records.push( selected_rows[ i ].dataset.recordid );
            }
        }

        return records;
    }

    /**
     * Return the row Data for the given rows.
     * If no row is selected return an empty array.
     * @param  {Array}  rows   - list of rows to get data for.
     * @return {Array}         - Array of row data.
     */
    get_row_data( rows ) {

        let record_data = [];

        for( let i = 0; i < rows.length; i++ ) {
            record_data.push( this.data[ rows[ i ] ] );
        }

        return record_data;
    }

    /**
     * Show/hide column based on the state.
     * @param  {String}  column_name   - Name of the column to show/hide.
     * @param  {Boolean} [state=true] - show the column?
     */
    show_column( column_name, state = true ) {
        this.columns.visible[ column_name ] = state;

        let column = this.grid.querySelectorAll( `.${wsgrid_column}_${column_name}` );
        for( let i = 0; i < column.length; i++ ) {
            column[ i ].style.display = ( state ? '' : 'none' );
        }
    }

    /**
     * Wrapper for show_column( column_name, false );
     */
    hide_column( column_name ) {
        this.show_column( column_name, false );
    }

    /**
     * Wrapper for show_column( column_name, ! state );
     */
    toggle_column( column_name ) {
        let newState = ! ( this.columns.visible[ column_name ] );
        this.show_column( column_name, newState );
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

        if( this.drag.started ) {
            return;
        }

        if( classList.contains( `${wsgrid_header}_column` ) ) {
            this.header_click( event );
        }
        else if( classList.contains( `${wsgrid_multiselect}_header` ) ) {
            this._multiselect_header_checked( event.target.checked );
        }
        else if( classList.contains( `${wsgrid_cell}` ) ) {
            let selected = this.grid.getElementsByClassName( 'selected' );
            let count = selected.length;
            for( let i = 0; i < count; i++ ) {
                selected[ i ].classList.remove( 'selected' );
            }

            event.target.classList.add( 'selected' );

            let row = event.target.dataset.recordid;
            let column = event.target.dataset.column;

            if( typeof( this.events.click ) == 'function' ) {
                this.events.click.call( this, row, column, this.data[ row ], event );
            }
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
                this.events.dblclick.call( this, row, column_name, this.data[ row ], event );
            }

            if( ! event.defaultPrevented ) {
                let editable = this.columns.editable[ column_name ];
                if( typeof( editable ) == 'function' ) {
                    editable = editable( row, column_name, this.data );
                }

                // If this column is editable create an editor
                // for the user to change the data.
                if( this.columns.visible[ column_name ]
                && editable
                ) {
                    let properties = {};
                    let keys = Object.keys( column_defaults );
                    for( let key of keys ) {
                        properties[ key ] = this.columns[ key ][ column_name ];
                    }

                    if( typeof( this.events.before_edit ) !== 'undefined' ) {
                        this.events.before_edit.call( this, row, column_name, this.data[ row ], event );
                    }

                    if( ! event.defaultPrevented ) {
                        this._inline_editor( event.target, properties );
                    }
                }
            }
        }
    }

    /**
     * Change event,
     * @param  {Event} event  - Trigger event for grid changes.
     */
    change( event ) {
        if( event.target.classList.contains( `${wsgrid_multiselect}_checkbox` ) ) {
            let e = new Event( `${wsgrid_data}.selection_changed`, { bubbles: true } );
            event.target.dispatchEvent( e );
        }
    }

    /**
     * Resize event, recalculate the size of the grid and re-draw it.
     * @param  {Event} e     - Trigger event for resizing
     */
    resize( event ) {
        this._calculate_columns();
        this.refresh();
    }

    /**
     * Mouse down event handler
     * @param  {Event} e     - trigger event
     */
    mousedown( event ) {
        let classList = event.target.classList;
        if( classList.contains( `${wsgrid_header}_column_resize` ) ) {
            this.drag.started = true;
            this.drag.type = 'resize';
            this._column_resize_start( event );
        }
        else if( classList.contains( `${wsgrid_header}_column_move_target` ) ) {
            this.drag.started = true;
            this.drag.type = 'move_column';
            this._column_move_start( event );
        }
        else if( classList.contains( `${wsgrid_column}_row_move_target` ) ) {
            this.drag.started = true;
            this.drag.type = 'move_row';
            this._row_move_start( event );
        }
    }
    /**
     * Mouse move event handler
     * @param  {Event} e     - trigger event
     */
    mousemove( event ) {
        if( event.buttons == 1 && this.drag.started ) {
            switch( this.drag.type ) {
                case 'resize':
                    this._column_resize( event );
                    break;
                case 'move_column':
                    this._column_move( event );
                    break;
                case 'move_row':
                    this._row_move( event );
                    break;
            }
        }
    }
    /**
     * Mouse up event handler
     * @param  {Event} e     - trigger event
     */
    mouseup( event ) {
        if( this.drag.started ) {
            switch( this.drag.type ) {
                case 'resize':
                    this._column_resize_end( event );
                    break;
                case 'move_column':
                    this._column_move_end( event );
                    break;
                case 'move_row':
                    this._row_move_end( event );
                    break;
                default:
                    break;
            }

            this.drag.started = false;
            this.drag.started = undefined;
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
            this.events.load_complete.call( this, this.data );
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
            this.events.data_changed.call( this, event );
        }
    }

    row_moved( event ) {
        if( typeof( this.events.row_moved ) == 'function' ) {
            this.events.row_moved.call( this, event );
        }
    }

    /***************
     * End Events
     ***************/

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
            this.events.header_click.call( this, column_name );
        }
        else {
            this._sort_data( column_name, this.sort_direction );
            this.refresh();
        }
    }

    _sort_data( column_name = '', sort_order = 'asc' ) {
        let has_grouping = ( this.grouping.columns.length > 0 ? true : false );

        this.data.sort( ( a, b ) => {
            if( has_grouping ) {
                let sort_columns = [];
                let sort_orders = [];

                for( let i = 0; i <  this.grouping.columns.length; i++ ) {
                    sort_columns.push( this.grouping.columns[ i ] );
                    if( column_name == this.grouping.columns[ i ] ) {
                        this.grouping.sort_order[ this.grouping.columns[ i ] ] = sort_order;
                    }
                    sort_orders.push( this.grouping.sort_order[ this.grouping.columns[ i ] ] );
                }
                if( column_name != '' ) {
                    if( ! sort_columns.includes( column_name ) ) {
                        sort_columns.push( column_name );
                        sort_orders.push( sort_order );
                    }
                }

                return this._group_sorting( sort_columns, sort_orders, a, b );
            }
            else {
                return this._basic_sorting( column_name, a, b );
            }
        } );

        this.sort_column = column_name;
        this.sort_direction = ( this.sort_direction == 'asc' ? 'desc' : 'asc' );
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

        this.sort_direction = this.sort_direction.toLowerCase();
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
     * Do generic asc / desc sorting based on grouped data.
     * @param  {String} columns     - a list of columns and sort orders.
     * @param  {Object} a           - 1st row to compare for sorting.
     * @param  {Object} b           - 2nd row to compre for sorting.
     * @return {Number}             - 1 sort a up, -1 sort a down.
     */
    _group_sorting( sort_columns, sort_orders, a, b, sanity = 100 ) {
        let column = sort_columns.shift();
        let sort_order = sort_orders.shift();
        let a_value = this._get_value( column, a );
        let b_value = this._get_value( column, b );

        sort_order = sort_order.toLowerCase();
        if( sort_order == 'asc' ) {

            if( a_value > b_value ) {
                return 1;
            }
            else if( a_value < b_value || sort_columns.length == 0 ) {
                return -1;
            }
        }
        else if( sort_order == 'desc' ) {

            if( a_value < b_value ) {
                return 1;
            }
            else if( a_value > b_value || sort_columns.length == 0 ) {
                return -1;
            }
        }

        if( sanity <= 0 ) {
            return -1;
        }
        return this._group_sorting( sort_columns, sort_orders, a, b, --sanity );
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
                value = Number_Utility.from_currency( value );
                return Number( value );
            case 'date':
                if( value == '' || value == undefined ) {
                    return 0;
                }
                let date_format = 'YYYY-MM-DD';
                if( value.indexOf( '/' ) != -1 ) {
                    date_format = 'M/D/YYYY';
                }
                return Number( moment( value, date_format ).format( 'YYYYMMDD' ) );
            case 'datetime':
                if( value == '' || value == undefined ) {
                    return 0;
                }
                let datetime_format = 'YYYY-MM-DD HH:mm:ss';
                if( value.indexOf( '/' ) != -1 ) {
                    datetime_format = 'M/D/YYYY HH:mm:ss';
                }
                return Number( moment( value, datetime_format ).format( 'YYYYMMDDHHmmss' ) );
            default:
                return String( value );
        }
    }

    /**
     * Create an inline editor for the given cell.
     *
     * @param  {HTMLElement} cell       - The HTML Element for this cell.
     * @param  {Object}      properties - The list of properties for this column.
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
            value = Number_Utility.from_currency( value );
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


        if( properties.type == 'dropdown' ) {
            let options = '';
            let keys = Object.keys( properties.options );
            for( let k in keys ) {
                let key = keys[ k ];

                let selected = '';
                if( value == key ) {
                    selected = 'selected';
                }
                options += `<option value="${key}" ${selected}>${properties.options[ key ]}</option>`;
            }
            editor = `<select class="${wsgrid_editor}_main_editor">${options}</select>`;
        }
        else {
            editor = `<input type="${properties.type}" class="${wsgrid_editor}_main_editor"`
                + ` style="width:calc( 100% - 10px );text-align:${properties.align}"`
                + ( properties.max_length ? ` maxlength="${properties.max_length}"` : '' )
                + ` value=\"${value}\" ${checked}>`;
        }

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

            self.event_trigger = event;
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

        /**
         * Force the blur event to save and close the editor.
         * @emits {click} emits event on blur of the cell editor to force the click event code to run.
         */
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
     * @param  {Event} event   - event that triggered this function.
     * @param  {HTMLObject}    - HTML object of the cell we're editing.
     * @return {Boolean}       - did the editor close?
     * @emits  {wsgri__data.cell_changed} emits event when the editor is closed and the data change has been saved.
     */
    _close_editor( event, cell ) {
        let row_id = cell.dataset.recordid;
        let column_name = cell.dataset.column;
        let new_value = cell.firstChild.value;

        if( typeof( this.events.before_close ) == 'function' ) {
            if( ! this.events.before_close.call( this, row_id, column_name, new_value ) ) {
                return false;
            }
        }

        if( cell.firstChild.type == 'checkbox' ) {
            if( cell.firstChild.checked ) {
                new_value = 1;
            }
            else {
                new_value = 0;
            }
        }

        // save the data before it's formatted.
        this.data[ row_id ][ column_name ] = new_value;

        let formatType = typeof( this.columns.format[ column_name ] );
        if( this.columns.type[ column_name ] == 'dropdown' ) {
            new_value = this.columns.options[ column_name ][ new_value ];
        }
        if( formatType == 'string' ) {
            new_value = this[ `format_${this.columns.format[ column_name ].toLowerCase()}` ]( new_value );
        }
        else if( formatType == 'function' ) {
            new_value = this.columns.format[ column_name ]( new_value, this.data[ row_id ] );
        }

        cell.innerHTML = new_value;

        this.metadata[ row_id ][ column_name ].changed = true;


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
     * @emits  {dblclick} emits event to open editor on the next editable cell.
     */
    _open_next_editor( event, cell ) {
        let current_record = cell.dataset.recordid;
        let column_id = cell.dataset.columnid;

        let next_id = Number( column_id ) + 1;
        for( let i = next_id; i <= this.columns.order.length; i++ ) {
            //if we've checked all the fields in this record move on to the next record...
            if( i == this.columns.order.length ) {
                current_record++;
                i = 0;
            }

            let current_column = this.columns.order[ i ];
            let editable = this.columns.editable[ current_column ];
            if( typeof( editable ) == 'function' ) {
                editable = editable( current_record, current_column, this.data );
            }

            if( this.columns.visible[ current_column ] && editable ) {
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
     * @param  {Event}   even   - DOM event
     * @param  {Element} cell   - HTML Element
     * @emits  {dblclick}       - Emits event to open editor on the next editable cell.
     */
    _open_previous_editor( event, cell ) {
        let current_record = cell.dataset.recordid;
        let column_id = cell.dataset.columnid;

        let next_id = Number( column_id ) - 1;
        for( let i = next_id; i >= 0; i-- ) {
            //if we've checked all the fields in this record move on to the next record...
            if( i == 0 ) {
                current_record--;
                i = this.columns.order.length - 1;
            }

            let current_column = this.columns.order[ i ];
            let editable = this.columns.editable[ current_column ];
            if( typeof( editable ) == 'function' ) {
                editable = editable( current_record, current_column, this.data );
            }

            if( this.columns.visible[ current_column ] && editable ) {
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
     * Copy the data, in the grid, to the clipboard in a form that can be
     * pasted into a spreadsheet.
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

    /**
     * Import and export column settings for this grid.
     * This function will merge existing sub settings with any settings passed in.
     * The structure of the settings object is as follows:
     *
     * @param  {Object} settings     - Optional. Settings object containing properties for columns.
     * @return {Object}              - Contains all settings for all column properties.
     *                                 NOTE: Only returned when no settings object is passed in.
     *
     * Note: your data types should be correct for the numbers and boolean values.
     *
     * ie. Combining the following objects would result in the final object below:
     *
     * built-in: {                 |    settings: {
     *    width: {                 |        width: {
     *        order_number: 150,   |            order_number: 200,
     *        date: 150,           |            rga_number: 100,
     *    },                       |        },
     *    visible: {               |        visible: {
     *      id: false,             |            po_number: true,
     *      order_number: true,    |            rga_number: false,
     *      po_number: false,      |        }
     *    }                        |    }
     * }                           |
     *
     * final: {
     *     width: {
     *         order_number: 200,
     *         date: 150,
     *         rga_number: 100,
     *     },
     *     visible: {
     *         id: false,
     *         order_number: true,
     *         po_number: true,
     *         rga_number: false,
     *     }
     * }
     */
    column_settings( settings ) {

        if( typeof( settings ) == 'undefined' ) {
            return this.columns;
        }
        else {
            let keys = Object.keys( this.columns );

            for( let key of keys ) {
                if( typeof( settings[ key ] ) !== 'undefined' ) {
                    Object.assign( this.columns[ key ], settings[ key ] );
                }
            }
        }
    }

    /**
     * Reset the columns to their default states.
     */
    reset_columns() {

        this._create_lookup_tables();
        this.refresh();
    }

    /**********************************************************************
     * server functions
     **********************************************************************/

    fetch_data( options ) {

        let request_options = Object.assign( {}, this.connection_options, options );
        this.connection.request( request_options );

    }

    /**********************************************************************
     * Format functions
     **********************************************************************/

    /**
     * Format a given value with a 'X' or ''
     * @param  {String} cell_value   - Value to be formatted: 1 or 0
     * @return {String}              - Formatted string
     */
    format_boolean( cell_value ) {
        if( Number( cell_value ) == 1 ) {
            return "X";
        }

        return '';
    }

    /**
     * Format a given value as a date in the form of M/D/YYYY
     * @param  {String} cell_value    - Date in form or YYYY-MM-DD or M/D/YYYY
     * @return {String}              - Formatted date of M/D/YYYY
     */
    format_date( cell_value ) {
        if( cell_value == ''
            || cell_value == undefined
            || cell_value == '0000-00-00' ) {
            return '';
        }

        let format = 'YYYY-MM-DD';

        if( cell_value.indexOf( '/' ) >= 0 ) {
            format = 'M/D/YYYY';
        }

        let date = moment( cell_value, format );
        return date.format( 'M/D/YYYY' );
    }

    /**
     * format the data as currency, a custom user function can override the default abilty.
     * @param  {String} cell_value     - Value to format
     * @return {String}               - Formatted value
     */
    format_currency( cell_value ) {
        // Check for a user defined currency function first.
        if( typeof( this.currency ) == 'function' ) {
            return this.currency( cell_value );
        }

        let value = Number_Utility.from_currency( cell_value );
        return Number_Utility.to_currency( value );
    }

    /**
     * Format the data by hiding all zero values.
     *
     * @param  {String/Number} cell_value   - value of the cell.
     * @return {String}                     - Either the original value or '' if value is 0.
     */
    format_nonzero( cell_value ) {

        if( Number( cell_value ) == 0 ) {
            return '';
        }

        return cell_value;
    }
};
