/**
 * This is the base object class. It contains functions that should be a part
 * of almost all objects defined in this project.
 */


export class Object_Base {
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
                throw new Error( "Grid: missing required argument: " + key );
            }
        }
    }

    /**
     * assign all the options to the object so they can be used else where in the object.
     * @param  {Object} options - An object of options to be assigned to this object.
     */
    _setup_object( options ) {
        for( let key in options ) {
            this[ key ] = options[ key ];
        }
    }

}
