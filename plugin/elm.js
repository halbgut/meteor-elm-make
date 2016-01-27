const spawn = Npm.require('child_process').spawn
const elm = Npm.require('elm/platform')

const elmMake = elm.executablePaths['elm-make']

const ElmCompiler = comp => {
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
    return elmDir
  }

  const filename = path.basename(comp.inputPath)
  if(filename !== 'Main.elm' && filename.split('.')[1] !== '_') return

  const root = findRoot()
  const elmDir = setUpDirs(root)
  console.log(elmDir)

  const sourcePath = `${comp.fullInputPath}`
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

