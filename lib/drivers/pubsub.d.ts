import { SQLiteCloudConnection } from './connection';
import { PubSubCallback } from './types';
export declare enum PUBSUB_ENTITY_TYPE {
    TABLE = "TABLE",
    CHANNEL = "CHANNEL"
}
/**
 * Pub/Sub class to receive changes on database tables or to send messages to channels.
 */
export declare class PubSub {
    constructor(connection: SQLiteCloudConnection);
    private connection;
    private connectionPubSub;
    /**
     * Listen for a table or channel and start to receive messages to the provided callback.
     * @param entityType One of TABLE or CHANNEL'
     * @param entityName Name of the table or the channel
     * @param callback Callback to be called when a message is received
     * @param data Extra data to be passed to the callback
     */
    listen(entityType: PUBSUB_ENTITY_TYPE, entityName: string, callback: PubSubCallback, data?: any): Promise<any>;
    /**
     * Stop receive messages from a table or channel.
     * @param entityType One of TABLE or CHANNEL
     * @param entityName Name of the table or the channel
     */
    unlisten(entityType: string, entityName: string): Promise<any>;
    /**
     * Create a channel to send messages to.
     * @param name Channel name
     * @param failIfExists Raise an error if the channel already exists
     */
    createChannel(name: string, failIfExists?: boolean): Promise<any>;
    /**
     * Deletes a Pub/Sub channel.
     * @param name Channel name
     */
    removeChannel(name: string): Promise<any>;
    /**
     * Send a message to the channel.
     */
    notifyChannel(channelName: string, message: string): Promise<any>;
    /**
     * Ask the server to close the connection to the database and
     * to keep only open the Pub/Sub connection.
     * Only interaction with Pub/Sub commands will be allowed.
     */
    setPubSubOnly(): Promise<any>;
    /** True if Pub/Sub connection is open. */
    connected(): boolean;
    /** Close Pub/Sub connection. */
    close(): void;
}
