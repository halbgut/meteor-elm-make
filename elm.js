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

const ElmCompiler = {}
ElmCompiler.processFilesForTarget = files => {
  const fs = Plugin.fs
  const path = Plugin.path

  const h = helpers(Plugin, Meteor)

  const setUpDirs = (root) => {
    const elmDir = `${root}/.elm`
    if(!h.exists(elmDir)) fs.mkdirSync(elmDir)
    if(!h.exists(`${elmDir}/.gitignore`)) fs.writeFileSync(`${elmDir}/.gitignore`, ignore)
    if(!h.exists(`${elmDir}/.modules`)) fs.mkdirSync(`${elmDir}/.modules`)
    if(!h.exists(`${elmDir}/.tmp`)) fs.mkdirSync(`${elmDir}/.tmp`)
    return elmDir
  }

  const root = h.findRoot()
  const elmDir = setUpDirs(root)
  const config = h.setUpElmSources(elmDir)

  const registerModule = h.cloneFile.bind(null, elmDir, '.modules')
  const registerIndex = h.cloneFile.bind(null, elmDir, '.modules', '.')
  const registerTemp = h.cloneFile.bind(null, elmDir, '.tmp')

  files.forEach(file => {
    let tempFiles = []

    const filePath = file.getPathInPackage()
    const filename = path.basename(file.getPathInPackage())
    const packageName = file.getPackageName()

    if(filename === '.elm-dependencies.json') {
      h.addDeps(elmPackage, file.getContentsAsBuffer().toString(), elmDir)
      return
    }

    const virtPath = `${filePath}.js`

    let data

    if(packageName) {
      // If the file is within package
      if (h.shouldCompile(filename)) {
        const module = h.makeModuleName(packageName, true)
        const tmpSource = registerTemp(module, filePath, file, true)
        // Link the .tmp/module directory
        const sources = h.overrideSources(elmDir, [`.tmp/${module}`])
        const tmpPath = `${tmpSource}.tmp.js`
        h.execCommand(elmMake, [tmpSource, '--yes', `--output=${tmpPath}`], { cwd: elmDir })
        data = h.getAndUnlink(tmpPath)
        // Relink the normal sources
        h.overrideSources(elmDir, sources)
      } else if (h.shouldExpose(packageName)) {
        // Then register the module in a .elm/.modules elm- the modules
        // will be imporable by all other elm modules.
        if (h.isIndexModule(packageName, filePath)) {
          registerIndex(filePath, file)
        } else if (h.isNativeModule(filePath)) {
          if (h.isNativeIndex(packageName, filePath)) {
            const nativePath = h.getNativeModulePath(filePath, h.makeModuleName(packageName), true)
            registerModule('.', nativePath, h.es5File(file))
          } else {
            const nativePath = h.getNativeModulePath(filePath, h.makeModuleName(packageName))
            registerModule('.', nativePath, h.es5File(file))
          }
        } else {
          registerModule(h.makeModuleName(packageName), filePath, file)
        }
        return
      } else {
        // Might be an internal dep inside a package
        const module = h.makeModuleName(packageName, true)
        if (h.isNativeModule(filePath)) {
          // TODO: This is kinda broken Native.Yolo becomes Native.Native.Yolo
          registerTemp('.', h.getNativeModulePath(filePath, module), h.es5File(file))
        } else {
          registerTemp(module, filePath, file)
        }
        return
      }
    } else if (h.shouldCompile(filename)) {
      const sourcePath = `${elmDir}/../${filePath}`
      const tmpPath = `${sourcePath}.tmp.js`
      h.execCommand(elmMake, [sourcePath, '--yes', `--output=${tmpPath}`], { cwd: elmDir })
      data = h.getAndUnlink(tmpPath)
    } else if (h.isNativeModule(filePath)) {
      registerModule(
        '.',
        h.getNativeModulePath(filePath),
        h.es5File(file)
      )
    } else {
      // Not in a package and shouldn't compile
      return
    }

    file.addJavaScript({
      path: virtPath,
      data: filename === 'Main.elm'
        ? wrapScript(data)
        : data,
      bare: true
    })

    try {
    } catch (e) {
      console.error(`\nError while parsing ${packageName ? packageName : ''} ${filePath}\n${e}\n`)
    }
  })
}

Plugin.registerCompiler({
  extensions: ['elm', '_.elm', 'elm.js', 'elm-dependencies.json'],
  filenames: []
}, () => Object.create(ElmCompiler))

