"use strict";
//
// utilities.ts - utility methods to manipulate SQL statements
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNode = exports.isBrowser = void 0;
exports.anonimizeCommand = anonimizeCommand;
exports.anonimizeError = anonimizeError;
exports.getInitializationCommands = getInitializationCommands;
exports.sanitizeSQLiteIdentifier = sanitizeSQLiteIdentifier;
exports.getUpdateResults = getUpdateResults;
exports.popCallback = popCallback;
exports.validateConfiguration = validateConfiguration;
exports.parseconnectionstring = parseconnectionstring;
exports.parseBoolean = parseBoolean;
exports.parseBooleanToZeroOne = parseBooleanToZeroOne;
const types_1 = require("./types");
// explicitly importing these libraries to allow cross-platform support by replacing them
const whatwg_url_1 = require("whatwg-url");
//
// determining running environment, thanks to browser-or-node
// https://www.npmjs.com/package/browser-or-node
//
exports.isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
exports.isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
//
// utility methods
//
/** Messages going to the server are sometimes logged when error conditions occour and need to be stripped of user credentials  */
function anonimizeCommand(message) {
    // hide password in AUTH command if needed
    message = message.replace(/USER \S+/, 'USER ******');
    message = message.replace(/PASSWORD \S+?(?=;)/, 'PASSWORD ******');
    message = message.replace(/HASH \S+?(?=;)/, 'HASH ******');
    return message;
}
/** Strip message code in error of user credentials */
function anonimizeError(error) {
    if (error === null || error === void 0 ? void 0 : error.message) {
        error.message = anonimizeCommand(error.message);
    }
    return error;
}
/** Initialization commands sent to database when connection is established */
function getInitializationCommands(config) {
    // we check the credentials using non linearizable so we're quicker
    // then we bring back linearizability unless specified otherwise
    let commands = 'SET CLIENT KEY NONLINEARIZABLE TO 1;';
    // first user authentication, then all other commands
    if (config.apikey) {
        commands += `AUTH APIKEY ${config.apikey};`;
    }
    else if (config.token) {
        commands += `AUTH TOKEN ${config.token};`;
    }
    else {
        commands += `AUTH USER ${config.username || ''} ${config.password_hashed ? 'HASH' : 'PASSWORD'} ${config.password || ''};`;
    }
    if (config.compression) {
        commands += 'SET CLIENT KEY COMPRESSION TO 1;';
    }
    if (config.zerotext) {
        commands += 'SET CLIENT KEY ZEROTEXT TO 1;';
    }
    if (config.noblob) {
        commands += 'SET CLIENT KEY NOBLOB TO 1;';
    }
    if (config.maxdata) {
        commands += `SET CLIENT KEY MAXDATA TO ${config.maxdata};`;
    }
    if (config.maxrows) {
        commands += `SET CLIENT KEY MAXROWS TO ${config.maxrows};`;
    }
    if (config.maxrowset) {
        commands += `SET CLIENT KEY MAXROWSET TO ${config.maxrowset};`;
    }
    // we ALWAYS set non linearizable to 1 when we start so we can be quicker on login
    // but then we need to put it back to its default value if "linearizable" unless set
    if (!config.non_linearizable) {
        commands += 'SET CLIENT KEY NONLINEARIZABLE TO 0;';
    }
    if (config.database) {
        if (config.create && !config.memory) {
            commands += `CREATE DATABASE ${config.database} IF NOT EXISTS;`;
        }
        commands += `USE DATABASE ${config.database};`;
    }
    return commands;
}
/** Sanitizes an SQLite identifier (e.g., table name, column name). */
function sanitizeSQLiteIdentifier(identifier) {
    const trimmed = identifier.trim();
    // it's not empty
    if (trimmed.length === 0) {
        throw new Error('Identifier cannot be empty.');
    }
    // escape double quotes
    const escaped = trimmed.replace(/"/g, '""');
    // Wrap in double quotes for safety
    return `"${escaped}"`;
}
/** Converts results of an update or insert call into a more meaning full result set */
function getUpdateResults(results) {
    if (results) {
        if (Array.isArray(results) && results.length > 0) {
            switch (results[0]) {
                case types_1.SQLiteCloudArrayType.ARRAY_TYPE_SQLITE_EXEC:
                    return {
                        type: results[0],
                        index: results[1],
                        lastID: results[2], // ROWID (sqlite3_last_insert_rowid)
                        changes: results[3], // CHANGES(sqlite3_changes)
                        totalChanges: results[4], // TOTAL_CHANGES (sqlite3_total_changes)
                        finalized: results[5], // FINALIZED
                        //
                        rowId: results[2] // same as lastId
                    };
            }
        }
    }
    return undefined;
}
/**
 * Many of the methods in our API may contain a callback as their last argument.
 * This method will take the arguments array passed to the method and return an object
 * containing the arguments array with the callbacks removed (if any), and the callback itself.
 * If there are multiple callbacks, the first one is returned as 'callback' and the last one
 * as 'completeCallback'.
 *
 * @returns args is a simple list of SQLiteCloudDataTypes, we flat them into a single array
 */
function popCallback(args) {
    const remaining = args;
    // at least 1 callback?
    if (args && args.length > 0 && typeof args[args.length - 1] === 'function') {
        // at least 2 callbacks?
        if (args.length > 1 && typeof args[args.length - 2] === 'function') {
            return { args: remaining.slice(0, -2).flat(), callback: args[args.length - 2], complete: args[args.length - 1] };
        }
        return { args: remaining.slice(0, -1).flat(), callback: args[args.length - 1] };
    }
    return { args: remaining.flat() };
}
//
// configuration validation
//
/** Validate configuration, apply defaults, throw if something is missing or misconfigured */
function validateConfiguration(config) {
    console.assert(config, 'SQLiteCloudConnection.validateConfiguration - missing config');
    if (config.connectionstring) {
        config = Object.assign(Object.assign(Object.assign({}, config), parseconnectionstring(config.connectionstring)), { connectionstring: config.connectionstring // keep original connection string
         });
    }
    // apply defaults where needed
    config.port || (config.port = types_1.DEFAULT_PORT);
    config.timeout = config.timeout && config.timeout > 0 ? config.timeout : types_1.DEFAULT_TIMEOUT;
    config.clientid || (config.clientid = 'SQLiteCloud');
    config.verbose = parseBoolean(config.verbose);
    config.noblob = parseBoolean(config.noblob);
    config.compression = config.compression != undefined && config.compression != null ? parseBoolean(config.compression) : true; // default: true
    config.create = parseBoolean(config.create);
    config.non_linearizable = parseBoolean(config.non_linearizable);
    config.insecure = parseBoolean(config.insecure);
    const hasCredentials = (config.username && config.password) || config.apikey || config.token;
    if (!config.host || !hasCredentials) {
        console.error('SQLiteCloudConnection.validateConfiguration - missing arguments', config);
        throw new types_1.SQLiteCloudError('The user, password and host arguments, the ?apikey= or the ?token= must be specified.', { errorCode: 'ERR_MISSING_ARGS' });
    }
    if (!config.connectionstring) {
        // build connection string from configuration, values are already validated
        config.connectionstring = `sqlitecloud://${config.host}:${config.port}/${config.database || ''}`;
        if (config.apikey) {
            config.connectionstring += `?apikey=${config.apikey}`;
        }
        else if (config.token) {
            config.connectionstring += `?token=${config.token}`;
        }
        else {
            config.connectionstring = `sqlitecloud://${encodeURIComponent(config.username || '')}:${encodeURIComponent(config.password || '')}@${config.host}:${config.port}/${config.database}`;
        }
    }
    return config;
}
/**
 * Parse connectionstring like sqlitecloud://username:password@host:port/database?option1=xxx&option2=xxx
 * or sqlitecloud://host.sqlite.cloud:8860/chinook.sqlite?apikey=mIiLARzKm9XBVllbAzkB1wqrgijJ3Gx0X5z1Agm3xBo
 * into its basic components.
 */
function parseconnectionstring(connectionstring) {
    try {
        // The URL constructor throws a TypeError if the URL is not valid.
        // in spite of having the same structure as a regular url
        // protocol://username:password@host:port/database?option1=xxx&option2=xxx)
        // the sqlitecloud: protocol is not recognized by the URL constructor in browsers
        // so we need to replace it with https: to make it work
        const knownProtocolUrl = connectionstring.replace('sqlitecloud:', 'https:');
        const url = new whatwg_url_1.URL(knownProtocolUrl);
        // all lowecase options
        const options = {};
        url.searchParams.forEach((value, key) => {
            options[key.toLowerCase().replace(/-/g, '_')] = value.trim();
        });
        const config = Object.assign(Object.assign({}, options), { username: decodeURIComponent(url.username), password: decodeURIComponent(url.password), password_hashed: options.password_hashed ? parseBoolean(options.password_hashed) : undefined, host: url.hostname, 
            // type cast values
            port: url.port ? parseInt(url.port) : undefined, insecure: options.insecure ? parseBoolean(options.insecure) : undefined, timeout: options.timeout ? parseInt(options.timeout) : undefined, zerotext: options.zerotext ? parseBoolean(options.zerotext) : undefined, create: options.create ? parseBoolean(options.create) : undefined, memory: options.memory ? parseBoolean(options.memory) : undefined, compression: options.compression ? parseBoolean(options.compression) : undefined, non_linearizable: options.non_linearizable ? parseBoolean(options.non_linearizable) : undefined, noblob: options.noblob ? parseBoolean(options.noblob) : undefined, maxdata: options.maxdata ? parseInt(options.maxdata) : undefined, maxrows: options.maxrows ? parseInt(options.maxrows) : undefined, maxrowset: options.maxrowset ? parseInt(options.maxrowset) : undefined, usewebsocket: options.usewebsocket ? parseBoolean(options.usewebsocket) : undefined, verbose: options.verbose ? parseBoolean(options.verbose) : undefined });
        // either you use an apikey or username and password
        if (config.apikey) {
            if (config.token) {
                console.error('SQLiteCloudConnection.parseconnectionstring - apikey and token cannot be both specified');
                throw new types_1.SQLiteCloudError('apikey and token cannot be both specified');
            }
            if (config.username || config.password) {
                console.warn('SQLiteCloudConnection.parseconnectionstring - apikey and username/password are both specified, using apikey');
            }
            delete config.username;
            delete config.password;
        }
        const database = url.pathname.replace('/', ''); // pathname is database name, remove the leading slash
        if (database) {
            config.database = database;
        }
        return config;
    }
    catch (error) {
        throw new types_1.SQLiteCloudError(`Invalid connection string: ${connectionstring} - error: ${error}`);
    }
}
/** Returns true if value is 1 or true */
function parseBoolean(value) {
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1';
    }
    return value ? true : false;
}
/** Returns true if value is 1 or true */
function parseBooleanToZeroOne(value) {
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1' ? 1 : 0;
    }
    return value ? 1 : 0;
}
