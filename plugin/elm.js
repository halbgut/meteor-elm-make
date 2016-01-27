const spawn = Npm.require('child_process').spawn
const elm = Npm.require('elm/platform')

const elmMake = elm.executablePaths['elm-make']

const ElmCompiler = comp => {
  const fs = Plugin.fs
  const path = Plugin.path

  const setUpDirs = (root) => {
    const elmDir = `${root}/.elm`
    const stat = fs.statSync(elmDir)
    if(!stat) {
      fs.mkdirSync(elmDir)
      fs.writeFileSync(`${elmDir}/.gitignore`, '*\n')
    }
    return elmDir
  }

  const filename = path.basename(comp.inputPath)
  if(filename !== 'main.elm') return

  const root = `${process.cwd()}`
  const elmDir = setUpDirs(root)

  const sourcePath = `${root}/${comp.inputPath}`
  const virtPath = `${comp.inputPath}.js`
  const tmpPath = `${sourcePath}.tmp.js`

  const data = Meteor.wrapAsync(done => {
    spawn(elmMake, [sourcePath, '--yes', `--output=${tmpPath}`], { cwd: elmDir, stdio: 'inherit' })
      .on('exit', Meteor.bindEnvironment((err) => {
        if(err > 0) {
          done(err)
        }
        const data = fs.readFileSync(tmpPath).toString()
        fs.unlinkSync(tmpPath)
        done(null, data)
      }))
  })()

  comp.addJavaScript({
    path: virtPath,
    sourcePath,
    data,
    bare: true
  })
}

Plugin.registerSourceHandler('elm', { archMatching: 'web' }, ElmCompiler)

