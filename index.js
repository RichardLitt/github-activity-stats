const Octokit = require('@octokit/rest')
const _ = require('lodash')
require('dotenv').config()
const githubRepositories = require('github-repositories')
const octokit = new Octokit({
  // auth: 'e1be50d8a9153e8f44bd9560582c3ad64fc015aa'
  auth: `token ${process.env.TOKEN}`
})

function getStatistics () {
  const organization = 'orbitdb';
  const stats = {};
  githubRepositories(organization)
    .then(data => _.map(data, 'name'))
    .then(async repositories => {
      // Gather all the data
      let counter = 0
      const totals = {}

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

        counter += 1
        if (counter > 2) {
          break
        }
      }

      for (let key in totals) {
        console.log(`${_.startCase(key)}: ${Math.ceil(totals[key] / counter)}`)
      }

    })
}

async function getRepoSubscribers (owner, repo) {
  const subscribers =  await octokit.paginate('GET /repos/:owner/:repo/subscribers', { owner, repo, per_page: 100 })
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
    issues: _.map(_.filter(open, o => o.pull_request === undefined), 'number'),
    pullRequests: _.map(_.filter(open, 'pull_request'), 'number')
  }
}

async function getCommits (owner, repo) {
  const commits = await octokit.paginate('GET /repos/:owner/:repo/commits', { owner, repo, per_page: 100 })
  return _.map(commits, 'sha')
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
