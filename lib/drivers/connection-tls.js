"use strict";
/**
 * connection-tls.ts - connection via tls socket and sqlitecloud protocol
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteCloudTlsConnection = void 0;
const connection_1 = require("./connection");
const protocol_1 = require("./protocol");
const types_1 = require("./types");
const utilities_1 = require("./utilities");
// explicitly importing buffer library to allow cross-platform support by replacing it
const buffer_1 = require("buffer");
const tls = __importStar(require("tls"));
/**
 * Implementation of SQLiteCloudConnection that connects to the database using specific tls APIs
 * that connect to native sockets or tls sockets and communicates via raw, binary protocol.
 */
class SQLiteCloudTlsConnection extends connection_1.SQLiteCloudConnection {
    constructor() {
        super(...arguments);
        // processCommands sets up empty buffers, results callback then send the command to the server via socket.write
        // onData is called when data is received, it will process the data until all data is retrieved for a response
        // when response is complete or there's an error, finish is called to call the results callback set by processCommands...
        // buffer to accumulate incoming data until an whole command is received and can be parsed
        this.buffer = buffer_1.Buffer.alloc(0);
        this.startedOn = new Date();
        this.pendingChunks = [];
    }
    /** True if connection is open */
    get connected() {
        return !!this.socket;
    }
    /* Opens a connection with the server and sends the initialization commands. Will throw in case of errors. */
    connectTransport(config, callback) {
        console.assert(!this.connected, 'SQLiteCloudTlsConnection.connect - connection already established');
        if (this.config.verbose) {
            console.debug(`-> connecting ${config === null || config === void 0 ? void 0 : config.host}:${config === null || config === void 0 ? void 0 : config.port}`);
        }
        this.config = config;
        const initializationCommands = (0, utilities_1.getInitializationCommands)(config);
        // connect to plain socket, without encryption, only if insecure parameter specified
        // this option is mainly for testing purposes and is not available on production nodes
        // which would need to connect using tls and proper certificates as per code below
        const connectionOptions = {
            host: config.host,
            port: config.port,
            rejectUnauthorized: config.host != 'localhost',
            // Server name for the SNI (Server Name Indication) TLS extension.
            // https://r2.nodejs.org/docs/v6.11.4/api/tls.html#tls_class_tls_tlssocket
            servername: config.host
        };
        // tls.connect in the react-native-tcp-socket library is tls.connectTLS
        let connector = tls.connect;
        // @ts-ignore
        if (typeof tls.connectTLS !== 'undefined') {
            // @ts-ignore
            connector = tls.connectTLS;
        }
        this.socket = connector(connectionOptions, () => {
            var _a;
            if (this.config.verbose) {
                console.debug(`SQLiteCloudTlsConnection - connected to ${this.config.host}, authorized: ${(_a = this.socket) === null || _a === void 0 ? void 0 : _a.authorized}`);
            }
            this.transportCommands(initializationCommands, error => {
                if (this.config.verbose) {
                    console.debug(`SQLiteCloudTlsConnection - initialized connection`);
                }
                callback === null || callback === void 0 ? void 0 : callback.call(this, error);
            });
        });
        this.socket.setKeepAlive(true);
        // disable Nagle algorithm because we want our writes to be sent ASAP
        // https://brooker.co.za/blog/2024/05/09/nagle.html
        this.socket.setNoDelay(true);
        this.socket.on('data', data => {
            this.processCommandsData(data);
        });
        this.socket.on('error', error => {
            this.close();
            this.processCommandsFinish(new types_1.SQLiteCloudError('Connection error', { errorCode: 'ERR_CONNECTION_ERROR', cause: error }));
        });
        this.socket.on('end', () => {
            this.close();
            if (this.processCallback)
                this.processCommandsFinish(new types_1.SQLiteCloudError('Server ended the connection', { errorCode: 'ERR_CONNECTION_ENDED' }));
        });
        this.socket.on('close', () => {
            this.close();
            this.processCommandsFinish(new types_1.SQLiteCloudError('Connection closed', { errorCode: 'ERR_CONNECTION_CLOSED' }));
        });
        this.socket.on('timeout', () => {
            this.close();
            this.processCommandsFinish(new types_1.SQLiteCloudError('Connection ened due to timeout', { errorCode: 'ERR_CONNECTION_TIMEOUT' }));
        });
        return this;
    }
    /** Will send a command immediately (no queueing), return the rowset/result or throw an error */
    transportCommands(commands, callback) {
        var _a, _b, _c, _d, _e;
        // connection needs to be established?
        if (!this.socket) {
            callback === null || callback === void 0 ? void 0 : callback.call(this, new types_1.SQLiteCloudError('Connection not established', { errorCode: 'ERR_CONNECTION_NOT_ESTABLISHED' }));
            return this;
        }
        if (typeof commands === 'string') {
            commands = { query: commands };
        }
        // reset buffer and rowset chunks, define response callback
        this.buffer = buffer_1.Buffer.alloc(0);
        this.startedOn = new Date();
        this.processCallback = callback;
        this.executingCommands = commands;
        // compose commands following SCPC protocol
        const formattedCommands = (0, protocol_1.formatCommand)(commands);
        if ((_a = this.config) === null || _a === void 0 ? void 0 : _a.verbose) {
            console.debug(`-> ${formattedCommands}`);
        }
        const timeoutMs = (_c = (_b = this.config) === null || _b === void 0 ? void 0 : _b.timeout) !== null && _c !== void 0 ? _c : 0;
        if (timeoutMs > 0) {
            const timeout = setTimeout(() => {
                var _a;
                callback === null || callback === void 0 ? void 0 : callback.call(this, new types_1.SQLiteCloudError('Connection timeout out', { errorCode: 'ERR_CONNECTION_TIMEOUT' }));
                (_a = this.socket) === null || _a === void 0 ? void 0 : _a.destroy();
                this.socket = undefined;
            }, timeoutMs);
            (_d = this.socket) === null || _d === void 0 ? void 0 : _d.write(formattedCommands, 'utf-8', () => {
                clearTimeout(timeout); // Clear the timeout on successful write
            });
        }
        else {
            (_e = this.socket) === null || _e === void 0 ? void 0 : _e.write(formattedCommands, 'utf-8');
        }
        return this;
    }
    /** Handles data received in response to an outbound command sent by processCommands */
    processCommandsData(data) {
        var _a, _b, _c, _d, _e, _f, _g;
        try {
            // append data to buffer as it arrives
            if (data.length && data.length > 0) {
                // console.debug(`processCommandsData - received ${data.length} bytes`)
                this.buffer = buffer_1.Buffer.concat([this.buffer, data]);
            }
            let dataType = (_a = this.buffer) === null || _a === void 0 ? void 0 : _a.subarray(0, 1).toString();
            if ((0, protocol_1.hasCommandLength)(dataType)) {
                const commandLength = (0, protocol_1.parseCommandLength)(this.buffer);
                const hasReceivedEntireCommand = this.buffer.length - this.buffer.indexOf(' ') - 1 >= commandLength ? true : false;
                if (hasReceivedEntireCommand) {
                    if ((_b = this.config) === null || _b === void 0 ? void 0 : _b.verbose) {
                        let bufferString = this.buffer.toString('utf8');
                        if (bufferString.length > 1000) {
                            bufferString = bufferString.substring(0, 100) + '...' + bufferString.substring(bufferString.length - 40);
                        }
                        const elapsedMs = new Date().getTime() - this.startedOn.getTime();
                        console.debug(`<- ${bufferString} (${bufferString.length} bytes, ${elapsedMs}ms)`);
                    }
                    // need to decompress this buffer before decoding?
                    if (dataType === protocol_1.CMD_COMPRESSED) {
                        const decompressResults = (0, protocol_1.decompressBuffer)(this.buffer);
                        if (decompressResults.dataType === protocol_1.CMD_ROWSET_CHUNK) {
                            this.pendingChunks.push(decompressResults.buffer);
                            this.buffer = decompressResults.remainingBuffer;
                            this.processCommandsData(buffer_1.Buffer.alloc(0));
                            return;
                        }
                        else {
                            const { data } = (0, protocol_1.popData)(decompressResults.buffer);
                            (_c = this.processCommandsFinish) === null || _c === void 0 ? void 0 : _c.call(this, null, data);
                        }
                    }
                    else {
                        if (dataType !== protocol_1.CMD_ROWSET_CHUNK) {
                            const { data } = (0, protocol_1.popData)(this.buffer);
                            (_d = this.processCommandsFinish) === null || _d === void 0 ? void 0 : _d.call(this, null, data);
                        }
                        else {
                            const completeChunk = (0, protocol_1.bufferEndsWith)(this.buffer, protocol_1.ROWSET_CHUNKS_END);
                            if (completeChunk) {
                                const parsedData = (0, protocol_1.parseRowsetChunks)([...this.pendingChunks, this.buffer]);
                                (_e = this.processCommandsFinish) === null || _e === void 0 ? void 0 : _e.call(this, null, parsedData);
                            }
                        }
                    }
                }
            }
            else {
                // command with no explicit len so make sure that the final character is a space
                const lastChar = this.buffer.subarray(this.buffer.length - 1, this.buffer.length).toString('utf8');
                if (lastChar == ' ') {
                    const { data } = (0, protocol_1.popData)(this.buffer);
                    (_f = this.processCommandsFinish) === null || _f === void 0 ? void 0 : _f.call(this, null, data);
                }
            }
        }
        catch (error) {
            console.error(`processCommandsData - error: ${error}`);
            console.assert(error instanceof Error, 'An error occoured while processing data');
            if (error instanceof Error) {
                (_g = this.processCommandsFinish) === null || _g === void 0 ? void 0 : _g.call(this, error);
            }
        }
    }
    /** Completes a transaction initiated by processCommands */
    processCommandsFinish(error, result) {
        if (error) {
            if (this.processCallback) {
                console.error('processCommandsFinish - error', error);
            }
            else {
                console.warn('processCommandsFinish - error with no registered callback', error);
            }
        }
        if (this.processCallback) {
            this.processCallback(error, result);
        }
        this.buffer = buffer_1.Buffer.alloc(0);
        this.pendingChunks = [];
    }
    /** Disconnect immediately, release connection, no events. */
    close() {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.destroy();
            this.socket = undefined;
        }
        this.operations.clear();
        return this;
    }
}
exports.SQLiteCloudTlsConnection = SQLiteCloudTlsConnection;
exports.default = SQLiteCloudTlsConnection;
