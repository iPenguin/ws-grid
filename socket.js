/**
 *
 * Options:
 *
 *
 */
import { Connection, CreateConnection } from './connection.js';

export class Socket extends Connection {
    constructor( options = {} ) {
        super( options );

        if( typeof( options.url ) == 'undefined' || options.url == '' ) {
            throw new Error( "Socket: missing required url" );
        }

        this.is_connected = new Promise( ( resolve, reject ) => {
            this.socket = new WebSocket( options.url );
            this.socket.addEventListener( 'message', this.receive );
            this.socket.addEventListener( 'open', resolve );
            this.socket.addEventListener( 'close', reject );
            this.socket.addEventListener( 'error', this.error );
        } );
    }

    /**
     * Send data to the server, this function guarantees that the data will
     * be sent to the server as long as the connection is opened.
     *
     * data can be either a string or object, if it's an object it will be
     * flattened as JSON and returned to the server stringified.
     *
     * @param  {Object/String} data - a data packet to send to the server.
     */
    send( data ) {
        this.is_connected.then( () => {
            let send_data = '';
            if( typeof( data ) == 'object' ) {
                send_data = JSON.stringify( data );
            }
            else {
                send_data = data;
            }
            this.socket.send( send_data );
        } );
    }

    /**
     * receive data from the server and process and dispatch it.
     * @return {[type]} [description]
     */
    receive( event ) {
        console.log( event );
        if( event.data ) {
        }
    }

    /**
     * error handler event
     * @param  {[type]} event [description]
     * @return {[type]}       [description]
     */
    error( event ) {

    }

    /**
     * close the socket, using a promise so you can chain events
     * on closing the socket.
     *
     * @return {Promise} - Success means the connection is now closed.
     */
    close() {
        return new Promise( ( resolve, reject ) => {
            this.socket.addEventListener( 'close', resolve );
            this.socket.close();
        } );
    }
}

CreateConnection.register( 'Socket', Socket );
