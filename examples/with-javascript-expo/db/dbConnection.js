import { DATABASE_URL } from "@env";
import { Database } from "@sqlitecloud/drivers";

export default db = new Database(DATABASE_URL);