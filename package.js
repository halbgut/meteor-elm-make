Package.describe({
  summary: 'Elm 0.16.0 for Meteor'
, name: 'elm:make'
, version: '0.2.2'
, git: 'https://github.com/Kriegslustig/meteor-elm-make.git'
})

Package.registerBuildPlugin({
  name: 'elm'
, use: ['ecmascript@0.1.6', 'meteor@1.1.10']
, sources: ['lib/helpers.js', 'elm.js']
, npmDependencies: {
    'elm': '0.16.0'
  }
})

Package.onUse(function (api) {
  api.use('isobuild:compiler-plugin@1.0.0')
})

