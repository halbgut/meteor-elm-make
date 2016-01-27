Package.describe({
  summary: 'Elm for Meteor'
, name: 'kriegslustig:elm-make'
, version: '0.1.0'
, git: 'https://github.com/Kriegslustig/meteor-elm-make.git'
})

Package.registerBuildPlugin({
  name: 'elm'
, use: ['ecmascript', 'meteor']
, sources: ['plugin/elm.js']
, npmDependencies: {
    "elm": "0.16.0"
  }
})

Package.onUse(function (api) {
  api.use('isobuild:compiler-plugin@1.0.0')
})

