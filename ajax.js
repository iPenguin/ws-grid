/**
 *
 */

import { Connection } from './connection.js';

export class Ajax extends Connection {
    constructor( options = {} ) {
        this.super( options );

        this.type = 'ajax';
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
