/* globals Babel */
/* globals helpers */
/* exported helpers */

import { spawn } from 'child_process'

const ignore = `elm-stuff
.tmp
.modules
`

helpers = (Plugin, Meteor) => { // eslint-disable-line no-native-reassign
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
    if (!dir) return
    if (!notFirst && exists(dir)) return
    if (exists(dir)) {
      return dir
    } else {
      deepMkdir(path.join(dir, '..'), true)
      fs.mkdirSync(dir)
    }
  }

  const findRoot = () => {
    let curr = process.cwd()
    while (exists(curr) && !exists(path.join(curr, '.meteor'))) {
      curr = path.join(curr, '..')
    }
    if (!exists(curr)) throw new Error('not in a Meteor project')
    return curr
  }

  const hasElmPref = (str) => str.substr(0, 4) === 'elm-'

  const shouldExpose = (name) => {
    if (!name) return
    const split = name.split(':')
    return name && (split[0] === 'elm' || hasElmPref(split[1]))
  }

  // This function generates Elm module names from Meteor package names. It
  // normally splits the package name at `:`, capitalizes both parts (user ->
  // User) and joins then again. So `user:package` becomes `UserPackage`. If the
  // second parameter is false, it discards the `user` part of the package name.
  const makeModuleName = (str, noConflict) => {
    const split = str.split(':')
    let prefix = ''
    if (shouldExpose(str) && hasElmPref(split[1])) {
      split[1] = split[1].substr(4)
    }
    if (noConflict) {
      prefix = split[0][0].toUpperCase() + split[0].substr(1)
    }
    return prefix + split[1][0].toUpperCase() + split[1].substr(1)
  }

  const shouldCompile = (filename) => filename === 'Main.elm' || filename.substr(-6) === '._.elm'

  const isNativeModule = (filePath) => filePath.substr(-7) === '.elm.js'

  const getNativeModulePath = (filePath, module, index) => {
    if (index) {
      return path.join('Native', filePath.substr(0, filePath.length - 7) + '.js')
    } else {
      return path.join('Native', module, filePath.substr(0, filePath.length - 7) + '.js')
    }
  }

  const es6File = (file) => Babel.compile(
      file.getContentsAsBuffer().toString(),
      Babel.getDefaultOptions()
    ).code

  const cloneFile = (filePath, file) => {
    if (typeof filePath === 'object') filePath = path.join.apply(path, filePath)
    deepMkdir(path.dirname(filePath))
    if (typeof file === 'string') {
      fs.writeFileSync(filePath, file)
    } else {
      fs.writeFileSync(filePath, file.getContentsAsBuffer())
    }
    return filePath
  }

  const isIndexModule = (packageName, filePath, shouldExpose) => {
    const filename = path.basename(filePath)
    return (
      makeModuleName(packageName, shouldExpose) === filename.substring(0, filename.length - 4) ||
      makeModuleName(packageName, shouldExpose) === filename.substring(0, filename.length - 7)
    )
  }

  const getConfig = (elmDir) => JSON.parse(fs.readFileSync(path.join(elmDir, 'elm-package.json')))

  const writeConfig = (elmDir, config) => fs.writeFileSync(path.join(elmDir, 'elm-package.json'), JSON.stringify(config, null, 2))

  const overrideSources = (elmDir, sourcesArr) => {
    const config = getConfig(elmDir)
    const currSources = config['source-directories']
    config['source-directories'] = sourcesArr
    writeConfig(elmDir, config)
    return currSources
  }

  const setUpElmSources = (elmDir) => {
    const sources = ['.', '..', '.modules']
    const config = getConfig(elmDir)
    let diff = sources.reduce(
      (mem, el) => config['source-directories'].indexOf(el) > -1
        ? mem
        : mem.concat(el),
      []
    )
    if (diff.length > 0 || !config['native-modules']) {
      config['native-modules'] = true
      config['source-directories'] = config['source-directories'].concat(diff)
      writeConfig(elmDir, config)
    }
    return config
  }

  const execCommand = Meteor.wrapAsync((cmd, args, opts, done) => {
    let out = ''
    const proc = spawn(cmd, args, opts)
    proc.stderr.on('data', (data) => { out += data })
    proc.stdout.on('data', (data) => { out += data })
    proc.on('exit', (err) => {
      if (err > 0) {
        return done(out)
      }
      done(null, out)
    })
  })

  const addDeps = (elmPackage, configStr, cwd) => {
    const deps = JSON.parse(configStr)
    const config = getConfig(cwd)
    const packages = Object.keys(deps)
      .filter((key) => !config.dependencies[key])
      .map((key) => [key, deps[key]])

    packages.forEach((dep) => {
      try {
        execCommand(elmPackage, ['install', '-y', dep[0], dep[1]], { cwd })
        if (packages.length > 0) {
          console.log(`\nNew packages installed: \n${packages.map((dep) => dep.join(' ')).join(',')}\n`)
        }
      } catch (e) {
        console.error(`\n${e}\n`)
      }
    })
  }

  const getAndUnlink = (file) => {
    const data = fs.readFileSync(file).toString()
    fs.unlinkSync(file)
    return data
  }

  const convertNativePath = (filepath) => filepath.substring(0, filepath.length - 7) + filepath.substr(-3)

  const join = path.join.bind(path)

  const setUpDirs = (root) => {
    const elmDir = `${root}/.elm`
    if (!exists(elmDir)) fs.mkdirSync(elmDir)
    if (!exists(`${elmDir}/.gitignore`)) fs.writeFileSync(`${elmDir}/.gitignore`, ignore)
    if (!exists(`${elmDir}/.modules`)) fs.mkdirSync(`${elmDir}/.modules`)
    if (!exists(`${elmDir}/.tmp`)) fs.mkdirSync(`${elmDir}/.tmp`)
    return elmDir
  }

  const packageAuthor = (packageName) => packageName.split(':')[0]

  return {
    exists,
    deepMkdir,
    findRoot,
    makeModuleName,
    shouldExpose,
    shouldCompile,
    cloneFile,
    setUpElmSources,
    isIndexModule,
    addDeps,
    execCommand,
    getAndUnlink,
    overrideSources,
    getConfig,
    isNativeModule,
    es6File,
    getNativeModulePath,
    convertNativePath,
    join,
    setUpDirs,
    packageAuthor
  }
}

