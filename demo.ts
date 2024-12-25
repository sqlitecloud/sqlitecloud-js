
/**
 * Developer experience - current
 * 
 */

import { Database } from '@sqlitecloud/drivers'
import { PUBSUB_ENTITY_TYPE } from '@sqlitecloud/drivers/lib/drivers/pubsub' // forces user to import pubsub constants from hard to remember location

const db = new Database('connection-string')
const pubSub = await db.getPubSub() // couples database to pubsub

/* Database methods */
await db.sql`SELECT * FROM users`
db.exec('command')
db.run('command')
db.all('command')
db.each('command')
db.close()

/* PubSub usage */
/** Listen to a table */
pubSub.listen(PUBSUB_ENTITY_TYPE.TABLE, 'users', (error, results, data) => { // note extraneous "data" 
  console.log(error, results, data)
}, ['extra data'])

/** Listen to a channel */
pubSub.listen(PUBSUB_ENTITY_TYPE.CHANNEL, 'messages', (error, results, data) => { 
  console.log(error, results, data)
}, ['extra data'])

/** Create a channel */
pubSub.createChannel('messages')

/** Unlisten to a table */
pubSub.unlisten(PUBSUB_ENTITY_TYPE.TABLE, 'users')

/** Remove a channel (not currently exposed) */
// @ts-ignore
pubSub.removeChannel('messages')

/** Notify a channel */
pubSub.notifyChannel('messages', 'my message')


/** 
 * Developer experience - refactored
 * In the refactor, Database still exists and works as before.
 */

import { createClient } from './src/packages/SQLiteCloudClient'

const client = createClient('connection-string/chinook.db')

// Promise sql query
const { data, error } = await client.sql`SELECT * FROM albums`;

client.defaultDb = 'users'; // helper to set default database for SQL queries 

const { data: sessions, error: sessionsError } = await client.sql`SELECT * FROM sessions`;
// or
const result = client.db.exec('SELECT * FROM sessions')

// Weblite
// upload database
const uploadDatabaseResponse = await client.weblite.upload('new_chinook.db', new File([''], 'new_chinook.db'), { replace: false });

// download database
const downloadDatabaseResponse = await client.weblite.download('new_chinook.db');

// delete database
const deleteDatabaseResponse = await client.weblite.delete('new_chinook.db');

// list databases
const listDatabasesResponse = await client.weblite.listDatabases();

// create database
const createDatabaseResponse = await client.weblite.create('new_chinook.db');

// SQLiteCloudFileClient
const createBucketResponse = await client.files.createBucket('myBucket');
const getBucketResponse = await client.files.getBucket('myBucket');
const deleteBucketResponse = await client.files.deleteBucket('myBucket');
const listBucketsResponse = await client.files.listBuckets();

// upload file
const uploadFileResponse = await client.files.upload('myBucket', 'myPath', new File([''], 'myFile.txt'), { contentType: 'text/plain' });

// download file
const downloadFileResponse = await client.files.download('myBucket', 'myPath');

// remove file
const removeFileResponse = await client.files.remove('myBucket', 'myPath');


// SQLiteCloudPubSubClient Refactor
await client.pubSub.create('messages')
await client.pubSub.notify('messages', 'my message')
await client.pubSub.subscribe('messages', (error, results) => {
  console.log(error, results)
})
client.pubSub.unsubscribe('messages')
await client.pubSub.delete('messages')

await client.pubSub.listen({ tableName: 'users' }, (error, results) => {
  console.log(error, results)
})

await client.pubSub.listen({ tableName: 'users', dbName: 'chinook.sqlite' }, (error, results) => { // note optional dbName
  console.log(error, results)
})

