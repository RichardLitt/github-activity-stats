#!/usr/bin/env node
'use strict'

const githubWatchers = require('./')
const argv = require('minimist')(process.argv.slice(2))
const fs = require('fs')

if (argv['input']) {
  let input = JSON.parse(fs.readFileSync(argv['input'], 'utf8'))
  githubWatchers(input)
} else {
  githubWatchers(argv['org'], {
    token: argv['token'] // TODO Octokit doesn't call this at the moment
  })
}
