const elm = Npm.require('elm/platform')

const elmMake = elm.executablePaths['elm-make']
const elmPackage = elm.executablePaths['elm-package']

const wrapScript = str => str + `
; if (Meteor.isServer) {
  Elm.worker(Elm.Main)
} else {
  window.addEventListener('load', function () {
    Elm.fullscreen(Elm.Main)
  })
}
`

const ignore = `elm-stuff
.tmp
.modules
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
  const isPackage = packageName
  const isNative = h.isNativeModule(filePath)
  const shouldExpose = isPackage
    ? h.shouldExpose(packageName)
    : false
  const isTest = isPackage
    ? h.packageAuthor(packageName) === 'local-test'
    : false
  const isIndex = isPackage
    ? h.isIndexModule(packageName, filePath, !shouldExpose)
    : false

  let targetPath = [elmDir]

  if (!isPackage || shouldExpose) {
    targetPath.push('.modules')
  } else {
    targetPath.push('.tmp')
  }

  if (shouldExpose && isNative) {
    targetPath.push('Native')
  }

  if (!isIndex && isPackage) {
    targetPath.push(h.makeModuleName(packageName, !shouldExpose))
  }

  if (!shouldExpose && isPackage && isNative) {
    targetPath.push('Native')
  }

  if (isNative) {
    targetPath.push(h.convertNativePath(filePath))
  } else {
    targetPath.push(filePath)
  }

  h.cloneFile(
    targetPath,
    isNative
      ? h.es6File(file)
      : file
  )
}

const ElmCompiler = {}
ElmCompiler.processFilesForTarget = files => {
  const fs = Plugin.fs
  const path = Plugin.path
  const h = helpers(Plugin, Meteor)

  const root = h.findRoot()
  const elmDir = h.setUpDirs(root)
  const config = h.setUpElmSources(elmDir)

  files.forEach(file => {
    const filePath = file.getPathInPackage()
    const filename = path.basename(file.getPathInPackage())
    const packageName = file.getPackageName()

    if (filename === '.elm-dependencies.json') {
      h.addDeps(elmPackage, file.getContentsAsBuffer().toString(), elmDir)
    } else {
      if (h.shouldCompile(filename)) {
        try {
          const data = compileFile(h, packageName, filePath, elmDir, file)
          file.addJavaScript({
            path: `${filePath}.js`,
            data: filename === 'Main.elm'
              ? wrapScript(data)
              : data,
            bare: true
          })
        } catch (e) {
          file.error({ message: `\n${e}\n` })
        }
      } else {
        copyFile(h, elmDir, packageName, filePath, file)
      }
    }
  })
}

Plugin.registerCompiler({
  extensions: ['elm', '_.elm', 'elm.js', 'elm-dependencies.json'],
  filenames: []
}, () => Object.create(ElmCompiler))

