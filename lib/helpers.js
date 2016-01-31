const spawn = Npm.require('child_process').spawn

helpers = (Plugin, Meteor) => {
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
    while(exists(curr) && !exists(path.join(curr, '.meteor'))) {
      curr = path.join(curr, '..')
    }
    if(!exists(curr)) throw new Error('not in a Meteor project')
    return curr
  }

  const shouldExpose = (name) => {
    const split = name.split(':')
    return name && (split[0] === 'elm' || split[1].substr(0, 4) === 'elm-')
  }

  const makeModuleName = (str, noConflict) => {
    const split = str.split(':')
    let prefix = ''
    if(shouldExpose(str)) {
      split[1] = split[1].substr(4)
    }
    if(noConflict) {
      prefix = split[0][0].toUpperCase() + split[0].substr(1)
    }
    return prefix + split[1][0].toUpperCase() + split[1].substr(1)
  }

  const shouldCompile = filename => filename === 'Main.elm' || filename.substr(-6) === '._.elm'

  const isNativeModule = filePath => filePath.substr(-7) === '.elm.js'

  const getNativeModulePath = filePath => filePath.substr(0, filePath.length - 7) + '.js'

  const es5File = file => Babel.compile(
      file.getContentsAsBuffer().toString(),
      Babel.getDefaultOptions()
    ).code

  const cloneFile = (root, extDir, module, relFilePath, file, noConflict) => {
    const dirname = path.dirname(relFilePath)
    const modulePath = path.join(root, extDir, module, dirname)
    const sourcePath = path.join(modulePath, path.basename(relFilePath))

    deepMkdir(modulePath)
    if(typeof file === 'string') {
      fs.writeFileSync(sourcePath, file)
    } else {
      fs.writeFileSync(sourcePath, file.getContentsAsBuffer())
    }
    return sourcePath
  }

  const isIndexModule = (packageName, filename) => {
    const module = makeModuleName(packageName)
    return module === path.basename(filename, '.elm')
  }

  const getConfig = elmDir => JSON.parse(fs.readFileSync(path.join(elmDir, 'elm-package.json')))

  const writeConfig = (elmDir, config) => fs.writeFileSync(path.join(elmDir, 'elm-package.json'), JSON.stringify(config, null, 2))

  const overrideSources = (elmDir, sourcesArr) => {
    const config = getConfig(elmDir)
    const currSources = config['source-directories']
    config['source-directories'] = sourcesArr
    writeConfig(elmDir, config)
    return currSources
  }

  const setUpElmSources = elmDir => {
    const sources = ['.', '..', '.modules']
    const config = getConfig(elmDir)
    let diff = sources.reduce(
      (mem, el) => config['source-directories'].indexOf(el) > -1
        ? mem
        : mem.concat(el),
      []
    )
    if(diff.length > 0 || !config['native-modules']) {
      config['native-modules'] = true
      config['source-directories'] = config['source-directories'].concat(diff)
      writeConfig(elmDir, config)
    }
    return config
  }

  const execCommand = Meteor.wrapAsync((cmd, args, opts, done) => {
    let out = ''
    const proc = spawn(cmd, args, opts)
    proc.stderr.on('data', data => out += data)
    proc.stdout.on('data', data => out += data)
    proc.on('exit', (err) => {
      if(err > 0) {
        return done(out)
      }
      done(null, out)
    })
  })

  const addDeps = (elmPackage, configStr, cwd) => {
    const diff = []
    const deps = JSON.parse(configStr)
    const config = getConfig(cwd)
    const packages = Object.keys(deps)
      .filter(key => !config.dependencies[key])
      .map(key => [key, deps[key]])

    packages.forEach(dep => {
      try {
        const out = execCommand(elmPackage, ['install', '-y', dep[0], dep[1]], { cwd })
        if(packages.length > 0) {
          console.log(`\nNew packages installed: \n${packages.map(dep => dep.join(' ')).join(',')}\n`)
        }
      } catch (e) {
        console.error(`\n${e}\n`)
      }
    })
  }

  const getAndUnlink = file => {
    const data = fs.readFileSync(file).toString()
    fs.unlinkSync(file)
    return data
  }

  return {
    exists
  , deepMkdir
  , findRoot
  , makeModuleName
  , shouldExpose
  , shouldCompile
  , cloneFile
  , setUpElmSources
  , isIndexModule
  , addDeps
  , execCommand
  , getAndUnlink
  , overrideSources
  , getConfig
  , isNativeModule
  , es5File
  , getNativeModulePath
  }
}

