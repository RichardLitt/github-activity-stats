const Octokit = require('@octokit/rest')
const _ = require('lodash')
const chalk = require('chalk')
const moment = require('moment')
require('dotenv').config()
const githubRepositories = require('github-repositories')
const octokit = new Octokit({
  auth: `token ${process.env.TOKEN}`
})

async function getStatistics (input) {
  let repositories

  // If it is an organization
  if (typeof input === 'string') {
    repositories = _.map(await githubRepositories(input), (repo) => {
      if (!repo.fork) {
        return repo.full_name
      }
    }).filter(x => x)
  } else {
    // TODO Make it possible to loop over multiple organizations
    if (input.repositories) {
      repositories = input.repositories // Expects an Array
    }
  }
  // Gather all the data
  const totals = {}
  const stats = {}

  const commitTimes = []
  const issueTimes = []
  const lastIssueTimes = []
  const pullRequestTimes = []

  for (let repo of repositories) {
    stats[repo] = {
      subscribers: await getGithubData(repo, 'subscribers', 'login'),
      stargazers: await getGithubData(repo, 'stargazers', 'login'),
      commits: await getGithubData(repo, 'commits', 'commit.author.date'),
      forks: await getGithubData(repo, 'forks', 'full_name')
    }

    const issuesAndPullRequests = await getRepoIssues(repo)
    stats[repo].issues = issuesAndPullRequests.issues
    stats[repo].pullRequests = issuesAndPullRequests.pullRequests

    const objectTypes = [ 'subscribers',
      'stargazers',
      'commits',
      'forks',
      'issues',
      'pullRequests'
    ]
    objectTypes.forEach(objectType => {
      const statLength = stats[repo][objectType].length
      totals[objectType] = totals[objectType] ? totals[objectType] + stats[repo][objectType].length : statLength
    })

    // get the last date of each commit.
    pushIfExists('last', commitTimes, stats[repo].commits)
    pushIfExists('first', issueTimes, stats[repo].issues)
    pushIfExists('last', lastIssueTimes, stats[repo].issues)
    pushIfExists('first', pullRequestTimes, stats[repo].pullRequests)
  }

  // console.log('first issue times', issueTimes)
  // console.log('most recent issues', lastIssueTimes)
  // console.log('first request times', pullRequestTimes)

  console.log(`Here are the stats for these repositories: ${chalk.green(repositories.join(', '))}\n`)

  console.log(chalk.yellow('Totals:\n======='))
  for (let key in totals) {
    console.log(chalk.blue(_.startCase(key)) + `: ${totals[key]}`)
  }
  console.log(chalk.yellow('\nAverages:\n========='))
  for (let key in totals) {
    console.log(chalk.blue(_.startCase(key)) + `: ${Math.round(totals[key] / repositories.length)}`)
  }

  const [commitDiff, averageCommit] = calculateDates(commitTimes)
  const [_x, firstIssueAverage] = calculateDates(issueTimes)
  const [__x, lastIssueAverage] = calculateDates(lastIssueTimes)
  const [___x, firstPullRequestAverage] = calculateDates(pullRequestTimes)

  console.log(chalk.yellow('\nDates:\n======'))
  if (averageCommit) {
    console.log(`The average commit date was ${averageCommit.fromNow()}.`)
  }
  console.log(`The oldest issue was opened ${moment.min(issueTimes).fromNow()}, and the oldest pull request (PR) ${moment.min(pullRequestTimes).fromNow()}.
The issues were most active ${firstIssueAverage ? firstIssueAverage.fromNow() : 'never'}, while the oldest PRs were ${firstPullRequestAverage ? firstPullRequestAverage.fromNow() : 'never'}.
The newest issue was created ${moment.max(lastIssueTimes).fromNow()}.`)
}

function pushIfExists (position, arrayToPushTo, sourceArray) {
  if (sourceArray.length) {
    arrayToPushTo.push(moment(_[position](sourceArray.sort())))
  }
}

// Returns the timeDifference and the averageDate
function calculateDates (timesArray) {
  console.log(timesArray.length)
  if (timesArray.length) {
    const sumOfTimes = _.sumBy(timesArray, time => time.unix())
    const averageOfTimes = sumOfTimes / timesArray.length
    const firstUnix = moment.min(timesArray)

    return [
      firstUnix,
      moment.unix(averageOfTimes) // adds the halfway point to the first value.
    ]
  } else {
    return [null, null]
  }
}

async function getGithubData (repo, endpoint, filter) {
  const val = await octokit.paginate(`GET /repos/${repo}/${endpoint}`, { repo, per_page: 100 })
    .catch(e => {
      if (e.status === 401) {
        console.log('Did you forget to use a token? This will fail for large calls.')
        process.exit(1)
      }
    })
  return _.map(val, filter)
}

async function getRepoIssues (repo) {
  const issues = await octokit.paginate(`GET /repos/${repo}/issues`, { repo, per_page: 100 })
    .catch(e => {
      return undefined
    })
  const open = _.filter(issues, ['state', 'open'])

  return {
    issues: _.map(_.filter(open, o => o.pull_request === undefined), 'created_at'),
    pullRequests: _.map(_.filter(open, 'pull_request'), 'created_at')
  }
}

module.exports = getStatistics
