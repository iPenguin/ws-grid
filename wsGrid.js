/**
 *
 *
 *
 *
 **/
export class wsGrid {
    constructor( options ) {

        this._required_options( options, [
            'id', 'column_model', 'height', 'width',
        ] );

        let defaults = {
            height: 200,
            width:  200,
        };

        //extend the default options with the user options
        let allOptions = Object.assign( {}, defaults, options );

        this._setup_object( allOptions );

        this.grid = document.getElementById( this.id );

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
                + 'style="width:' + this.column_model[ i ].width + 'px;'
                + 'height:' + this.column_model[ i ].height + 'px;'
                + '">'
                + this.column_model[ i ].label
                + '</th>';
        }
        table_header += '</tr>';

        let html = '<table class="wsgrid__table wsgrid__table_' + this.id + '" '
            //+ 'style="height: ' + this.height + 'px; overflow-y: auto;'
            //+ 'width:' + this.width + 'px;overflow-x: auto;">'
            + '">'
            + '    <thead class="wsgrid__head">'
            + table_header
            + '    </thead>'
            + '    <tbody class="wsgrid__body"'
            + 'style="width: ' + this.width + 'px;'
            + 'height:' + this.height + 'px;">'
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
                classes += ' wsgrid_row_even';
            }
            else {
                classes += ' wsgrid_row_odd';
            }

            rowHtml += '<tr classes="' + classes + '">';
            let col_count = this.column_model.length;
            for( let j = 0; j < col_count; j++ ) {
                let isHidden = this.column_model[ j ].hidden;

                if( typeof( isHidden ) !== 'undefined' && isHidden == true ) {
                    continue;
                }
                let column_name =  this.column_model[ j ].name;
                rowHtml += '<td classes="wsgrid_column_' + column_name + '"'
                    + 'style="height:' + this.column_model[ j ].height + 'px;'
                    + 'width:' + this.column_model[ j ].width + 'px;"'
                    + '>'
                    + data[ i ][ column_name ]
                    + '</td>';
            }
            rowHtml += '</tr>';
        }

        table_body.innerHTML = rowHtml;
    }

};
