#!/usr/bin/env node
'use strict'

const githubWatchers = require('./')
const meow = require('meow')
const fs = require('fs')

const cli = meow(`
  Usage
    $ foo <input>

  Options
    --input  Specify an input manifest

  Examples
    $ foo unicorns --rainbow
    🌈 unicorns 🌈
`, {
  flags: {
    input: {
      type: 'string'
    },
    token: {
      type: 'string'
    }
  }
})

if (cli.flags.input) {
  let input = JSON.parse(fs.readFileSync(cli.flags.input, 'utf8'))
  githubWatchers(input)
} else {
  githubWatchers(cli.input[0], {
    token: cli.flags.token // TODO Octokit doesn't call this at the moment
  })
}
