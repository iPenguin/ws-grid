/**
 * The connection object is a generic way of handling getting data to and from the grid.
 * it allows new methods of getting and posting data without having to hack apart the
 * grid to make it work.
 */

export class Connection {
    constructor( options ) {
        this._type = '';
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

    get type() {
        return this._type;
    }
    set type( value ) {
        this._type = value;
    }
}
