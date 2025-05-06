import EventEmitter from 'eventemitter3';
import { PubSub } from './pubsub';
import { Statement } from './statement';
import { ErrorCallback as ConnectionCallback, ResultsCallback, RowCallback, RowCountCallback, RowsCallback, SQLiteCloudCommand, SQLiteCloudConfig } from './types';
/**
 * Creating a Database object automatically opens a connection to the SQLite database.
 * When the connection is established the Database object emits an open event and calls
 * the optional provided callback. If the connection cannot be established an error event
 * will be emitted and the optional callback is called with the error information.
 */
export declare class Database extends EventEmitter {
    /** Create and initialize a database from a full configuration object, or connection string */
    constructor(config: SQLiteCloudConfig | string, callback?: ConnectionCallback);
    constructor(config: SQLiteCloudConfig | string, mode?: number, callback?: ConnectionCallback);
    /** Configuration used to open database connections */
    private config;
    /** Database connection */
    private connection;
    /** Used to syncronize opening of connection and commands */
    private operations;
    /** Returns first available connection from connection pool */
    private createConnection;
    private enqueueCommand;
    /** Handles an error by closing the connection, calling the callback and/or emitting an error event */
    private handleError;
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
    private processContext;
    /** Emits given event with optional arguments on the next tick so callbacks can complete first */
    private emitEvent;
    /**
     * Returns the configuration with which this database was opened.
     * The configuration is readonly and cannot be changed as there may
     * be multiple connections using the same configuration.
     * @returns {SQLiteCloudConfig} A configuration object
     */
    getConfiguration(): SQLiteCloudConfig;
    /** Enable verbose mode */
    verbose(): this;
    /** Set a configuration option for the database */
    configure(_option: string, _value: any): this;
    /**
     * Runs the SQL query with the specified parameters and calls the callback afterwards.
     * The callback will contain the results passed back from the server, for example in the
     * case of an update or insert, these would contain the number of rows modified, etc.
     * It does not retrieve any result data. The function returns the Database object for
     * which it was called to allow for function chaining.
     */
    run<T>(sql: string, callback?: ResultsCallback<T>): this;
    run<T>(sql: string, params: any, callback?: ResultsCallback<T>): this;
    /**
     * Runs the SQL query with the specified parameters and calls the callback with
     * a subsequent result row. The function returns the Database object to allow for
     * function chaining. The parameters are the same as the Database#run function,
     * with the following differences: The signature of the callback is `function(err, row) {}`.
     * If the result set is empty, the second parameter is undefined, otherwise it is an
     * object containing the values for the first row. The property names correspond to
     * the column names of the result set. It is impossible to access them by column index;
     * the only supported way is by column name.
     */
    get<T>(sql: string, callback?: RowCallback<T>): this;
    get<T>(sql: string, params: any, callback?: RowCallback<T>): this;
    /**
     * Runs the SQL query with the specified parameters and calls the callback
     * with all result rows afterwards. The function returns the Database object to
     * allow for function chaining. The parameters are the same as the Database#run
     * function, with the following differences: The signature of the callback is
     * function(err, rows) {}. rows is an array. If the result set is empty, it will
     * be an empty array, otherwise it will have an object for each result row which
     * in turn contains the values of that row, like the Database#get function.
     * Note that it first retrieves all result rows and stores them in memory.
     * For queries that have potentially large result sets, use the Database#each
     * function to retrieve all rows or Database#prepare followed by multiple Statement#get
     * calls to retrieve a previously unknown amount of rows.
     */
    all<T>(sql: string, callback?: RowsCallback<T>): this;
    all<T>(sql: string, params: any, callback?: RowsCallback<T>): this;
    /**
     * Runs the SQL query with the specified parameters and calls the callback once for each result row.
     * The function returns the Database object to allow for function chaining. The parameters are the
     * same as the Database#run function, with the following differences: The signature of the callback
     * is function(err, row) {}. If the result set succeeds but is empty, the callback is never called.
     * In all other cases, the callback is called once for every retrieved row. The order of calls correspond
     * exactly to the order of rows in the result set. After all row callbacks were called, the completion
     * callback will be called if present. The first argument is an error object, and the second argument
     * is the number of retrieved rows. If you specify only one function, it will be treated as row callback,
     * if you specify two, the first (== second to last) function will be the row callback, the last function
     * will be the completion callback. If you know that a query only returns a very limited number of rows,
     * it might be more convenient to use Database#all to retrieve all rows at once. There is currently no
     * way to abort execution.
     */
    each<T>(sql: string, callback?: RowCallback<T>, complete?: RowCountCallback): this;
    each<T>(sql: string, params: any, callback?: RowCallback<T>, complete?: RowCountCallback): this;
    /**
     * Prepares the SQL statement and optionally binds the specified parameters and
     * calls the callback when done. The function returns a Statement object.
     * When preparing was successful, the first and only argument to the callback
     * is null, otherwise it is the error object. When bind parameters are supplied,
     * they are bound to the prepared statement before calling the callback.
     */
    prepare<T = any>(sql: string, ...params: any[]): Statement<T>;
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
    exec(sql: string, callback?: ConnectionCallback): this;
    /**
     * If the optional callback is provided, this function will be called when the
     * database was closed successfully or when an error occurred. The first argument
     * is an error object. When it is null, closing succeeded. If no callback is provided
     * and an error occurred, an error event with the error object as the only parameter
     * will be emitted on the database object. If closing succeeded, a close event with no
     * parameters is emitted, regardless of whether a callback was provided or not.
     */
    close(callback?: ConnectionCallback): void;
    /**
     * Loads a compiled SQLite extension into the database connection object.
     * @param path Filename of the extension to load.
     * @param callback  If provided, this function will be called when the extension
     * was loaded successfully or when an error occurred. The first argument is an
     * error object. When it is null, loading succeeded. If no callback is provided
     * and an error occurred, an error event with the error object as the only parameter
     * will be emitted on the database object.
     */
    loadExtension(_path: string, callback?: ConnectionCallback): this;
    /**
     * Allows the user to interrupt long-running queries. Wrapper around
     * sqlite3_interrupt and causes other data-fetching functions to be
     * passed an err with code = sqlite3.INTERRUPT. The database must be
     * open to use this function.
     */
    interrupt(): void;
    /**
     * Sql is a promise based API for executing SQL statements. You can
     * pass a simple string with a SQL statement or a template string
     * using backticks and parameters in ${parameter} format. These parameters
     * will be properly escaped and quoted like when using a prepared statement.
     * @param sql A sql string or a template string in `backticks` format
     * @returns An array of rows in case of selections or an object with
     * metadata in case of insert, update, delete.
     */
    sql(sql: TemplateStringsArray | string | SQLiteCloudCommand, ...values: any[]): Promise<any>;
    /**
     * Returns true if the database connection is open.
     */
    isConnected(): boolean;
    /**
     * PubSub class provides a Pub/Sub real-time updates and notifications system to
     * allow multiple applications to communicate with each other asynchronously.
     * It allows applications to subscribe to tables and receive notifications whenever
     * data changes in the database table. It also enables sending messages to anyone
     * subscribed to a specific channel.
     * @returns {PubSub} A PubSub object
     */
    getPubSub(): Promise<PubSub>;
}
