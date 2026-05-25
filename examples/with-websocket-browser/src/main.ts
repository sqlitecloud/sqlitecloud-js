//
// main.ts - wires the small UI in index.html to `runQuery`
//

import { runQuery, isClientError } from './query'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const connectionStringInput = $<HTMLInputElement>('connectionString')
const sqlInput = $<HTMLTextAreaElement>('sql')
const arrayModeInput = $<HTMLInputElement>('arrayMode')
const runButton = $<HTMLButtonElement>('run')
const output = $<HTMLPreElement>('output')

// Prefill from a Vite env var if provided (see .env.example), otherwise leave the
// placeholder so the user can paste their own connection string.
connectionStringInput.value = import.meta.env.VITE_DATABASE_URL ?? ''

const run = async () => {
  const connectionstring = connectionStringInput.value.trim()
  const sql = sqlInput.value.trim()

  if (!connectionstring) {
    output.textContent = 'Please provide a connection string.'
    return
  }

  runButton.disabled = true
  output.textContent = 'Running…'

  try {
    const { rows } = await runQuery(
      arrayModeInput.checked,
      sql,
      [],
      // In the browser the driver connects over WebSocket through the SQLite
      // Cloud Gateway. Passing only the connection string is enough; the gateway
      // URL is derived from the host (wss://<host>:443).
      { connectionstring }
    )
    output.textContent = JSON.stringify(rows, null, 2)
  } catch (error) {
    if (isClientError(error)) {
      output.textContent = `${error.message}\n\n${JSON.stringify(error.details, null, 2)}`
    } else {
      output.textContent = String(error)
    }
  } finally {
    runButton.disabled = false
  }
}

runButton.addEventListener('click', run)
