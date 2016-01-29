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

const ElmCompiler = {}
ElmCompiler.processFilesForTarget = files => {
  const fs = Plugin.fs
  const path = Plugin.path

  const h = helpers(Plugin, Meteor)

  const setUpDirs = (root) => {
    const elmDir = `${root}/.elm`
    if(!h.exists(elmDir)) fs.mkdirSync(elmDir)
    if(!h.exists(`${elmDir}/Native`)) fs.mkdirSync(`${elmDir}/Native`)
    if(!h.exists(`${elmDir}/.gitignore`)) fs.writeFileSync(`${elmDir}/.gitignore`, 'elm-stuff\n')
    if(!h.exists(`${elmDir}/.modules`)) fs.mkdirSync(`${elmDir}/.modules`)
    if(!h.exists(`${elmDir}/.tmp`)) fs.mkdirSync(`${elmDir}/.tmp`)
    return elmDir
  }

  const root = h.findRoot()
  const elmDir = setUpDirs(root)
  const config = h.setUpElmSources(elmDir)

  const registerModule = h.cloneFile.bind(null, elmDir, '.modules')
  const registerIndex = h.cloneFile.bind(null, elmDir, '.')
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

    // Relative path to .elm
    let sourcePath = `${elmDir}/../${filePath}`

    const virtPath = `${filePath}.js`
    const tmpPath = `${sourcePath}.tmp.js`

    if(packageName) {
      // If the file is within package
      if (h.shouldCompile(filename)) {
        sourcePath = registerTemp(packageName, filePath, file)
      } else if (h.shouldExpose(packageName)) {
        // Then register the module in a .elm/.modules elm- the modules
        // will be imporable by all other elm modules.
        if (h.isIndexModule(packageName, filePath)) {
          sourcePath = registerIndex(packageName, filePath, file)
        } else {
          sourcePath = registerModule(packageName, filePath, file)
        }
      } else {
        // If it should neither be compiled or registered, ignore the file
        return
      }
    }

    try {
      h.execCommand(elmMake, [`${sourcePath}`, '--yes', `--output=${tmpPath}`], { cwd: elmDir })
      const data = fs.readFileSync(tmpPath).toString()
      fs.unlinkSync(tmpPath)

      file.addJavaScript({
        path: virtPath,
        data: filename === 'Main.elm'
          ? wrapScript(data)
          : data,
        bare: true
      })
    } catch (e) {
      console.error(`Error while parsing ${packageName} ${filePath}`)
      console.error(e)
      return
    }
  })
}

Plugin.registerCompiler({
  extensions: ['elm', '_.elm', 'elm-dependencies.json'],
  filenames: []
}, () => Object.create(ElmCompiler))

