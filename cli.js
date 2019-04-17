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
      .catch(e => log(e))
  } else {
    output = await githubWatchers(cli.input[0], cli.flags)
      .catch(e => log(e))
  }

  // Since this is the CLI tool, start printing stuff to STDOUT

  log(`Here are the stats for these repositories: ${chalk.green(output.repositories.join(', '))}\n`)

  log(chalk.yellow('Totals:\n======='))
  for (let key in output.totals) {
    log(chalk.blue(_.startCase(key)) + `: ${output.totals[key]}`)
  }
  log(chalk.yellow('\nAverages:\n========='))
  for (let key in output.totals) {
    log(chalk.blue(_.startCase(key)) + `: ${Math.round(output.totals[key] / output.repositories.length)}`)
  }

  log(chalk.yellow('\nDates:\n======'))
  if (output.averageCommit) {
    log(`The average commit date was ${output.averageCommit.fromNow()}.`)
  }
  log(`The oldest issue was opened ${moment.min(output.issueTimes).fromNow()}, and the oldest pull request (PR) ${moment.min(output.pullRequestTimes).fromNow()}.
The issues were most active ${output.firstIssueAverage ? output.firstIssueAverage.fromNow() : 'never'}, while the oldest PRs were ${output.firstPullRequestAverage ? output.firstPullRequestAverage.fromNow() : 'never'}.
The newest issue was created ${moment.max(output.mostRecentIssueTimes).fromNow()}.`)
}
