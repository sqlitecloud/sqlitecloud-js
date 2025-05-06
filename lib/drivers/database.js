"use strict";
//
// database.ts - database driver api, implements and extends sqlite3
//
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
// Trying as much as possible to be a drop-in replacement for SQLite3 API
// https://github.com/TryGhost/node-sqlite3/wiki/API
// https://github.com/TryGhost/node-sqlite3
// https://github.com/TryGhost/node-sqlite3/blob/master/lib/sqlite3.d.ts
const eventemitter3_1 = __importDefault(require("eventemitter3"));
const pubsub_1 = require("./pubsub");
const queue_1 = require("./queue");
const rowset_1 = require("./rowset");
const statement_1 = require("./statement");
const types_1 = require("./types");
const utilities_1 = require("./utilities");
// Uses eventemitter3 instead of node events for browser compatibility
// https://github.com/primus/eventemitter3
/**
 * Creating a Database object automatically opens a connection to the SQLite database.
 * When the connection is established the Database object emits an open event and calls
 * the optional provided callback. If the connection cannot be established an error event
 * will be emitted and the optional callback is called with the error information.
 */
class Database extends eventemitter3_1.default {
    constructor(config, mode, callback) {
        super();
        /** Used to syncronize opening of connection and commands */
        this.operations = new queue_1.OperationsQueue();
        this.config = typeof config === 'string' ? { connectionstring: config } : config;
        this.connection = null;
        // mode is optional and so is callback
        // https://github.com/TryGhost/node-sqlite3/wiki/API#new-sqlite3databasefilename--mode--callback
        if (typeof mode === 'function') {
            callback = mode;
            mode = undefined;
        }
        // mode is ignored for now
        // opens the connection to the database automatically
        this.createConnection(error => {
            if (callback) {
                callback.call(this, error);
            }
        });
    }
    //
    // private methods
    //
    /** Returns first available connection from connection pool */
    createConnection(callback) {
        var _a, _b;
        // connect using websocket if tls is not supported or if explicitly requested
        const useWebsocket = utilities_1.isBrowser || ((_a = this.config) === null || _a === void 0 ? void 0 : _a.usewebsocket) || ((_b = this.config) === null || _b === void 0 ? void 0 : _b.gatewayurl);
        if (useWebsocket) {
            // socket.io transport works in both node.js and browser environments and connects via SQLite Cloud Gateway
            this.operations.enqueue(done => {
                Promise.resolve().then(() => __importStar(require('./connection-ws'))).then(module => {
                    this.connection = new module.default(this.config, (error) => {
                        if (error) {
                            this.handleError(error, callback);
                        }
                        else {
                            callback === null || callback === void 0 ? void 0 : callback.call(this, null);
                            this.emitEvent('open');
                        }
                        done(error);
                    });
                })
                    .catch(error => {
                    this.handleError(error, callback);
                    this.close();
                    done(error);
                });
            });
        }
        else {
            this.operations.enqueue(done => {
                Promise.resolve().then(() => __importStar(require('./connection-tls'))).then(module => {
                    this.connection = new module.default(this.config, (error) => {
                        if (error) {
                            this.handleError(error, callback);
                        }
                        else {
                            callback === null || callback === void 0 ? void 0 : callback.call(this, null);
                            this.emitEvent('open');
                        }
                        done(error);
                    });
                })
                    .catch(error => {
                    this.handleError(error, callback);
                    this.close();
                    done(error);
                });
            });
        }
    }
    enqueueCommand(command, callback) {
        this.operations.enqueue(done => {
            let error = null;
            // we don't wont to silently open a new connection after a disconnession
            if (this.connection && this.connection.connected) {
                this.connection.sendCommands(command, (error, results) => {
                    callback === null || callback === void 0 ? void 0 : callback.call(this, error, results);
                    done(error);
                });
            }
            else {
                error = new types_1.SQLiteCloudError('Connection unavailable. Maybe it got disconnected?', { errorCode: 'ERR_CONNECTION_NOT_ESTABLISHED' });
                callback === null || callback === void 0 ? void 0 : callback.call(this, error, null);
                done(error);
            }
        });
    }
    /** Handles an error by closing the connection, calling the callback and/or emitting an error event */
    handleError(error, callback) {
        if (callback) {
            callback.call(this, error);
        }
        else {
            this.emitEvent('error', error);
        }
    }
    /**
     * Some queries like inserts or updates processed via run or exec may generate
     * an empty result (eg. no data was selected), but still have some metadata.
     * For example the server may pass the id of the last row that was modified.
     * In this case the callback results should be empty but the context may contain
     * additional information like lastID, etc.
     * @see https://github.com/TryGhost/node-sqlite3/wiki/API#runsql--param---callback
     * @param results Results received from the server
     * @returns A context object if one makes sense, otherwise undefined
     */
    processContext(results) {
        if (results) {
            if (Array.isArray(results) && results.length > 0) {
                switch (results[0]) {
                    case types_1.SQLiteCloudArrayType.ARRAY_TYPE_SQLITE_EXEC:
                        return {
                            lastID: results[2], // ROWID (sqlite3_last_insert_rowid)
                            changes: results[3], // CHANGES(sqlite3_changes)
                            totalChanges: results[4], // TOTAL_CHANGES (sqlite3_total_changes)
                            finalized: results[5] // FINALIZED
                        };
                }
            }
        }
        return undefined;
    }
    /** Emits given event with optional arguments on the next tick so callbacks can complete first */
    emitEvent(event, ...args) {
        setTimeout(() => {
            this.emit(event, ...args);
        }, 0);
    }
    //
    // public methods
    //
    /**
     * Returns the configuration with which this database was opened.
     * The configuration is readonly and cannot be changed as there may
     * be multiple connections using the same configuration.
     * @returns {SQLiteCloudConfig} A configuration object
     */
    getConfiguration() {
        return JSON.parse(JSON.stringify(this.config));
    }
    /** Enable verbose mode */
    verbose() {
        var _a;
        this.config.verbose = true;
        (_a = this.connection) === null || _a === void 0 ? void 0 : _a.verbose();
        return this;
    }
    /** Set a configuration option for the database */
    configure(_option, _value) {
        // https://github.com/TryGhost/node-sqlite3/wiki/API#configureoption-value
        return this;
    }
    run(sql, ...params) {
        const { args, callback } = (0, utilities_1.popCallback)(params);
        const command = { query: sql, parameters: args };
        this.enqueueCommand(command, (error, results) => {
            if (error) {
                this.handleError(error, callback);
            }
            else {
                // context may include id of last row inserted, total changes, etc...
                const context = this.processContext(results);
                callback === null || callback === void 0 ? void 0 : callback.call(context || this, null, context ? context : results);
            }
        });
        return this;
    }
    get(sql, ...params) {
        const { args, callback } = (0, utilities_1.popCallback)(params);
        const command = { query: sql, parameters: args };
        this.enqueueCommand(command, (error, results) => {
            if (error) {
                this.handleError(error, callback);
            }
            else {
                if (results && results instanceof rowset_1.SQLiteCloudRowset && results.length > 0) {
                    callback === null || callback === void 0 ? void 0 : callback.call(this, null, results[0]);
                }
                else {
                    callback === null || callback === void 0 ? void 0 : callback.call(this, null);
                }
            }
        });
        return this;
    }
    all(sql, ...params) {
        const { args, callback } = (0, utilities_1.popCallback)(params);
        const command = { query: sql, parameters: args };
        this.enqueueCommand(command, (error, results) => {
            if (error) {
                this.handleError(error, callback);
            }
            else {
                if (results && results instanceof rowset_1.SQLiteCloudRowset) {
                    callback === null || callback === void 0 ? void 0 : callback.call(this, null, results);
                }
                else {
                    callback === null || callback === void 0 ? void 0 : callback.call(this, null);
                }
            }
        });
        return this;
    }
    each(sql, ...params) {
        // extract optional parameters and one or two callbacks
        const { args, callback, complete } = (0, utilities_1.popCallback)(params);
        const command = { query: sql, parameters: args };
        this.enqueueCommand(command, (error, rowset) => {
            if (error) {
                this.handleError(error, callback);
            }
            else {
                if (rowset && rowset instanceof rowset_1.SQLiteCloudRowset) {
                    if (callback) {
                        for (const row of rowset) {
                            callback.call(this, null, row);
                        }
                    }
                    if (complete) {
                        ;
                        complete.call(this, null, rowset.numberOfRows);
                    }
                }
                else {
                    callback === null || callback === void 0 ? void 0 : callback.call(this, new types_1.SQLiteCloudError('Invalid rowset'));
                }
            }
        });
        return this;
    }
    /**
     * Prepares the SQL statement and optionally binds the specified parameters and
     * calls the callback when done. The function returns a Statement object.
     * When preparing was successful, the first and only argument to the callback
     * is null, otherwise it is the error object. When bind parameters are supplied,
     * they are bound to the prepared statement before calling the callback.
     */
    prepare(sql, ...params) {
        return new statement_1.Statement(this, sql, ...params);
    }
    /**
     * Runs all SQL queries in the supplied string. No result rows are retrieved.
     * The function returns the Database object to allow for function chaining.
     * If a query fails, no subsequent statements will be executed (wrap it in a
     * transaction if you want all or none to be executed). When all statements
     * have been executed successfully, or when an error occurs, the callback
     * function is called, with the first parameter being either null or an error
     * object. When no callback is provided and an error occurs, an error event
     * will be emitted on the database object.
     */
    exec(sql, callback) {
        this.enqueueCommand(sql, (error, results) => {
            if (error) {
                this.handleError(error, callback);
            }
            else {
                const context = this.processContext(results);
                callback === null || callback === void 0 ? void 0 : callback.call(context ? context : this, null);
            }
        });
        return this;
    }
    /**
     * If the optional callback is provided, this function will be called when the
     * database was closed successfully or when an error occurred. The first argument
     * is an error object. When it is null, closing succeeded. If no callback is provided
     * and an error occurred, an error event with the error object as the only parameter
     * will be emitted on the database object. If closing succeeded, a close event with no
     * parameters is emitted, regardless of whether a callback was provided or not.
     */
    close(callback) {
        this.operations.enqueue(done => {
            var _a;
            (_a = this.connection) === null || _a === void 0 ? void 0 : _a.close();
            callback === null || callback === void 0 ? void 0 : callback.call(this, null);
            this.emitEvent('close');
            this.operations.clear();
            done(null);
        });
    }
    /**
     * Loads a compiled SQLite extension into the database connection object.
     * @param path Filename of the extension to load.
     * @param callback  If provided, this function will be called when the extension
     * was loaded successfully or when an error occurred. The first argument is an
     * error object. When it is null, loading succeeded. If no callback is provided
     * and an error occurred, an error event with the error object as the only parameter
     * will be emitted on the database object.
     */
    loadExtension(_path, callback) {
        // TODO sqlitecloud-js / implement database loadExtension #17
        if (callback) {
            callback.call(this, new Error('Database.loadExtension - Not implemented'));
        }
        else {
            this.emitEvent('error', new Error('Database.loadExtension - Not implemented'));
        }
        return this;
    }
    /**
     * Allows the user to interrupt long-running queries. Wrapper around
     * sqlite3_interrupt and causes other data-fetching functions to be
     * passed an err with code = sqlite3.INTERRUPT. The database must be
     * open to use this function.
     */
    interrupt() {
        // TODO sqlitecloud-js / implement database interrupt #13
    }
    //
    // extended APIs
    //
    /**
     * Sql is a promise based API for executing SQL statements. You can
     * pass a simple string with a SQL statement or a template string
     * using backticks and parameters in ${parameter} format. These parameters
     * will be properly escaped and quoted like when using a prepared statement.
     * @param sql A sql string or a template string in `backticks` format
     * @returns An array of rows in case of selections or an object with
     * metadata in case of insert, update, delete.
     */
    sql(sql, ...values) {
        return __awaiter(this, void 0, void 0, function* () {
            let commands = { query: '' };
            // sql is a TemplateStringsArray, the 'raw' property is specific to TemplateStringsArray
            if (Array.isArray(sql) && 'raw' in sql) {
                let query = '';
                sql.forEach((string, i) => {
                    // TemplateStringsArray splits the string before each variable
                    // used in the template. Add the question mark
                    // to the end of the string for the number of used variables.
                    query += string + (i < values.length ? '?' : '');
                });
                commands = { query, parameters: values };
            }
            else if (typeof sql === 'string') {
                commands = { query: sql, parameters: values };
            }
            else if (typeof sql === 'object') {
                commands = sql;
            }
            else {
                throw new Error('Invalid sql');
            }
            return new Promise((resolve, reject) => {
                this.enqueueCommand(commands, (error, results) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        // metadata for operations like insert, update, delete?
                        const context = this.processContext(results);
                        resolve(context ? context : results);
                    }
                });
            });
        });
    }
    /**
     * Returns true if the database connection is open.
     */
    isConnected() {
        return this.connection != null && this.connection.connected;
    }
    /**
     * PubSub class provides a Pub/Sub real-time updates and notifications system to
     * allow multiple applications to communicate with each other asynchronously.
     * It allows applications to subscribe to tables and receive notifications whenever
     * data changes in the database table. It also enables sending messages to anyone
     * subscribed to a specific channel.
     * @returns {PubSub} A PubSub object
     */
    getPubSub() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.operations.enqueue(done => {
                    let error = null;
                    try {
                        if (!this.connection) {
                            error = new types_1.SQLiteCloudError('Connection not established', { errorCode: 'ERR_CONNECTION_NOT_ESTABLISHED' });
                            reject(error);
                        }
                        else {
                            resolve(new pubsub_1.PubSub(this.connection));
                        }
                    }
                    finally {
                        done(error);
                    }
                });
            });
        });
    }
}
exports.Database = Database;
