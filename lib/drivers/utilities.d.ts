import { SQLiteCloudConfig, SQLiteCloudDataTypes } from './types';
export declare const isBrowser: boolean;
export declare const isNode: boolean;
/** Messages going to the server are sometimes logged when error conditions occour and need to be stripped of user credentials  */
export declare function anonimizeCommand(message: string): string;
/** Strip message code in error of user credentials */
export declare function anonimizeError(error: Error): Error;
/** Initialization commands sent to database when connection is established */
export declare function getInitializationCommands(config: SQLiteCloudConfig): string;
/** Sanitizes an SQLite identifier (e.g., table name, column name). */
export declare function sanitizeSQLiteIdentifier(identifier: any): string;
/** Converts results of an update or insert call into a more meaning full result set */
export declare function getUpdateResults(results?: any): Record<string, any> | undefined;
/**
 * Many of the methods in our API may contain a callback as their last argument.
 * This method will take the arguments array passed to the method and return an object
 * containing the arguments array with the callbacks removed (if any), and the callback itself.
 * If there are multiple callbacks, the first one is returned as 'callback' and the last one
 * as 'completeCallback'.
 *
 * @returns args is a simple list of SQLiteCloudDataTypes, we flat them into a single array
 */
export declare function popCallback<T extends ErrorCallback = ErrorCallback>(args: (SQLiteCloudDataTypes | T | ErrorCallback)[]): {
    args: SQLiteCloudDataTypes[];
    callback?: T | undefined;
    complete?: ErrorCallback;
};
/** Validate configuration, apply defaults, throw if something is missing or misconfigured */
export declare function validateConfiguration(config: SQLiteCloudConfig): SQLiteCloudConfig;
/**
 * Parse connectionstring like sqlitecloud://username:password@host:port/database?option1=xxx&option2=xxx
 * or sqlitecloud://host.sqlite.cloud:8860/chinook.sqlite?apikey=mIiLARzKm9XBVllbAzkB1wqrgijJ3Gx0X5z1Agm3xBo
 * into its basic components.
 */
export declare function parseconnectionstring(connectionstring: string): SQLiteCloudConfig;
/** Returns true if value is 1 or true */
export declare function parseBoolean(value: string | boolean | null | undefined): boolean;
/** Returns true if value is 1 or true */
export declare function parseBooleanToZeroOne(value: string | boolean | null | undefined): 0 | 1;
