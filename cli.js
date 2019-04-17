#!/usr/bin/env node
'use strict'

const githubWatchers = require('./')
const meow = require('meow')
const fs = require('fs')

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

if (cli.flags.input) {
  let input = JSON.parse(fs.readFileSync(cli.flags.input, 'utf8'))
  githubWatchers(input, cli.flags)
} else {
  githubWatchers(cli.input[0], cli.flags)
}
