Package.describe({
  summary: 'Elm for Meteor'
, name: 'kriegslustig:elm-build'
, version: '0.0.0'
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

