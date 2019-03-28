const Octokit = require('@octokit/rest')
const _ = require('lodash')
const githubRepositories = require('github-repositories')
const octokit = new Octokit({
  // auth: 'e1be50d8a9153e8f44bd9560582c3ad64fc015aa'
  auth: 'token 5bf0b2a5b84c65f48b1434d7851a4f83927cda3e'
})

function getStatistics () {
  const organization = 'orbitdb';
  const stats = {};
  githubRepositories(organization)
    .then(data => _.map(data, 'name'))
    .then(async repositories => {
      // Gather all the data
      let counter = 0
      for (let repo of repositories) {
        stats[repo] = {
          subscribers: await getRepoSubscribers(organization, repo),
          stargazers: await getRepoStarrers(organization, repo),
        }
        const issuesAndPullRequests = await getRepoIssues(organization, repo)

        stats[repo].issues = issuesAndPullRequests.issues
        stats[repo].pullRequests = issuesAndPullRequests.pullRequests

        console.log(stats[repo])
        counter += 1
        if (counter > 2) {
          break
        }
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

getStatistics()

module.exports = {
  getRepoStarrers,
  getRepoSubscribers,
  getStatistics
}
