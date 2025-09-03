/**
 * Custom Jest reporter that provides verbose test output with colors
 * while suppressing console logs for passing tests. Only shows console
 * output (like console.error) for failed tests.
 */

const { DefaultReporter } = require('@jest/reporters')
const chalk = require('chalk')

class Reporter extends DefaultReporter {
  constructor(globalConfig, options) {
    super(globalConfig, options)
  }

  printTestFileHeader(testPath, config, result) {
    // Don't call super to avoid printing console output
    const testFileName = testPath.replace(process.cwd() + '/', '')
    const duration = result.perfStats ? ((result.perfStats.end - result.perfStats.start) / 1000).toFixed(3) : '0.000'
    const status = result.numFailingTests === 0 ? chalk.green('PASS') : chalk.red('FAIL')

    this.log(`${status}  ${testFileName} ${chalk.gray(`(${duration} s)`)}`)

    // Print test structure
    const testsByGroup = {}
    result.testResults.forEach(test => {
      const groupName = test.ancestorTitles[0] || 'Root'
      if (!testsByGroup[groupName]) {
        testsByGroup[groupName] = []
      }
      testsByGroup[groupName].push(test)
    })

    Object.entries(testsByGroup).forEach(([groupName, tests]) => {
      if (groupName !== 'Root') {
        this.log(`  ${groupName}`)
      }
      tests.forEach(test => {
        const prefix = groupName !== 'Root' ? '    ' : '  '
        const status = test.status === 'passed' ? chalk.green('✓') : chalk.red('✗')
        const duration = test.duration ? chalk.gray(` (${test.duration} ms)`) : ''
        this.log(`${prefix}${status} ${test.title}${duration}`)
      })
    })

    // Show console output only for failed tests
    if (result.numFailingTests > 0 && result.console && result.console.length > 0) {
      result.console.forEach(entry => {
        this.log(`  ${entry.type}`)
        this.log(`    ${entry.message}`)
      })
    }
  }

  onRunComplete(contexts, results) {
    this.log('')
    const passedSuites = chalk.green(`${results.numPassedTestSuites} passed`)
    const failedSuites = results.numFailedTestSuites > 0 ? `, ${chalk.red(`${results.numFailedTestSuites} failed`)}` : ''
    this.log(`Test Suites: ${passedSuites}${failedSuites}, ${results.numTotalTestSuites} total`)

    const passedTests = chalk.green(`${results.numPassedTests} passed`)
    const failedTests = results.numFailedTests > 0 ? `, ${chalk.red(`${results.numFailedTests} failed`)}` : ''
    this.log(`Tests:       ${passedTests}${failedTests}, ${results.numTotalTests} total`)

    this.log(`Snapshots:   ${results.snapshot.total} total`)
    const duration = results.testRuntimeSummary ? (results.testRuntimeSummary.slow / 1000).toFixed(1) : '0.0'
    this.log(`Time:        ${duration} s`)
  }
}

module.exports = Reporter