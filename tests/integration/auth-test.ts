/**
 * Auth Integration Test
 *
 * Verifies the Claude CLI bridge can connect and exchange messages.
 * Requires: Claude Code CLI installed and authenticated (`claude` command works).
 *
 * Run: npx tsx tests/integration/auth-test.ts
 */

import { spawn } from 'child_process'
import { createInterface } from 'readline'

const TIMEOUT_MS = 30000
const TEST_MESSAGE = 'Reply with exactly: CLAUDETTE_AUTH_OK'

interface TestResult {
  name: string
  passed: boolean
  detail: string
}

const results: TestResult[] = []

function log(msg: string) {
  console.log(`  ${msg}`)
}

async function testCliDetection(): Promise<void> {
  log('Testing Claude CLI detection...')

  return new Promise((resolve) => {
    const proc = spawn(process.platform === 'win32' ? 'where' : 'which', ['claude'], {
      shell: true,
    })

    let output = ''
    proc.stdout.on('data', (data) => { output += data.toString() })

    proc.on('close', (code) => {
      if (code === 0 && output.trim()) {
        results.push({ name: 'CLI Detection', passed: true, detail: `Found at: ${output.trim().split('\n')[0]}` })
      } else {
        results.push({ name: 'CLI Detection', passed: false, detail: 'Claude CLI not found in PATH' })
      }
      resolve()
    })
  })
}

async function testCliBridge(): Promise<void> {
  log('Testing Claude CLI bridge (sending test message)...')

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      results.push({ name: 'CLI Bridge', passed: false, detail: `Timed out after ${TIMEOUT_MS / 1000}s` })
      proc.kill()
      resolve()
    }, TIMEOUT_MS)

    const args = process.platform === 'win32'
      ? ['cmd', ['/c', 'claude', '--print', TEST_MESSAGE]]
      : ['claude', ['--print', TEST_MESSAGE]]

    const proc = spawn(args[0] as string, args[1] as string[], {
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => { stdout += data.toString() })
    proc.stderr.on('data', (data) => { stderr += data.toString() })

    proc.on('close', (code) => {
      clearTimeout(timer)
      if (stdout.includes('CLAUDETTE_AUTH_OK')) {
        results.push({ name: 'CLI Bridge', passed: true, detail: 'Got expected response' })
      } else if (code !== 0) {
        results.push({
          name: 'CLI Bridge',
          passed: false,
          detail: `Exit code ${code}: ${stderr.trim().slice(0, 200) || 'Unknown error'}`,
        })
      } else {
        results.push({
          name: 'CLI Bridge',
          passed: false,
          detail: `Unexpected output: ${stdout.trim().slice(0, 200)}`,
        })
      }
      resolve()
    })

    proc.on('error', (err) => {
      clearTimeout(timer)
      results.push({ name: 'CLI Bridge', passed: false, detail: `Spawn error: ${err.message}` })
      resolve()
    })
  })
}

async function testStreamingOutput(): Promise<void> {
  log('Testing streaming output...')

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      results.push({ name: 'Streaming', passed: false, detail: `Timed out after ${TIMEOUT_MS / 1000}s` })
      proc.kill()
      resolve()
    }, TIMEOUT_MS)

    const args = process.platform === 'win32'
      ? ['cmd', ['/c', 'claude', '--print', 'Count from 1 to 5, one number per line, nothing else']]
      : ['claude', ['--print', 'Count from 1 to 5, one number per line, nothing else']]

    const proc = spawn(args[0] as string, args[1] as string[], {
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const chunks: string[] = []
    proc.stdout.on('data', (data) => {
      chunks.push(data.toString())
    })

    proc.on('close', (code) => {
      clearTimeout(timer)
      const fullOutput = chunks.join('')
      const hasNumbers = /1/.test(fullOutput) && /5/.test(fullOutput)

      if (code === 0 && hasNumbers && chunks.length >= 1) {
        results.push({
          name: 'Streaming',
          passed: true,
          detail: `Received ${chunks.length} chunk(s), output contains expected numbers`,
        })
      } else {
        results.push({
          name: 'Streaming',
          passed: false,
          detail: `code=${code}, chunks=${chunks.length}, output=${fullOutput.slice(0, 100)}`,
        })
      }
      resolve()
    })

    proc.on('error', (err) => {
      clearTimeout(timer)
      results.push({ name: 'Streaming', passed: false, detail: `Spawn error: ${err.message}` })
      resolve()
    })
  })
}

async function main() {
  console.log('\n=== Claudette Auth Integration Tests ===\n')

  await testCliDetection()

  // Only test bridge and streaming if CLI was detected
  if (results[0]?.passed) {
    await testCliBridge()
    await testStreamingOutput()
  } else {
    results.push({ name: 'CLI Bridge', passed: false, detail: 'Skipped — CLI not found' })
    results.push({ name: 'Streaming', passed: false, detail: 'Skipped — CLI not found' })
  }

  console.log('\n=== Results ===\n')
  let allPassed = true
  for (const r of results) {
    const icon = r.passed ? '\u2713' : '\u2717'
    console.log(`  ${icon} ${r.name}: ${r.detail}`)
    if (!r.passed) allPassed = false
  }

  const passed = results.filter((r) => r.passed).length
  console.log(`\n  ${passed}/${results.length} passed\n`)

  process.exit(allPassed ? 0 : 1)
}

main()
