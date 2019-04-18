const Octokit = require('@octokit/rest')
const _ = require('lodash')
const moment = require('moment')
require('dotenv').config()
const githubRepositories = require('github-repositories')

module.exports = async function getStatistics (input, opts) {
  const octokit = new Octokit({
    auth: `token ${opts.token ? opts.token : process.env.TOKEN}`
  })

  let repositories

  // If input is a single repository using the repo flag
  if (opts && opts.repo) {
    repositories = [opts.repo]
  // If input is a repo specified in format User/repo-name
  } else if (typeof input === 'string' && input.includes('/')) {
    repositories = [input]
  // If input is an organization
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
  const pullRequestTimes = []

  for (let repo of repositories) {
    stats[repo] = {
      subscribers: await getGithubData(octokit, repo, 'subscribers', 'login'),
      stargazers: await getGithubData(octokit, repo, 'stargazers', 'login'),
      commits: await getGithubData(octokit, repo, 'commits', 'commit.author.date'),
      forks: await getGithubData(octokit, repo, 'forks', 'full_name')
    }

    const issuesAndPullRequests = await getRepoIssues(octokit, repo)
    stats[repo].issues = issuesAndPullRequests.issues
    stats[repo].pullRequests = issuesAndPullRequests.pullRequests

    const objectTypes = [
      'subscribers',
      'stargazers',
      'forks',
      'commits',
      'issues',
      'pullRequests'
    ]
    objectTypes.forEach(objectType => {
      const statLength = stats[repo][objectType].length
      totals[objectType] = totals[objectType] ? totals[objectType] + stats[repo][objectType].length : statLength
    })

    // get the last date of each commit.
    pushIfExists(commitTimes, stats[repo].commits)
    pushIfExists(issueTimes, stats[repo].issues)
    // pushIfExists(mostRecentIssueTimes, stats[repo].issues)
    pushIfExists(pullRequestTimes, stats[repo].pullRequests)
  }

  return {
    repositories,
    totals,
    averages: getAverages(totals, repositories),
    commits: calculateDates(commitTimes),
    pullRequests: calculateDates(pullRequestTimes),
    issues: calculateDates(issueTimes)
  }
}

function pushIfExists (arrayToPushTo, sourceArray) {
  if (sourceArray.length) {
    for (let x in sourceArray) {
      arrayToPushTo.push(moment(sourceArray[x]))
    }
  }
}

function getAverages (totals, repositories) {
  const newObj = {}
  for (let key in totals) {
    newObj[key] = Math.round(totals[key] / repositories.length)
  }
  return newObj
}

// Returns the timeDifference and the averageDate
function calculateDates (timesArray) {
  if (timesArray.length) {
    const sumOfTimes = _.sumBy(timesArray, time => time.unix())
    const averageOfTimes = sumOfTimes / timesArray.length

    return {
      times: timesArray,
      first: moment.min(timesArray),
      average: moment.unix(averageOfTimes), // adds the halfway point to the first value.
      last: moment.max(timesArray)
    }
  } else {
    return {
      times: null,
      first: null,
      average: null,
      last: null
    }
  }
}

async function getGithubData (octokit, repo, endpoint, filter) {
  const val = await octokit.paginate(`GET /repos/${repo}/${endpoint}`, { repo, per_page: 100 })
    .catch(e => {
      if (e.status === 401) {
        throw new Error('Did you forget to use a token? This will fail for large calls.')
      }
    })
  return _.map(val, filter)
}

async function getRepoIssues (octokit, repo) {
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
