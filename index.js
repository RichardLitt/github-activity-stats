const Octokit = require('@octokit/rest')
const _ = require('lodash')
const moment = require('moment')
require('dotenv').config()
const githubRepositories = require('github-repositories')
const octokit = new Octokit({
  auth: `token ${process.env.TOKEN}`
})

module.exports = async function getStatistics (input, opts) {
  let repositories

  // If it is a single repository
  if (opts && opts.repo) {
    repositories = [opts.repo]
  // If it is an organization
  } else if (typeof input === 'string') {
    repositories = _.map(await githubRepositories(input), (repo) => {
      if (!repo.fork) {
        return repo.full_name
      }
    }).filter(x => x)
  // If from a manifest
  } else {
    // TODO Make it possible to loop over multiple organizations
    if (input.repositories) {
      repositories = input.repositories // Expects an Array
    }
  }

  // Just in case. Happens for empty orgs.
  if (repositories.length === 0) {
    throw new Error('You have not specified any repositories.')
  }

  // Gather all the data
  const totals = {}
  const stats = {}

  const commitTimes = []
  const issueTimes = []
  const mostRecentIssueTimes = []
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
    pushIfExists('last', mostRecentIssueTimes, stats[repo].issues)
    pushIfExists('first', pullRequestTimes, stats[repo].pullRequests)
  }

  const [commitDiff, averageCommit] = calculateDates(commitTimes)
  const [firstIssue, firstIssueAverage] = calculateDates(issueTimes)
  const [mostRecentIssue, mostRecentIssuesAverage] = calculateDates(mostRecentIssueTimes)
  const [firstPR, firstPullRequestAverage] = calculateDates(pullRequestTimes)

  return {
    repositories,
    totals,
    commitDiff,
    averageCommit,
    commitTimes,
    issueTimes,
    pullRequestTimes,
    firstIssue,
    firstIssueAverage,
    mostRecentIssue,
    mostRecentIssueTimes,
    mostRecentIssuesAverage,
    firstPR,
    firstPullRequestAverage
  }
}

function pushIfExists (position, arrayToPushTo, sourceArray) {
  if (sourceArray.length) {
    arrayToPushTo.push(moment(_[position](sourceArray.sort())))
  }
}

// Returns the timeDifference and the averageDate
function calculateDates (timesArray) {
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
        throw new Error('Did you forget to use a token? This will fail for large calls.')
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
