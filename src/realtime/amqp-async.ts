import amqplib from 'amqplib'
import crypto from 'crypto' // Import the crypto module

const serverUrl = process.env.SQLITECLOUD_AMQP as string //  'amqp://user:xxx@rabbitmq.aws-eu1.sqlite.tech'

// docker run -it --rm --name rabbitmq -p 5672:5672 -p 15672:15672 -e RABBITMQ_DEFAULT_USER=user -e RABBITMQ_DEFAULT_PASS=xxx rabbitmq:3.13-management

// https://rabbitmq.aws-eu1.sqlite.tech:15672/#/

const queue = 'async-queue'

async function performExperiment() {
  const conn = await amqplib.connect(serverUrl)

  const ch1 = await conn.createChannel()
  await ch1.assertQueue(queue)

  // Listener
  ch1.consume(queue, msg => {
    if (msg !== null) {
      try {
        const jsonMsg = JSON.parse(msg.content.toString()) // Parse the message content to JSON
        //const jsonMsg = msg.content.toJSON()
        console.log(jsonMsg, msg.fields, msg.properties)
      } catch (error) {
        console.error(`Error while parsing ${msg.content.toString()}`, error)
      }

      //      console.log('Received:', msg.content.toString())
      ch1.ack(msg)
    } else {
      console.log('Consumer cancelled by server')
    }
  })

  // Sender
  const ch2 = await conn.createChannel()

  setInterval(() => {
    const buffer = crypto.randomBytes(64 * 1024) // Generate 64KB of random bytes
    const base64Buffer = buffer.toString('base64') // Encode the buffer as a base64 string

    const jsonMsg = { task: 'something to do', buffer: base64Buffer } // Create a JSON object
    const sent = ch2.sendToQueue(queue, Buffer.from(JSON.stringify(jsonMsg)), {
      contentType: 'application/json'
    })
    //console.debug(`sent: ${sent}`)
  }, 1000)
}

void performExperiment()
