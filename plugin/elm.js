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

  const exists = (thing) => {
    try {
      fs.statSync(thing)
    } catch (e) {
      return false
    }
    return true
  }

  const deepMkdir = (dir, notFirst) => {
    if(!dir) return
    if(!notFirst && exists(dir)) return
    if(exists(dir)) {
      return dir
    } else {
      deepMkdir(path.join(dir, '..'), true)
      fs.mkdirSync(dir)
    }
  }

  const findRoot = () => {
    let curr = process.cwd()
    while(exists(curr) && !exists(`${curr}/.meteor`)) {
      curr += '/..'
    }
    if(!exists(curr)) throw new Error('not in a Meteor project')
    return curr
  }

  const setUpDirs = (root) => {
    const elmDir = `${root}/.elm`
    if(!exists(elmDir)) fs.mkdirSync(elmDir)
    if(!exists(`${elmDir}/Native`)) fs.mkdirSync(`${elmDir}/Native`)
    if(!exists(`${elmDir}/.gitignore`)) fs.writeFileSync(`${elmDir}/.gitignore`, 'elm-stuff\n')
    if(!exists(`${elmDir}/.modules`)) fs.mkdirSync(`${elmDir}/.modules`)
    if(!exists(`${elmDir}/.tmp`)) fs.mkdirSync(`${elmDir}/.tmp`)
    return elmDir
  }

  const root = findRoot()
  const elmDir = setUpDirs(root)

  files.forEach(file => {
    const filePath = file.getPathInPackage()
    const filename = path.basename(file.getPathInPackage())
    const packageName = file.getPackageName()

    // Relative path to .elm
    let sourcePath = `${elmDir}/../${filePath}`

    const virtPath = `${filePath}.js`
    const tmpPath = `${sourcePath}.tmp.js`

    if(filename !== 'Main.elm') {
      // If the file is within package
      if(packageName) {
        const packageNameSplit = packageName.split(':')
        const moduleName =
          packageNameSplit[0][0].toUpperCase() +
          packageNameSplit[0].substr(1)
        let modulePath
        const dirname = path.dirname(filePath) === '.'
          ? ''
          : path.dirname(filePath)
        if(packageNameSplit[1].substr(0, 4) === 'elm-') {
          const cleanModuleName = packageNameSplit[1].substr(4)
          const module = moduleName + cleanModuleName[1][0].toUpperCase() + cleanModuleName[1].substr(1)
          modulePath = `${elmDir}/.modules/${module}/${dirname}`
        } else {
          // These modules won't need to be accessible
          const module = moduleName + packageNameSplit[1][0].toUpperCase() + packageNameSplit[1].substr(1)
          modulePath = `${elmDir}/.tmp/${module}/${dirname}`
        }

        deepMkdir(modulePath)

        sourcePath = `${modulePath}/${filename}`
        fs.writeFileSync(sourcePath, file.getContentsAsBuffer())
      }

      if(!file.getBasename().split('.')[1] !== '_') {
        return
      }
    }

    const data = Meteor.wrapAsync(done => {
      console.log(tmpPath, sourcePath)
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

