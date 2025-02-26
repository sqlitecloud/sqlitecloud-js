import { DATABASE_URL } from "@env";
import { Database } from "@sqlitecloud/drivers";

/**
 * @type {Database}
 */
let database = null;

export function getDbConnection() {
    if (!database || !database.isConnected()) {
        database = new Database(DATABASE_URL);
    }
    return database;
}