/**
 * The connection object is a generic way of handling getting data to and from the grid.
 * it allows new methods of getting and posting data without having to hack apart the
 * grid to make it work.
 */

export class Connection {
    constructor( options ) {

    }

    close() {

    }
    /**
     * make a request to the server for data
     * @param  {Object} options  - an object containing all the options that are needed
     * @return {Promise}         - all requests for data should return a promise so we
     *                             can change events after the requests return.
     */
    send( options ) {

    }

    receive() {

    }
}

/**
 * Factory class for creating connection objects.
 * There are two types by default. WebSocket, and AJAX.
 *
 * All types of connections should implement the
 * virtual Connection class, by extending it.
 */
class ConnectionFactor {
    constructor() {
        this._types = {};
    }

    /**
     * Register a new Object type with this factory.
     * @param  {String} type     - A descriptive name for this object.
     * @param  {Object} classObj - The actual class that needs to be constructed.
     */
    register( type, classObj ) {
        this._types[ type ] = classObj;
    }

    /**
     * Create a connection of 'type', with options applied to it.
     * @param  {String} type    - Descriptive name for the object type we want to instantiate.
     * @param  {Object} options - Object of options used to create the object.
     * @return {Object}         - An instance of the class 'type'.
     */
    create_connection( options ) {
        let Conn = this._types[ options.type ];
        return new Conn( options );
    }
}

export let CreateConnection = new ConnectionFactor();
