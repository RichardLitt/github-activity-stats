#!/usr/bin/env node
'use strict'

const _ = require('lodash')
const chalk = require('chalk')
const fs = require('fs')
const githubWatchers = require('./')
const meow = require('meow')
const moment = require('moment')
const log = console.log

const cli = meow(`
  Usage
    $ github-watchers <input>

  Options
    --input Specify an input manifest. Format: --input=manifest.json
    --repo  Specify a repo. Format: RichardLitt/github-watchers
    --token Specify a GitHub Auth token. You can also GITHUB_TOKEN in your env

  Examples
    $ github-watchers
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
    output = await githubWatchers(input, cli.flags)
      .catch(e => {
        log(e)
        process.exit(1)
      })
  } else {
    output = await githubWatchers(cli.input[0], cli.flags)
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
    for (let key in output.totals) {
      log(chalk.blue(_.startCase(key)) + `: ${Math.round(output.totals[key] / output.repositories.length)}`)
    }
  }

  log(chalk.yellow('\nDates:\n======'))
  if (output.averageCommit) {
    log(chalk.blue('Commits:'))
    log(`The average commit date was ${output.averageCommit.fromNow()}.`)
    log(`The newest commit was created ${moment.max(output.commitTimes).fromNow()}.`)
  } else {
    log(chalk.blue('Commits:'), `There are no commits.`)
  }
  if (output.totals.issues >= 1) {
    log(chalk.blue('Issues:'))
    log(`The oldest open issue was opened ${moment.min(output.issueTimes).fromNow()}.`)
    log(`The open issues were most active, on average, ${output.firstIssueAverage.fromNow()}.`)
    log(`The newest issue was created ${moment.max(output.issueTimes).fromNow()}.`)
  } else {
    log(chalk.blue('Issues:'), `There are no open issues.`)
  }
  if (output.totals.pullRequests >= 1) {
    log(chalk.blue('PRs:'))
    log(`The oldest open pull request (PR) was made ${moment.min(output.pullRequestTimes).fromNow()}.`)
    log(`The PRs were opened, on average, ${output.firstPullRequestAverage.fromNow()}.`)
    log(`The newest PR was created ${moment.max(output.pullRequestTimes).fromNow()}.`)
  } else {
    log(chalk.blue('PRs:'), `There are no open pull requests.`)
  }
}
