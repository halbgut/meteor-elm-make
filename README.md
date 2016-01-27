## Install

```
meteor add kriegslustig:elm-make
```

# kriegslustig:elm-make

Build Elm inside your Meteor app.

## Basic Usage

There is no configuration needed to use this. Just add it to your Meteor App with the [add command](install).

The build plugin searches for two kinds of files:

* `Main.elm` (ex. `client/Main.elm`)
* `*._.elm` (ex. `common/Something._.elm`)

If you're writting your application in Elm, you'll want to use the former variant. I recommend to have two `Main` modules one `server/Main.elm` and one `client/Main.elm`. Then import different modules from these.

## Native Elm Modules

Don't know what they are? [Read about them here](https://github.com/NoRedInk/take-home/wiki/Writing-Native).

Native modules are a little trickier, since Meteor would usually use them is the normal build process. So you should place then inside the `.elm/Native`. The directory is created for you at the first build, if it doesn't exist yet.

Native modules inside Packages may be placed anywhere.

## Add Elm Modules from Packages

_[Not implemented yet]_

`elm-make` searches `packages/elm-*/.elm` and adds these directories to the sources list. Simple as that.

## TODO

* check wether imports will have to be made in an _absolute_ fasion
* recursively delete .elm/.modules and .elm/.tmp in every build
* refactor the shit out of the build plugin

