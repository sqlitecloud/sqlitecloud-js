import { SQLiteCloudRow } from '../src'
import { getChinookDatabase, LONG_TIMEOUT } from './shared'
import { PUBSUB_ENTITY_TYPE } from '../src/drivers/pubsub'

describe('pubSub', () => {
  it(
    'should listen, notify and receive pubSub messages on channel',
    async () => {
      const connection = getChinookDatabase()
      const pubSub = await connection.getPubSub()

      try {
        const channelName = 'test-channel-' + crypto.randomUUID()
        let callbackCalled = false
        const message = 'Message in a bottle ' + Math.floor(Math.random() * 999)

        await pubSub.createChannel(channelName)

        await pubSub.listen(
          PUBSUB_ENTITY_TYPE.CHANNEL,
          channelName,
          (error, results, data) => {
            expect(error).toBeNull()

            expect(results).not.toBeNull()
            expect(results['channel']).toEqual(channelName)
            expect(results['payload']).toEqual(message)
            expect(data).toEqual({ pippo: 'pluto' })
            callbackCalled = true
          },
          { pippo: 'pluto' }
        )

        await pubSub.notifyChannel(channelName, message)

        while (!callbackCalled) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

        expect(callbackCalled).toBeTruthy()
        pubSub.removeChannel(channelName)
      } finally {
        connection.close()
        pubSub.close()
      }
    },
    LONG_TIMEOUT
  ),
    it('should unlisten on channel', async () => {
      const connection = getChinookDatabase()
      const pubSub = await connection.getPubSub()

      try {
        const channelName = 'test-channel-' + Math.floor(Math.random() * 999)

        await pubSub.createChannel(channelName, false)

        await pubSub.listen(PUBSUB_ENTITY_TYPE.CHANNEL, channelName, (error, results, data) => {
          expect(true).toBeFalsy()
        })

        let connections = await connection.sql`LIST PUBSUB CONNECTIONS;`
        let connectionExists = connections.find((row: SQLiteCloudRow) => row['chname'] === channelName)
        expect(connectionExists).toBeDefined()

        await pubSub.unlisten(PUBSUB_ENTITY_TYPE.CHANNEL, channelName)

        connections = await connection.sql`LIST PUBSUB CONNECTIONS;`
        connectionExists = connections.find((row: SQLiteCloudRow) => row['chname'] === channelName)
        expect(connectionExists).toBeUndefined()
      } finally {
        connection.close()
        pubSub.close()
      }
    }),
    it('should unlisten on table', async () => {
      const connection = getChinookDatabase()
      const pubSub = await connection.getPubSub()

      try {
        let callbackCalled = false

        const tableName = 'genres'
        await pubSub.listen(PUBSUB_ENTITY_TYPE.TABLE, tableName, (error, results, data) => {
          expect(true).toBeFalsy()
          callbackCalled = true
        })

        let connections = await connection.sql`LIST PUBSUB CONNECTIONS;`
        let connectionExists = connections.find((row: SQLiteCloudRow) => row['chname'] === tableName)
        expect(connectionExists).toBeDefined()

        await pubSub.unlisten(PUBSUB_ENTITY_TYPE.TABLE, tableName)

        await connection.sql`UPDATE genres SET Name = 'Rock' WHERE GenreId = 1`

        // wait a moment to see if the callback is called
        await new Promise(resolve => setTimeout(resolve, 2000))

        expect(callbackCalled).toBeFalsy()
      } finally {
        connection.close()
        pubSub.close()
      }
    }),
    it('should fail to create a channel that already exists', async () => {
      const connection = getChinookDatabase()
      const pubSub = await connection.getPubSub()

      try {
        const channelName = 'test-channel-' + crypto.randomUUID()

        await pubSub.createChannel(channelName)

        await expect(pubSub.createChannel(channelName, true)).rejects.toThrow(`Cannot create channel ${channelName} because it already exists.`)
      } finally {
        connection.close()
        pubSub.close()
      }
    }),
    it(
      'should listen and receive pubSub messages on table',
      async () => {
        const connection = getChinookDatabase()
        const pubSub = await connection.getPubSub()

        try {
          let callbackCalled = false
          const newName = 'Rock' + Math.floor(Math.random() * 999)

          await pubSub.listen(
            PUBSUB_ENTITY_TYPE.TABLE,
            'genres',
            (error, results, data) => {
              expect(error).toBeNull()

              expect(results).not.toBeNull()
              expect(results['payload'][0]['sqlite_type']).toEqual('UPDATE')
              expect(results['payload'][0]['Name']).toEqual(newName)
              expect(data).toEqual({ pippo: 'pluto' })
              callbackCalled = true
            },
            { pippo: 'pluto' }
          )

          await connection.sql`UPDATE genres SET Name = ${newName} WHERE GenreId = 1`

          while (!callbackCalled) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }

          expect(callbackCalled).toBeTruthy()
        } finally {
          connection.close()
          pubSub.close()
        }
      },
      LONG_TIMEOUT
    ),
    it('should be connected', async () => {
      const connection = getChinookDatabase()
      const pubSub = await connection.getPubSub()

      try {
        expect(pubSub.connected()).toBeTruthy()

        pubSub.close()

        expect(pubSub.connected()).toBeFalsy()
      } finally {
        connection.close()
        pubSub.close()
      }
    }),
    it(
      'should keep pubSub only connection',
      async () => {
        const connection = getChinookDatabase()
        const connection2 = getChinookDatabase()
        const pubSub = await connection.getPubSub()

        try {
          let callbackCalled = false
          const newName = 'Rock' + Math.floor(Math.random() * 999)

          await pubSub.listen(PUBSUB_ENTITY_TYPE.TABLE, 'genres', (error, results, data) => {
            expect(error).toBeNull()
            expect(results).not.toBeNull()
            callbackCalled = true
          })

          await pubSub.setPubSubOnly()

          expect(connection.sql`SELECT 1`).rejects.toThrow('Connection unavailable. Maybe it got disconnected?')
          expect(pubSub.connected()).toBeTruthy()

          await connection2.sql`UPDATE genres SET Name = ${newName} WHERE GenreId = 1`

          while (!callbackCalled) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }

          expect(callbackCalled).toBeTruthy()
        } finally {
          connection.close()
          pubSub.close()
          connection2.close()
        }
      },
      LONG_TIMEOUT
    )
})
