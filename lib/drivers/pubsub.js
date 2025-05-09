"use strict";
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
exports.PubSub = exports.PUBSUB_ENTITY_TYPE = void 0;
const connection_tls_1 = __importDefault(require("./connection-tls"));
var PUBSUB_ENTITY_TYPE;
(function (PUBSUB_ENTITY_TYPE) {
    PUBSUB_ENTITY_TYPE["TABLE"] = "TABLE";
    PUBSUB_ENTITY_TYPE["CHANNEL"] = "CHANNEL";
})(PUBSUB_ENTITY_TYPE || (exports.PUBSUB_ENTITY_TYPE = PUBSUB_ENTITY_TYPE = {}));
/**
 * Pub/Sub class to receive changes on database tables or to send messages to channels.
 */
class PubSub {
    constructor(connection) {
        this.connection = connection;
        this.connectionPubSub = new connection_tls_1.default(connection.getConfig());
    }
    /**
     * Listen for a table or channel and start to receive messages to the provided callback.
     * @param entityType One of TABLE or CHANNEL'
     * @param entityName Name of the table or the channel
     * @param callback Callback to be called when a message is received
     * @param data Extra data to be passed to the callback
     */
    listen(entityType, entityName, callback, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const entity = entityType === 'TABLE' ? 'TABLE ' : '';
            const authCommand = yield this.connection.sql(`LISTEN ${entity}${entityName};`);
            return new Promise((resolve, reject) => {
                this.connectionPubSub.sendCommands(authCommand, (error, results) => {
                    if (error) {
                        callback.call(this, error, null, data);
                        reject(error);
                    }
                    else {
                        // skip results from pubSub auth command
                        if (results !== 'OK') {
                            callback.call(this, null, results, data);
                        }
                        resolve(results);
                    }
                });
            });
        });
    }
    /**
     * Stop receive messages from a table or channel.
     * @param entityType One of TABLE or CHANNEL
     * @param entityName Name of the table or the channel
     */
    unlisten(entityType, entityName) {
        return __awaiter(this, void 0, void 0, function* () {
            const subject = entityType === 'TABLE' ? 'TABLE ' : '';
            return this.connection.sql(`UNLISTEN ${subject}?;`, entityName);
        });
    }
    /**
     * Create a channel to send messages to.
     * @param name Channel name
     * @param failIfExists Raise an error if the channel already exists
     */
    createChannel(name_1) {
        return __awaiter(this, arguments, void 0, function* (name, failIfExists = true) {
            let notExistsCommand = '';
            if (!failIfExists) {
                notExistsCommand = ' IF NOT EXISTS';
            }
            return this.connection.sql(`CREATE CHANNEL ?${notExistsCommand};`, name);
        });
    }
    /**
     * Deletes a Pub/Sub channel.
     * @param name Channel name
     */
    removeChannel(name) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.connection.sql('REMOVE CHANNEL ?;', name);
        });
    }
    /**
     * Send a message to the channel.
     */
    notifyChannel(channelName, message) {
        return this.connection.sql('NOTIFY ? ?;', channelName, message);
    }
    /**
     * Ask the server to close the connection to the database and
     * to keep only open the Pub/Sub connection.
     * Only interaction with Pub/Sub commands will be allowed.
     */
    setPubSubOnly() {
        return new Promise((resolve, reject) => {
            this.connection.sendCommands('PUBSUB ONLY;', (error, results) => {
                if (error) {
                    reject(error);
                }
                else {
                    this.connection.close();
                    resolve(results);
                }
            });
        });
    }
    /** True if Pub/Sub connection is open. */
    connected() {
        return this.connectionPubSub.connected;
    }
    /** Close Pub/Sub connection. */
    close() {
        this.connectionPubSub.close();
    }
}
exports.PubSub = PubSub;
