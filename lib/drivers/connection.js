"use strict";
/**
 * connection.ts - base abstract class for sqlitecloud server connections
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteCloudConnection = void 0;
const types_1 = require("./types");
const utilities_1 = require("./utilities");
const queue_1 = require("./queue");
const utilities_2 = require("./utilities");
/**
 * Base class for SQLiteCloudConnection handles basics and defines methods.
 * Actual connection management and communication with the server in concrete classes.
 */
class SQLiteCloudConnection {
    /** Parse and validate provided connectionstring or configuration */
    constructor(config, callback) {
        /** Operations are serialized by waiting an any pending promises */
        this.operations = new queue_1.OperationsQueue();
        if (typeof config === 'string') {
            this.config = (0, utilities_1.validateConfiguration)({ connectionstring: config });
        }
        else {
            this.config = (0, utilities_1.validateConfiguration)(config);
        }
        // connect transport layer to server
        this.connect(callback);
    }
    /** Returns the connection's configuration */
    getConfig() {
        return Object.assign({}, this.config);
    }
    //
    // internal methods (some are implemented in concrete classes using different transport layers)
    //
    /** Connect will establish a tls or websocket transport to the server based on configuration and environment */
    connect(callback) {
        this.operations.enqueue(done => {
            this.connectTransport(this.config, error => {
                if (error) {
                    console.error(`SQLiteCloudConnection.connect - error connecting ${this.config.host}:${this.config.port} ${error.toString()}`, error);
                    this.close();
                }
                if (callback) {
                    callback.call(this, error || null);
                }
                done(error);
            });
        });
        return this;
    }
    /** Will log to console if verbose mode is enabled */
    log(message, ...optionalParams) {
        if (this.config.verbose) {
            message = (0, utilities_2.anonimizeCommand)(message);
            console.log(`${new Date().toISOString()} ${this.config.clientid}: ${message}`, ...optionalParams);
        }
    }
    /** Enable verbose logging for debug purposes */
    verbose() {
        this.config.verbose = true;
    }
    /** Will enquee a command to be executed and callback with the resulting rowset/result/error */
    sendCommands(commands, callback) {
        this.operations.enqueue(done => {
            if (!this.connected) {
                const error = new types_1.SQLiteCloudError('Connection not established', { errorCode: 'ERR_CONNECTION_NOT_ESTABLISHED' });
                callback === null || callback === void 0 ? void 0 : callback.call(this, error);
                done(error);
            }
            else {
                this.transportCommands(commands, (error, result) => {
                    callback === null || callback === void 0 ? void 0 : callback.call(this, error, result);
                    done(error);
                });
            }
        });
        return this;
    }
    /**
     * Sql is a promise based API for executing SQL statements. You can
     * pass a simple string with a SQL statement or a template string
     * using backticks and parameters in ${parameter} format. These parameters
     * will be properly escaped and quoted like when using a prepared statement.
     * @param sql A sql string or a template string in `backticks` format
     *  A SQLiteCloudCommand when the query is defined with question marks and bindings.
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
                this.sendCommands(commands, (error, results) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        // metadata for operations like insert, update, delete?
                        const context = (0, utilities_2.getUpdateResults)(results);
                        resolve(context ? context : results);
                    }
                });
            });
        });
    }
}
exports.SQLiteCloudConnection = SQLiteCloudConnection;
