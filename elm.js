/* globals Plugin */
/* globals Meteor */
/* globals helpers */

import elm from 'elm/platform.js'

const elmMake = elm.executablePaths['elm-make']
const elmPackage = elm.executablePaths['elm-package']

const wrapScript = (str) => str + `
; if (Meteor.isServer) {
  Elm.worker(Elm.Main)
} else {
  window.addEventListener('load', function () {
    Elm.fullscreen(Elm.Main)
  })
}
`

const compileFile = (h, packageName, filePath, elmDir, file) => {
  if (packageName) {
    const module = h.makeModuleName(packageName, true)
    const tmpSource = h.cloneFile(h.join(elmDir, '.tmp', module, filePath), file, true)

    // Link the .tmp/module directory
    const sources = h.overrideSources(elmDir, [`.tmp/${module}`])
    const tmpPath = `${tmpSource}.tmp.js`

    // Compile
    h.execCommand(elmMake, [tmpSource, '--yes', `--output=${tmpPath}`], { cwd: elmDir })
    let data = h.getAndUnlink(tmpPath)

    // Relink the normal sources
    h.overrideSources(elmDir, sources)
    return data
  } else {
    const sourcePath = `${elmDir}/../${filePath}`
    const tmpPath = `${sourcePath}.tmp.js`
    // Compile
    h.execCommand(elmMake, [sourcePath, '--yes', `--output=${tmpPath}`], { cwd: elmDir })
    return h.getAndUnlink(tmpPath)
  }
}

const copyFile = (h, elmDir, packageName, filePath, file) => {
  const isNative = h.isNativeModule(filePath)
  const shouldExpose = h.shouldExpose(packageName)
  const isIndex = h.isIndexModule(packageName, filePath, !shouldExpose)

  let targetPath = [elmDir]

  // If the meteor package name has the `-elm` prefix, copy it into the
  // .modules directory. When compiling Elm files inside the app .module is
  // in the `source-directories`.
  if (shouldExpose) {
    targetPath.push('.modules')
  } else {
    // If it shouldn't be exposed, it'll only be usable from within the meteor
    // package the file is in.
    targetPath.push('.tmp')
  }

  // If it should be exposed and it's a native module `.elm.js`
  if (shouldExpose && isNative) {
    // Put it inside a `Native` directory, since only modules prefixed with
    // `Native.` can be native.
    targetPath.push('Native')
  }

  // All modules except for index modules (the ones with a filename matching the
  // package name),
  if (!isIndex) {
    // should be placed inside a directory named after the module. See
    // under the definition of `makeModuleName` for more info (lib/helpers.js)
    targetPath.push(h.makeModuleName(packageName, !shouldExpose))
  }

  // If the module is native, the path should be transformed, from
  // `path/to/module.elm.js` to `path/to/module.js`
  if (isNative) {
    targetPath.push(h.convertNativePath(filePath))
  } else {
    targetPath.push(filePath)
  }

  // Clone the file and create any missing directories.
  h.cloneFile(
    targetPath,
    // Also, compile ES6 to ES5 inside native modules.
    isNative
      ? h.es6File(file)
      : file
  )
}

const ElmCompiler = {}
ElmCompiler.processFilesForTarget = (files) => {
  const path = Plugin.path
  const h = helpers(Plugin, Meteor)

  const root = h.findRoot()
  const elmDir = h.setUpDirs(root)

  files.forEach((file) => {
    try {
      const filePath = file.getPathInPackage()
      const filename = path.basename(file.getPathInPackage())
      const packageName = file.getPackageName()

      if (filename === '.elm-dependencies.json') {
        h.addDeps(elmPackage, file.getContentsAsBuffer().toString(), elmDir)
      } else {
        if (h.shouldCompile(filename)) {
          const data = compileFile(h, packageName, filePath, elmDir, file)
          file.addJavaScript({
            path: `${filePath}.js`,
            data: filename === 'Main.elm'
              ? wrapScript(data)
              : data,
            bare: true
          })
        } else if (packageName) {
          copyFile(h, elmDir, packageName, filePath, file)
        }
      }
    } catch (e) {
      file.error({ message: `\n${e}\n` })
    }
  })
}

Plugin.registerCompiler({
  extensions: ['elm', '_.elm', 'elm.js', 'elm-dependencies.json'],
  filenames: []
}, () => Object.create(ElmCompiler))

