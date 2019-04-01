const Octokit = require('@octokit/rest')
const _ = require('lodash')
const moment = require('moment')
require('dotenv').config()
const githubRepositories = require('github-repositories')
const octokit = new Octokit({
  auth: `token ${process.env.TOKEN}`
})

function getStatistics () {
  const organization = 'adventure-js'
  const stats = {}
  githubRepositories(organization)
    .then(data => _.map(data, 'name'))
    .then(async repositories => {
      // Gather all the data
      let counter = repositories.length
      const totals = {}

      const commitTimes = []
      const issueTimes = []
      const lastIssueTimes = []
      const pullRequestTimes = []

      for (let repo of repositories) {
        stats[repo] = {
          subscribers: await getRepoSubscribers(organization, repo),
          stargazers: await getRepoStarrers(organization, repo),
          commits: await getCommits(organization, repo),
          forks: await getForks(organization, repo)
        }
        const issuesAndPullRequests = await getRepoIssues(organization, repo)

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
        // commitTimes.push(moment(_.last(stats[repo].commits.sort())))
        // issueTimes.push(moment(stats[repo].issues.sort()[0]))
        // lastIssueTimes.push(moment(_.last(stats[repo].issues.sort())))
        // pullRequestTimes.push(moment(stats[repo].pullRequests.sort()[0]))
      }

      console.log(`For ${repositories.length} repositories in the org, here are the stats:\n`)

      console.log('Totals:\n=======')
      for (let key in totals) {
        console.log(`${_.startCase(key)}: ${totals[key]}`)
      }
      console.log('\nAverages:\n=========')
      for (let key in totals) {
        console.log(`${_.startCase(key)}: ${Math.round(totals[key] / counter)}`)
      }

      const [commitDiff, averageCommit] = calculateDates(commitTimes)
      const [_x, firstIssueAverage] = calculateDates(issueTimes)
      const [__x, lastIssueAverage] = calculateDates(lastIssueTimes)
      const [___x, firstPullRequestAverage] = calculateDates(pullRequestTimes)

      console.log(`The average commit date was ${averageCommit.fromNow()}, and was spread out over ${moment.duration(commitDiff, 'seconds').humanize()}.`)
      console.log(`The oldest issues averaged out to ${firstIssueAverage ? firstIssueAverage.fromNow() : 'never'}, with the oldest PRs to ${firstPullRequestAverage ? firstPullRequestAverage.fromNow() : 'never'}. Issues continued to be opened up to ${lastIssueAverage ? lastIssueAverage.fromNow() : 'never'}.`)
    })
}

function pushIfExists (position, arrayToPushTo, sourceArray) {
  if (sourceArray.length) {
    arrayToPushTo.push(moment(_[position](sourceArray.sort())))
  }
}

// Returns the timeDifference and the averageDate
function calculateDates (timesArray) {
  if (timesArray.length) {
    const diff = (_.last(timesArray).unix() - timesArray[0].unix()) / (timesArray.length - 1)
    return [
      diff,
      moment.unix(timesArray[0].unix() + diff)
    ]
  } else {
    return [null, null]
  }
}

async function getRepoSubscribers (owner, repo) {
  const subscribers = await octokit.paginate('GET /repos/:owner/:repo/subscribers', { owner, repo, per_page: 100 })
  return _.map(subscribers, 'login')
}

async function getRepoStarrers (owner, repo) {
  const stargazers = await octokit.paginate('GET /repos/:owner/:repo/stargazers', { owner, repo, per_page: 100 })
  return _.map(stargazers, 'login')
}

async function getRepoIssues (owner, repo) {
  const issues = await octokit.paginate('GET /repos/:owner/:repo/issues', { owner, repo, per_page: 100 })
  const open = _.filter(issues, ['state', 'open'])

  return {
    issues: _.map(_.filter(open, o => o.pull_request === undefined), 'created_at'),
    pullRequests: _.map(_.filter(open, 'pull_request'), 'created_at')
  }
}

async function getCommits (owner, repo) {
  const commits = await octokit.paginate('GET /repos/:owner/:repo/commits', { owner, repo, per_page: 100 })
  return _.map(commits, 'commit.author.date')
}

async function getForks (owner, repo) {
  const forks = await octokit.paginate('GET /repos/:owner/:repo/forks', { owner, repo, per_page: 100 })
  return _.map(forks, 'full_name')
}

getStatistics()

module.exports = {
  getRepoStarrers,
  getRepoSubscribers,
  getStatistics
}
