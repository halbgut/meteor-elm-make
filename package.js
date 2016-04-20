/* global Package */

Package.describe({
  summary: 'Elm 0.16.0 for Meteor',
  name: 'elm:make',
  version: '0.5.0',
  git: 'https://github.com/Kriegslustig/meteor-elm-make.git'
})

Package.registerBuildPlugin({
  name: 'elm',
  use: ['ecmascript@0.4.2', 'meteor@1.1.13', 'babel-compiler@6.6.1'],
  sources: ['lib/helpers.js', 'elm.js'],
  npmDependencies: {
    'elm': '0.16.0'
  }
})

Package.onUse(function (api) {
  api.use('isobuild:compiler-plugin@1.0.0')
})

