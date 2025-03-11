import { DATABASE_URL } from "@env";
import { Database } from "@sqlitecloud/drivers";


export default function getDbConnection() {
    return new Database(DATABASE_URL);
}