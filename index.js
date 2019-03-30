const Octokit = require('@octokit/rest')
const _ = require('lodash')
require('dotenv').config()
const githubRepositories = require('github-repositories')
const octokit = new Octokit({
  auth: `token ${process.env.TOKEN}`
})

async function getStatistics (input) {
  let repositories

  // If it is an organization
  if (typeof input === 'string') {
    repositories = _.map(await githubRepositories(input), 'full_name')
  } else {
    // TODO Make it possible to loop over multiple organizations
    if (input.repositories) {
      repositories = input.repositories // Expects an Array
    }
  }
  const stats = {}

  // Gather all the data
  let counter = repositories.length
  const totals = {}

  for (let repo of repositories) {
    stats[repo] = {
      subscribers: await getRepoSubscribers(repo),
      stargazers: await getRepoStarrers(repo),
      commits: await getCommits(repo),
      forks: await getForks(repo)
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
  }

  console.log(`Totals:\n=======`)
  for (let key in totals) {
    console.log(`${_.startCase(key)}: ${totals[key]}`)
  }
  console.log(`\nAverages:\n=========`)
  for (let key in totals) {
    console.log(`${_.startCase(key)}: ${Math.round(totals[key] / counter)}`)
  }
}

async function getRepoSubscribers (repo) {
  const subscribers = await octokit.paginate('GET /repos/:repo/subscribers', { repo, per_page: 100 })
    .catch(e => undefined)
  return _.map(subscribers, 'login')
}

async function getRepoStarrers (repo) {
  const stargazers = await octokit.paginate('GET /repos/:repo/stargazers', { repo, per_page: 100 })
    .catch(e => undefined)
  return _.map(stargazers, 'login')
}

async function getRepoIssues (repo) {
  const issues = await octokit.paginate('GET /repos/:repo/issues', { repo, per_page: 100 })
    .catch(e => undefined)
  const open = _.filter(issues, ['state', 'open'])
  return {
    issues: _.map(_.filter(open, o => o.pull_request === undefined), 'number'),
    pullRequests: _.map(_.filter(open, 'pull_request'), 'number')
  }
}

async function getCommits (repo) {
  const commits = await octokit.paginate('GET /repos/:repo/commits', { repo, per_page: 100 })
    .catch(e => undefined)
  return _.map(commits, 'sha')
}

async function getForks (repo) {
  const forks = await octokit.paginate('GET /repos/:repo/forks', { repo, per_page: 100 })
    .catch(e => undefined)
  return _.map(forks, 'full_name')
}

module.exports = getStatistics
