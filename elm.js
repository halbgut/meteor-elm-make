const spawn = Npm.require('child_process').spawn
const elm = Npm.require('elm/platform')

const elmMake = elm.executablePaths['elm-make']

const wrapScript = str => str + `
; if (Meteor.isServer) {
  Elm.worker(Elm.Main)
} else {
  window.addEventListener('load', Elm.fullscreen.bind(Elm, Elm.Main))
}
`

const ElmCompiler = {}
ElmCompiler.processFilesForTarget = files => {
  const fs = Plugin.fs
  const path = Plugin.path

  const h = helpers(Plugin)

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

  const registerTemp = h.cloneFile.bind(null, elmDir, '.modules')
  const registerModule = h.cloneFile.bind(null, elmDir, '.tmp')

  files.forEach(file => {
    let tempFiles = []

    const filePath = file.getPathInPackage()
    const filename = path.basename(file.getPathInPackage())
    const packageName = file.getPackageName()

    // Relative path to .elm
    let sourcePath = `${elmDir}/../${filePath}`

    const virtPath = `${filePath}.js`
    const tmpPath = `${sourcePath}.tmp.js`

    if(packageName) {
      // If the file is within package
      if (h.shouldCompile(filename)) {
        sourcePath = registerTemp(packageName, filePath, file)
        tempFiles.push(sourcePath)
      } else if (h.shouldExpose(packageName)) {
        // Then register the module in a .elm/.modules elm- the modules
        // will be imporable by all other elm modules.
        sourcePath = registerModule(packageName, filePath, file,)
      } else {
        // If it should neither be compiled or registered, ignore the file
        return
      }
    }

    const data = Meteor.wrapAsync(done => {
      spawn(elmMake, [`${sourcePath}`, '--yes', `--output=${tmpPath}`], { cwd: elmDir, stdio: 'inherit' })
        .on('exit', Meteor.bindEnvironment((err) => {
          if(err > 0) {
            done(err)
          }
          const data = fs.readFileSync(tmpPath).toString()
          fs.unlinkSync(tmpPath)
          done(null, data)
        }))
    })()

    file.addJavaScript({
      path: virtPath,
      data: filename === 'Main.elm'
        ? wrapScript(data)
        : data,
      bare: true
    })
  })
}

Plugin.registerCompiler({
  extensions: ['elm', '_.elm'],
  filenames: []
}, () => Object.create(ElmCompiler))

