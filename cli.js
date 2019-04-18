#!/usr/bin/env node
'use strict'

const _ = require('lodash')
const chalk = require('chalk')
const fs = require('fs')
const githubActivityStats = require('./')
const meow = require('meow')
const moment = require('moment')
const log = console.log

const cli = meow(`
  Usage
    $ github-activity-stats <input>

  Options
    --input Specify an input manifest. Format: --input=manifest.json
    --repo  Specify a repo. Format: RichardLitt/github-activity-stats
    --token Specify a GitHub Auth token. You can also GITHUB_TOKEN in your env

  Examples
    $ github-activity-stats
    🌈 unicorns 🌈
`, {
  flags: {
    input: {
      type: 'string'
    },
    token: {
      type: 'string'
    },
    repo: {
      type: 'string'
    }
  }
})

// Run it.
getStats()

async function getStats () {
  let output

  if (cli.flags.input) {
    let input = JSON.parse(fs.readFileSync(cli.flags.input, 'utf8'))
    output = await githubActivityStats(input, cli.flags)
      .catch(e => {
        log(e)
        process.exit(1)
      })
  } else {
    output = await githubActivityStats(cli.input[0], cli.flags)
      .catch(e => {
        log(e)
        process.exit(1)
      })
  }

  // Since this is the CLI tool, start printing stuff to STDOUT

  log(`Here are the stats for these repositories: ${chalk.green(output.repositories.join(', '))}\n`)

  log(chalk.yellow('Totals:\n======='))
  for (let key in output.totals) {
    log(chalk.blue(_.startCase(key)) + `: ${output.totals[key]}`)
  }

  if (output.repositories.length > 1) {
    log(chalk.yellow('\nAverages:\n========='))
    for (let key in output.averages) {
      log(chalk.blue(_.startCase(key)) + `: ${output.averages[key]}`)
    }
  }

  log(chalk.yellow('\nDates:\n======'))
  if (output.commits.times) {
    log(chalk.blue('Commits:'))
    log(`The first commit was made ${output.commits.first.fromNow()}.`)
    log(`The average commit date was ${output.commits.average.fromNow()}.`)
    log(`The newest commit was created ${moment.max(output.commits.last).fromNow()}.`)
  } else {
    log(chalk.blue('Commits:'), `There are no commits.`)
  }
  if (output.issues.times) {
    log(chalk.blue('Issues:'))
    log(`The oldest open issue was opened ${moment.min(output.issues.first).fromNow()}.`)
    log(`The open issues were most active, on average, ${output.issues.average.fromNow()}.`)
    log(`The newest issue was created ${moment.max(output.issues.last).fromNow()}.`)
  } else {
    log(chalk.blue('Issues:'), `There are no open issues.`)
  }
  if (output.pullRequests.times) {
    log(chalk.blue('PRs:'))
    log(`The oldest open pull request (PR) was made ${moment.min(output.pullRequests.first).fromNow()}.`)
    log(`The PRs were opened, on average, ${output.pullRequests.average.fromNow()}.`)
    log(`The newest PR was created ${moment.max(output.pullRequests.last).fromNow()}.`)
  } else {
    log(chalk.blue('PRs:'), `There are no open pull requests.`)
  }
}
