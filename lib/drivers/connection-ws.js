"use strict";
/**
 * transport-ws.ts - handles low level communication with sqlitecloud server via socket.io websocket
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteCloudWebsocketConnection = void 0;
const socket_io_client_1 = require("socket.io-client");
const connection_1 = require("./connection");
const rowset_1 = require("./rowset");
const types_1 = require("./types");
/**
 * Implementation of TransportConnection that connects to the database indirectly
 * via SQLite Cloud Gateway, a socket.io based deamon that responds to sql query
 * requests by returning results and rowsets in json format. The gateway handles
 * connect, disconnect, retries, order of operations, timeouts, etc.
 */
class SQLiteCloudWebsocketConnection extends connection_1.SQLiteCloudConnection {
    /** True if connection is open */
    get connected() {
        var _a;
        return !!(this.socket && ((_a = this.socket) === null || _a === void 0 ? void 0 : _a.connected));
    }
    /* Opens a connection with the server and sends the initialization commands. Will throw in case of errors. */
    connectTransport(config, callback) {
        var _a;
        try {
            // connection established while we were waiting in line?
            console.assert(!this.connected, 'Connection already established');
            if (!this.socket) {
                this.config = config;
                const connectionstring = this.config.connectionstring;
                const gatewayUrl = ((_a = this.config) === null || _a === void 0 ? void 0 : _a.gatewayurl) || `${this.config.host === 'localhost' ? 'ws' : 'wss'}://${this.config.host}:4000`;
                this.socket = (0, socket_io_client_1.io)(gatewayUrl, { auth: { token: connectionstring } });
                this.socket.on('connect', () => {
                    callback === null || callback === void 0 ? void 0 : callback.call(this, null);
                });
                this.socket.on('disconnect', (reason) => {
                    this.close();
                    callback === null || callback === void 0 ? void 0 : callback.call(this, new types_1.SQLiteCloudError('Disconnected', { errorCode: 'ERR_CONNECTION_ENDED', cause: reason }));
                });
                this.socket.on('error', (error) => {
                    this.close();
                    callback === null || callback === void 0 ? void 0 : callback.call(this, new types_1.SQLiteCloudError('Connection error', { errorCode: 'ERR_CONNECTION_ERROR', cause: error }));
                });
            }
        }
        catch (error) {
            callback === null || callback === void 0 ? void 0 : callback.call(this, error);
        }
        return this;
    }
    /** Will send a command immediately (no queueing), return the rowset/result or throw an error */
    transportCommands(commands, callback) {
        // connection needs to be established?
        if (!this.socket) {
            callback === null || callback === void 0 ? void 0 : callback.call(this, new types_1.SQLiteCloudError('Connection not established', { errorCode: 'ERR_CONNECTION_NOT_ESTABLISHED' }));
            return this;
        }
        if (typeof commands === 'string') {
            commands = { query: commands };
        }
        this.socket.emit('GET /v2/weblite/sql', { sql: commands.query, bind: commands.parameters, row: 'array' }, (response) => {
            if (response === null || response === void 0 ? void 0 : response.error) {
                const error = new types_1.SQLiteCloudError(response.error.detail, Object.assign({}, response.error));
                callback === null || callback === void 0 ? void 0 : callback.call(this, error);
            }
            else {
                const { data, metadata } = response;
                if (data && metadata) {
                    if (metadata.numberOfRows !== undefined && metadata.numberOfColumns !== undefined && metadata.columns !== undefined) {
                        console.assert(Array.isArray(data), 'SQLiteCloudWebsocketConnection.transportCommands - data is not an array');
                        // we can recreate a SQLiteCloudRowset from the response which we know to be an array of arrays
                        const rowset = new rowset_1.SQLiteCloudRowset(metadata, data.flat());
                        callback === null || callback === void 0 ? void 0 : callback.call(this, null, rowset);
                        return;
                    }
                }
                callback === null || callback === void 0 ? void 0 : callback.call(this, null, response === null || response === void 0 ? void 0 : response.data);
            }
        });
        return this;
    }
    /** Disconnect socket.io from server */
    close() {
        var _a, _b;
        console.assert(this.socket !== null, 'SQLiteCloudWebsocketConnection.close - connection already closed');
        if (this.socket) {
            (_a = this.socket) === null || _a === void 0 ? void 0 : _a.removeAllListeners();
            (_b = this.socket) === null || _b === void 0 ? void 0 : _b.close();
            this.socket = undefined;
        }
        this.operations.clear();
        return this;
    }
}
exports.SQLiteCloudWebsocketConnection = SQLiteCloudWebsocketConnection;
exports.default = SQLiteCloudWebsocketConnection;
