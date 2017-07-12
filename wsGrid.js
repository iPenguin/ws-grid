/**
 *
 *
 * id:
 * height:
 * width:
 * column_defaults: - Default values for columns.
 * column_model:
 *    name        - String  - name of the column in the data.
 *    label       - String  - Label to put in the column header.
 *    width       - Number  - minimum width of the column.
 *    align       - String  - text alignment, left, right, center.
 *    fixed       - Boolean - is the width of this column fixed?
 *    hidden      - Boolean - is the field hidden?
 **/

let column_defaults = {
    name:   '',
    label:  '',
    width:  100,
    align:  'left',
    fixed:  true,
    hidden: false,
};

export class wsGrid {
    constructor( options ) {

        this._required_options( options, [
            'id', 'column_model', 'height', 'width',
        ] );

        let grid_defaults = {
            height: 200,
            width:  200,
        };

        //extend the default options with the user options
        let allOptions = Object.assign( {}, grid_defaults, options );

        this._setup_object( allOptions );

        this.grid = document.getElementById( this.id );

        this._parse_column_info();
        this.generate_grid();
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
     * Generate the grid from scratch
     * @return {[type]} [description]
     */
    generate_grid() {
        let column_count = this.column_model.length;
        let table_header = '<tr class="wsgrid__header_row">';

        for( let i = 0; i < column_count; i++ ) {
            let isHidden = this.column_model[ i ].hidden;
            if( typeof( isHidden ) !== 'undefined' && isHidden == true ) {
                continue;
            }
            let column_name = this.column_model[ i ].name;
            table_header += '<th class="wsgrid__header_column'
                + ' wsgrid__header_column_' + column_name + '" '
                + `style="width:${this.column_widths[ i ]}px;`
                + '">'
                + this.column_model[ i ].label
                + '</th>';
        }
        table_header += '</tr>';

        let html = '<table class="wsgrid__table wsgrid__table_' + this.id + '">'
            + '    <thead class="wsgrid__head">'
            + table_header
            + '    </thead>'
            + `<tbody class="wsgrid__body" style="height:${this.height}px;">`
            + '    </tbody>'
            + '</table>';

        this.grid.innerHTML = html;
    }

    fill_grid( data ) {
        let table_body = document.querySelector( 'table.wsgrid__table_' + this.id + ' .wsgrid__body' );

        let rowHtml = '';
        let count = data.length;
        for( let i = 0; i < count; i++ ) {
            let classes = 'wsgrid__row';

            if( i % 2 == 0 ) {
                classes += ' wsgrid__row_even ';
            }
            else {
                classes += ' wsgrid__row_odd ';
            }

            rowHtml += '<tr class="' + classes + '">';
            let col_count = this.column_model.length;
            for( let j = 0; j < col_count; j++ ) {
                let isHidden = this.column_model[ j ].hidden;

                if( typeof( isHidden ) !== 'undefined' && isHidden == true ) {
                    continue;
                }
                let column_name =  this.column_model[ j ].name;
                rowHtml += `<td class="wsgrid_column_${column_name}"`
                    + `style="width:${this.column_widths[j]}px;">`
                    + data[ i ][ column_name ]
                    + '</td>';
            }
            rowHtml += '</tr>';
        }

        table_body.innerHTML = rowHtml;
    }

};
