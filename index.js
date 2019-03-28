const Octokit = require('@octokit/rest')
const _ = require('lodash')
const githubRepositories = require('github-repositories')
const octokit = new Octokit({
  // auth: 'e1be50d8a9153e8f44bd9560582c3ad64fc015aa'
  auth: {
    clientId: 'ad6c5fabf298aecbb156',
    clientSecret: 'cfbccc56395183c941fa0a85d0be234a41aa0fcd'
  }
})

function getAllSubscribers () {
  githubRepositories('orbitdb')
    .then(data => _.map(data, 'name'))
    .then(data => {
      // Show me all of the subscribers for all of the orgs
      // Show me the deduplicated number, and the total number
      const dedupSubs = []
      const totalSubs = []

      _.map(data, (datum) => {
        // TODO This isn't right. This should be aggregated, but map returns true.
        getRepoSubscribers('orbitdb', datum)
      })
      console.log(res)
    })
}

function getRepoSubscribers (owner, repo) {
  return octokit.paginate('GET /repos/:owner/:repo/subscribers', { owner, repo, per_page: 100 })
    .then(subscribers => _.map(subscribers, 'login')
      // console.log(subscribers)
      // console.log(`Total: ${subscribers.length}`)
    )
}

function getRepoStarrers () {
  octokit.paginate('GET /repos/:owner/:repo/stargazers', { owner: 'orbitdb', repo: 'welcome', per_page: 100 })
    .then(stargazers => {
      stargazers = _.map(stargazers, 'login')
      console.log(stargazers)
      console.log(`Total: ${stargazers.length}`)
    })
}

getAllSubscribers()

module.exports = {
  getRepoStarrers,
  getRepoSubscribers,
  getAllSubscribers
}
