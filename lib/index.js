"use strict";
//
// index.ts - export drivers classes, utilities, types
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.protocol = exports.sanitizeSQLiteIdentifier = exports.getInitializationCommands = exports.validateConfiguration = exports.parseconnectionstring = exports.SQLiteCloudRow = exports.SQLiteCloudRowset = exports.SQLiteCloudError = exports.SQLiteCloudConnection = exports.Database = void 0;
// include ONLY packages used by drivers
// do NOT include anything related to gateway or bun or express
// connection-tls does not want/need to load on browser and is loaded dynamically by Database
// connection-ws does not want/need to load on node and is loaded dynamically by Database
var database_1 = require("./drivers/database");
Object.defineProperty(exports, "Database", { enumerable: true, get: function () { return database_1.Database; } });
var connection_1 = require("./drivers/connection");
Object.defineProperty(exports, "SQLiteCloudConnection", { enumerable: true, get: function () { return connection_1.SQLiteCloudConnection; } });
var types_1 = require("./drivers/types");
Object.defineProperty(exports, "SQLiteCloudError", { enumerable: true, get: function () { return types_1.SQLiteCloudError; } });
var rowset_1 = require("./drivers/rowset");
Object.defineProperty(exports, "SQLiteCloudRowset", { enumerable: true, get: function () { return rowset_1.SQLiteCloudRowset; } });
Object.defineProperty(exports, "SQLiteCloudRow", { enumerable: true, get: function () { return rowset_1.SQLiteCloudRow; } });
var utilities_1 = require("./drivers/utilities");
Object.defineProperty(exports, "parseconnectionstring", { enumerable: true, get: function () { return utilities_1.parseconnectionstring; } });
Object.defineProperty(exports, "validateConfiguration", { enumerable: true, get: function () { return utilities_1.validateConfiguration; } });
Object.defineProperty(exports, "getInitializationCommands", { enumerable: true, get: function () { return utilities_1.getInitializationCommands; } });
Object.defineProperty(exports, "sanitizeSQLiteIdentifier", { enumerable: true, get: function () { return utilities_1.sanitizeSQLiteIdentifier; } });
exports.protocol = __importStar(require("./drivers/protocol"));
