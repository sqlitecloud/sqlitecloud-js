/**
 * connection.ts - base abstract class for sqlitecloud server connections
 */
import { SQLiteCloudConfig, ErrorCallback, ResultsCallback, SQLiteCloudCommand } from './types';
import { OperationsQueue } from './queue';
/**
 * Base class for SQLiteCloudConnection handles basics and defines methods.
 * Actual connection management and communication with the server in concrete classes.
 */
export declare abstract class SQLiteCloudConnection {
    /** Parse and validate provided connectionstring or configuration */
    constructor(config: SQLiteCloudConfig | string, callback?: ErrorCallback);
    /** Configuration passed by client or extracted from connection string */
    protected config: SQLiteCloudConfig;
    /** Returns the connection's configuration */
    getConfig(): SQLiteCloudConfig;
    /** Operations are serialized by waiting an any pending promises */
    protected operations: OperationsQueue;
    /** Connect will establish a tls or websocket transport to the server based on configuration and environment */
    protected connect(callback?: ErrorCallback): this;
    protected abstract connectTransport(config: SQLiteCloudConfig, callback?: ErrorCallback): this;
    /** Send a command, return the rowset/result or throw an error */
    protected abstract transportCommands(commands: string | SQLiteCloudCommand, callback?: ResultsCallback): this;
    /** Will log to console if verbose mode is enabled */
    protected log(message: string, ...optionalParams: any[]): void;
    /** Returns true if connection is open */
    abstract get connected(): boolean;
    /** Enable verbose logging for debug purposes */
    verbose(): void;
    /** Will enquee a command to be executed and callback with the resulting rowset/result/error */
    sendCommands(commands: string | SQLiteCloudCommand, callback?: ResultsCallback): this;
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
    sql(sql: TemplateStringsArray | string | SQLiteCloudCommand, ...values: any[]): Promise<any>;
    /** Disconnect from server, release transport. */
    abstract close(): this;
}
