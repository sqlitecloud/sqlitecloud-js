//
//
//

import { error } from 'console'
import crypto from 'crypto' // Import the crypto module
// https://amqp-node.github.io/amqplib/
import amqplib from 'amqplib/callback_api'

const rabbit_url = process.env.SQLITECLOUD_AMQP as string
// eg. amqp://user:password@rabbitmq.aws-eu1.sqlite.tech

// docker run -it --rm --name rabbitmq -p 5672:5672 -p 15672:15672 -e RABBITMQ_DEFAULT_USER=user -e RABBITMQ_DEFAULT_PASS=xxx rabbitmq:3.13-management

// https://rabbitmq.aws-eu1.sqlite.tech:15672/#/

const queue = 'jsontasks'

amqplib.connect(rabbit_url, (err, conn) => {
  if (err) {
    console.debug(`amqplib.connect - error: ${error}`)
    throw err
  }
  console.debug(`amqplib.connect - connected`, conn)

  // Listener

  conn.createChannel((err, ch2) => {
    if (err) throw err

    ch2.assertQueue(queue)
    ch2.consume(queue, msg => {
      if (msg !== null) {
        try {
          const jsonMsg = JSON.parse(msg.content.toString()) // Parse the message content to JSON
          //const jsonMsg = msg.content.toJSON()
          console.debug(`content:`, jsonMsg)
          console.debug(`headers:`, msg.properties.headers)
          console.debug(`fields:`, msg.fields)

          //          console.log(jsonMsg, msg.fields, msg.properties)
        } catch (error) {
          console.error(`Error while parsing ${msg.content.toString()}`, error)
        }
        ch2.ack(msg)
      } else {
        console.log('Consumer cancelled by server')
      }
    })
  })

  // Sender
  conn.createChannel((err, ch1) => {
    if (err) throw err

    ch1.assertQueue(queue)

    setInterval(() => {
      const buffer = crypto.randomBytes(64 * 1024) // Generate 64KB of random bytes
      const base64Buffer = buffer.toString('base64') // Encode the buffer as a base64 string

      const jsonMsg = { task: 'something to do', data: base64Buffer } // Create a JSON object
      const sent = ch1.sendToQueue(queue, Buffer.from(JSON.stringify(jsonMsg)), {
        contentType: 'application/json',
        headers: {
          headerOne: 'value1',
          headerTwo: 2
        }
        //        persistent: true
      })
      console.debug(`sent: ${sent}`)
    }, 100)
  })
})
