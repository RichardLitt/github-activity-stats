# github-watchers

> Get all GitHub watchers and starrers for a repo

This tool will show you all of the GitHub watchers for an organization, as well as the usernames of everyone who has starred your repository. It will present both the deduplicated list of users, and the total counts across all repositories.

## Installation

```
git clone git@github.com:RichardLitt/github-watchers
cd github-watchers
npm install
```

To run it:

```
node cli.js --org=orbitdb
```

To use a file (as for a ton of repositories):

```json
{
  "repositories": [
    "RichardLitt/github-watchers",
    "RichardLitt/gh-description"
  ],
  "organizations": [
    "mdx-js",
    "adventure-js"
  ]
}
```

And then run:

```sh
node cli.js --input=manifest.json # Or whatever you named it
```

### Goal Output

```
For six repos in a single org, here are the averages:
Issues: 40
PRs: 10
Commits: 500
Watchers: 100
Stars: 775
Forks: 425
The last development was on average around a year ago, and was spread out over the past four years.
The oldest issues averaged out to mid-2016, with the oldest PRs to mid-2017. Issues continued to be opened up to early this year.
```

## Future Goals

- Histogram of starrers/subscribers over time (possible?)
- Show all the orgs that the watchers/starrers are members of
- Show their businesses, because that's interesting
- Get their emails
- Show the amount of open issues in an org
- Show the amount of open PRs in an org
- Show the average length of open issues/PRs
- Show the oldest date of an open issue/PR
- Show the last interaction
  - The last commit on any branch
  - The last commit on master
  - The last issue closed
  - The last PR merged

## Contribute

Sure?

## License

MIT
