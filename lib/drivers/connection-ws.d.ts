/**
 * transport-ws.ts - handles low level communication with sqlitecloud server via socket.io websocket
 */
import { SQLiteCloudConnection } from './connection';
import { ErrorCallback, ResultsCallback, SQLiteCloudCommand, SQLiteCloudConfig } from './types';
/**
 * Implementation of TransportConnection that connects to the database indirectly
 * via SQLite Cloud Gateway, a socket.io based deamon that responds to sql query
 * requests by returning results and rowsets in json format. The gateway handles
 * connect, disconnect, retries, order of operations, timeouts, etc.
 */
export declare class SQLiteCloudWebsocketConnection extends SQLiteCloudConnection {
    /** Socket.io used to communicated with SQLiteCloud server */
    private socket?;
    /** True if connection is open */
    get connected(): boolean;
    connectTransport(config: SQLiteCloudConfig, callback?: ErrorCallback): this;
    /** Will send a command immediately (no queueing), return the rowset/result or throw an error */
    transportCommands(commands: string | SQLiteCloudCommand, callback?: ResultsCallback): this;
    /** Disconnect socket.io from server */
    close(): this;
}
export default SQLiteCloudWebsocketConnection;
