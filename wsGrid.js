/**
 *
 *
 *
 *
 **/
export class wsGrid {
    constructor( { url, id, column_model, } ) {

        if( typeof( id ) == undefined ) {
            throw new Error( "wsGrid: missing required --> id" );
        }

        if( typeof( column_model ) == undefined ) {
            throw new Error( "wsGrid: missing required --> column_model" );
        }

        this.id = id;
        this.grid = document.getElementById( id );
        this.column_model = column_model;


        this.generate_grid();
    }

    /**
     * Generate the grid from scratch
     * @return {[type]} [description]
     */
    generate_grid() {
        let column_count = this.column_model.length;
        let table_header = '<tr class="wsgrid__header-row">';

        for( let i = 0; i < column_count; i++ ) {
            let isHidden = this.column_model[ i ].hidden;
            if( typeof( isHidden ) !== 'undefined' && isHidden == true ) {
                continue;
            }
            let column_name = this.column_model[ i ].name;
            table_header += '<th class="wsgrid__header-column'
                + ' wsgrid__header-column-' + column_name + '">'
                + this.column_model[ i ].label
                + '</th>';
        }
        table_header += '</tr>';

        let html = '<table class="wsgrid__table wsgrid__table_' + this.id + '">'
            + '    <thead class="wsgrid__head">'
            + table_header
            + '    </thead>'
            + '    <tbody class="wsgrid__body">'
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
                let column_name =  this.column_model[ j ].name;
                rowHtml += '<td classes="wsgrid_column_' + column_name + '">'
                    + data[ i ][ column_name ]
                    + '</td>';
            }
            rowHtml += '</tr>';
        }

        table_body.innerHTML = rowHtml;
    }

};
