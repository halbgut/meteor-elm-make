# Note on stability - This is still a work in progress.

## Install

```
meteor add elm:make
```

# elm:make - 0.1.0 for Elm 0.16.0

Build Elm inside your Meteor app.

## Basic Usage

There is no configuration needed to use this. Just add it to your Meteor App with the [add command](install).

The build plugin searches for two kinds of files:

* `Main.elm` (ex. `client/Main.elm`)
* `*._.elm` (ex. `common/Something._.elm`)

If you're writing your application in Elm, you'll want to use the former variant. I recommend to have two `Main` modules one `server/Main.elm` and one `client/Main.elm`. Then import different modules from these.

`elm:make` saves all its stuff inside an `.elm` directory, which will be created at the [root of your project](complete-elm-build-process). So if you want to add Elm modules or change something inside the Elm configuration, you'll need to do it inside `.elm`.

So to install Elm modules

```bash
cd .elm
elm package install [somepackage]
cd ..
```

## Native Elm Modules

Don't know what they are? [Read about them here](https://github.com/NoRedInk/take-home/wiki/Writing-Native).

Native modules are a little trickier, since Meteor would usually use them is the normal build process. So you should place then inside the `.elm/Native`. The directory is created for you at the first build, if it doesn't exist yet.

Native modules inside Packages may be placed anywhere.

## Add Elm Modules from Packages

`elm-make` searches `packages/elm-*/*.elm` and adds Elm modules inside these directories to `.elm/.modules/[moduleName]`, which is inside the `source-directories` array. `[moduleName]` is the snake cased package name (without the username) with `elm-` removed. So `user:elm-someModule/MyMod.elm` becomes `SomeModule.MyMod`. Modules will need to be declared and imported this way. If you call an elm module by the same name as `[moduleName]`, it will be put inside `.elm/.modules` directly. So you could have a `SomeModule.elm` inside the `user:elm-someModule` package and declare the module as `SomeModule`.

There is no safeguard against collisions. So if you have `thisguy:elm-pop` and `thatgirl:elm-pop` installed, all modules are put inside `.elm/.modules/Pop`. So they may override each other.

## Complete Elm Build Process

Once every build:

1. Find project root (it'll up the directory structure until it finds a `.meteor` directory - _please tell me if you know a better way_).
2. Create `.elm`, `.elm/.temp`, `.elm/.modules`, `.elm/.gitignore` and `.elm/Native` if any them don't exist.
3. Has `.`, `.elm`, `.elm/.modules` in `elm-directories` (`.elm/elm-package.json`)? If not add them.

For every file

```
         'Is inside a package'[0]?
             ___/  \___
        Yes /          \ No
           /            \
     '*:elm-*'[1]?       \
         /  \________     \________
    Yes /            \ No          \
       /              \             \
'.modules'[2]          \             \
               'Should compile'[3]?  |
                  ___/  \            /
              No /       \ Yes      /
                /         \        |
       'Do nothing'[4]     |       |
                           |       |
                      '.temp'[5]   |
                           |    __/
                           |   /
                       'Compile'[6]

```

0. Simply checks if the file is inside a package. If its not go to [5].
1. Checks if the package name starts with `elm-` (ignoring the username).
2. Add the elm module to `.elm/.modules` ([see _Add Elm Modules from Packages_](#add-elm-bodules-from-packages)).
3. Is the file is named `Main.elm` or does it have the `._.elm` extension.
4. If none it shouldn't be compiled, ignore it.
5. Copy the file to `.temp` this needs to be done, because the build plugin doesn't know the real location of the file.
6. Compile the module.

## Recommendations

### Recommended structure

```
.elm
server
  Main.elm
common
  SomeLib.elm
client
  Main.elm
  Lib
    SomeLib.elm
```

`common/SomeLib.elm` Modules will need to be defined as
```elm
module Common.SomeLib where
```

From `server/Main.elm` you can import `common/SomeLib.elmk` using
```elm
import Common.SomeLib
```

## TODO

* tests.
* recursively delete .elm/.modules and .elm/.tmp in every build
* abstract the output from elm-make in order to prevent the ugly error message
* Add a way to specify dependencies from packages (elm-dependencies.json?)

