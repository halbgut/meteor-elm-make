## Install

```
meteor add elm:make
```

# elm:make - 0.4.0 for Elm 0.16.0

Build Elm inside your Meteor app. Bindings for Meteor are provided by other packages which aren't done yet. [elm:meteor](https://github.com/Kriegslustig/meteor-elm-meteor), [elm:mongo](https://github.com/Kriegslustig/meteor-elm-mongo)

## Basic Usage

There is no configuration needed to use this package. Just add it to your Meteor App using the [add command](#install).

The build plugin searches for two kinds of files inside your app:

* `Main.elm` (ex. `client/Main.elm`)
* `*._.elm` (ex. `common/Something._.elm`)

If you're writing your application in Elm, you'll want to use the former variant. I recommend creating two `Main` modules one `server/Main.elm` and one `client/Main.elm`. Then import different modules from these.

`elm:make` saves all its stuff inside an `.elm` directory, which will be created at the [root of your project](#complete-elm-build-process). So if you'd like to modify some settings for Elm you'll need to do that inside `.elm`.

To install packages you should create a `.elm-dependencies.json` file. It should contain an object, with elm-module names as keys and the desired versions values. These two strings are passed directly to the `elm-package` CLI.

```json
{
  "evancz/elm-markdown": "2.0.1"
}
```

## Native Elm Modules

Don't know what they are? [Read about them here](https://github.com/NoRedInk/take-home/wiki/Writing-Native).

To create native modules you'll need to use the extension `.elm.js`.

Native modules should be placed in a directory called `Native`. That directory should be inside the root of your app or package. Native module files must have the `.elm.js` extension.

## Add Elm Modules from Packages

You can create modules from within packages, that may be imported from module inside an app depending on that package. If you prefix your package name with `elm-`, all Elm modules will be available to modules inside the app and other modules.

To register an Elm module for modules inside the app and other meteor-packages to use it you'll need to add it using `api.addFiles` inside your `package.json`. If your package name starts with `elm-`, `elm:make` adds your Elm modules to `.elm/.modules/[moduleName]`, which is inside the `source-directories` array. `[moduleName]` is the snake cased package name (without the username) with `elm-` removed. So `user:elm-someModule/MyMod.elm` becomes `SomeModule.MyMod`. Modules will need to be declared and imported this way. If you call an elm module by the same name as `[moduleName]`, it will be put inside `.elm/.modules` directly. So you could have a `SomeModule.elm` inside the `user:elm-someModule` package and declare the module as `SomeModule`.

There is no safeguard against collisions. So if you have `thisguy:elm-pop` and `thatgirl:elm-pop` installed, all modules are put inside `.elm/.modules/Pop`. So they may override each other.

To declare dependencies from within a meteor package, you can add a `.elm-dependencies.json` file. You'll need to add the file in your `package.js` file using `api.addFiles`. You have to add the dependencies file before adding the elm-modules. The file should contain an object with the elm package names as keys and versions as values. The versions are passed to `elm-package install` as they are. Here's an example

```json
{
  "evancz/elm-markdown": "2.0.1"
}
```

Just as with Modules registered from Meteor packages, there dependency collisions will be ignored. So if one package requires `"evancz/elm-markdown": "2.0.1"` and an other `"evancz/elm-markdown": "1.0.0"`. The first one loaded will be installed. If the package with `1.0.0` is built first it will be installed and the `2.0.1` dependency will basically be ignored. You can always override dependencies manually using the elm command line tool from within `.elm`.

## Compiling Elm modules inside packages

**Don't compile Elm inside packages!** Exposing modules to apps from meteor packages is a great idea. But compiling them inside packages is a bad idea. The main reason is that `elm:make` creates a `.elm` directory inside the apps root directory. So even though `elm:make` supports this, you shouldn't do it.

## Complete Elm Build Process

**This is currently beeing worked on.**

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
                        |            |
                    '.temp'[3]       |
                        |            |
               'Should compile'[4]?  |
                  ___/  \            /
              No /       \ Yes      /
                /         \        /
       'Do nothing'[5]     |    __/
                           |   /
                       'Compile'[6]

```

0. Simply checks if the file is inside a package. If its not go to [5].
1. Checks if the package name starts with `elm-` (ignoring the username).
2. Add the elm module to `.elm/.modules` ([see _Add Elm Modules from Packages_](#add-elm-bodules-from-packages)).
3. Copy the file to `.temp` this needs to be done, because the build plugin doesn't know the real location of the file.
4. Is the file is named `Main.elm` or does it have the `._.elm` extension.
5. If none it shouldn't be compiled, do nothing more.
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

* update the native modules section
* tests
* recursively delete .elm/.modules and .elm/.tmp in every build (or something)
* prettier error msgs

