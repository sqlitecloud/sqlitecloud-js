/**
 * connection-tls.ts - connection via tls socket and sqlitecloud protocol
 */
import { SQLiteCloudConnection } from './connection';
import { type ErrorCallback, type ResultsCallback, SQLiteCloudCommand, type SQLiteCloudConfig } from './types';
/**
 * Implementation of SQLiteCloudConnection that connects to the database using specific tls APIs
 * that connect to native sockets or tls sockets and communicates via raw, binary protocol.
 */
export declare class SQLiteCloudTlsConnection extends SQLiteCloudConnection {
    /** Currently opened bun socket used to communicated with SQLiteCloud server */
    private socket?;
    /** True if connection is open */
    get connected(): boolean;
    connectTransport(config: SQLiteCloudConfig, callback?: ErrorCallback): this;
    /** Will send a command immediately (no queueing), return the rowset/result or throw an error */
    transportCommands(commands: string | SQLiteCloudCommand, callback?: ResultsCallback): this;
    private buffer;
    private startedOn;
    private executingCommands?;
    private processCallback?;
    private pendingChunks;
    /** Handles data received in response to an outbound command sent by processCommands */
    private processCommandsData;
    /** Completes a transaction initiated by processCommands */
    private processCommandsFinish;
    /** Disconnect immediately, release connection, no events. */
    close(): this;
}
export default SQLiteCloudTlsConnection;
