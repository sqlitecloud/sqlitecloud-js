import { Database } from "../../drivers/database";

interface Column {
  name: string;
  type: string;
  partitionKey?: boolean;
  primaryKey?: boolean;
}

interface IndexOptions {
  tableName: string;
  dimensions: number;
  columns: Column[];
  binaryQuantization?: boolean;
  dbName?: string;
}

type UpsertData = [Record<string, any> & { id: string | number }][]

interface QueryOptions {
  topK: number,
  where?: string[]
}

interface SQLiteCloudVector {
  init(options: IndexOptions): Promise<SQLiteCloudVector>
  upsert(data: UpsertData): Promise<SQLiteCloudVector>
  query(queryEmbedding: number[], options: QueryOptions): Promise<any>
}

const DEFAULT_EMBEDDING_COLUMN_NAME = 'embedding'

const buildEmbeddingType = (dimensions: number, binaryQuantization: boolean) => {
  return `${binaryQuantization ? 'BIT' : 'FLOAT'}[${dimensions}]`
}

const formatInitColumns = (opts: IndexOptions) => {
  const { columns, dimensions, binaryQuantization } = opts
  return columns.reduce((acc, column) => {
    let _type = column.type.toLowerCase();
    const { name, primaryKey, partitionKey } = column
    if (_type === 'embedding') {
      _type = buildEmbeddingType(dimensions, !!binaryQuantization)
    }
    const formattedColumn = `${name} ${_type} ${primaryKey ? 'PRIMARY KEY' : ''}${partitionKey ? 'PARTITION KEY' : ''}`
    return `${acc}, ${formattedColumn}`
  }, '')
}

function formatUpsertCommand(data: UpsertData): [any, any] {
  throw new Error("Function not implemented.");
}


export class SQLiteCloudVectorClient implements SQLiteCloudVector {

  private _db: Database
  private _tableName: string
  private _columns: Column[]
  private _formattedColumns: string

  constructor(_db: Database) {
    this._db = _db
    this._tableName = ''
    this._columns = []
    this._formattedColumns = ''
  }

  async init(options: IndexOptions) {
    const formattedColumns = formatInitColumns(options)
    this._tableName = options.tableName
    this._columns = options?.columns || []
    this._formattedColumns = formattedColumns
    const useDbCommand = options?.dbName ? `USE DATABASE ${options.dbName}; ` : ''
    const hasTable = await this._db.sql`${useDbCommand}SELECT 1 FROM ${options.tableName} LIMIT 1;`

    if (hasTable.length === 0) { // TODO - VERIFY CHECK HAS TABLE 
      const query = `CREATE VIRTUAL TABLE ${options.tableName} USING vec0(${formattedColumns})`
      await this._db.sql(query)
    }
    return this
  }

  async upsert(data: UpsertData) {
    const [formattedColumns, formattedValues] = formatUpsertCommand(data)
    const query = `INSERT INTO ${this._tableName}(${formattedColumns}) VALUES (${formattedValues})`
    return await this._db.sql(query)
  }

  async query(queryEmbedding: number[], options: QueryOptions) {
    const query = `SELECT * FROM ${this._tableName} WHERE ${DEFAULT_EMBEDDING_COLUMN_NAME} match ${JSON.stringify(queryEmbedding)} and k = ${options.topK} and ${(options?.where?.join(' and ') || '')}`
    const result = await this._db.sql(query)
    return { data: result, error: null }
  }

}
