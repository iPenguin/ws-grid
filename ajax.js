/**
 *
 */

import { Connection, CreateConnection } from './connection.js';

export class Ajax extends Connection {
    constructor( options = {} ) {
        this.super( options );
    }

    send() {
        return new Promise();
    }

    /**
     * Ajax connections don't have a permanent connection
     * so close always return true.
     */

    close() {
        return true;
    }

}

CreateConnection.register( 'Ajax', Ajax );
