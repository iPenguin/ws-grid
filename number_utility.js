/**
 * @type {Object}
 * This file contains utilities to help with number conversion and display.
 */
export let Number_Utility = {

    /**
     * @type {function}
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
    },

    /**
     * @type {function}
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
    },

    /**
     * @type {function}
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
    },
};
