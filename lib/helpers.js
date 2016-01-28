helpers = (Plugin) => {
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

  const shouldExpose = name => name && name.split(':')[1].substr(0, 4) === 'elm-'

  const makeModuleName = str => {
    const split = str.split(':')
    if(shouldExpose(str)) {
      split[1] = packageNameSplit[1].substr(4)
    }
    return split[1][0].toUpperCase() + split[1].substr(1)
  }

  const shouldCompile = filename => filename === 'Main.elm' || filename.substr(-6) === '._.elm'

  const cloneFile = (root, extDir, packageName, relFilePath, file) => {
    const module = makeModuleName(packageName)
    const dirname = path.dirname(relFilePath)
    const modulePath = path.join(root, extDir, module, dirname)
    const sourcePath = path.join(modulePath, path.basename(relFilePath))

    deepMkdir(modulePath)
    fs.writeFileSync(sourcePath, file.getContentsAsBuffer())
    return sourcePath
  }

  const isIndexModule = (packageName, filename) => {
    const module = makeModuleName(packageName)
    return module === path.basename(filename, '.elm')
  }


  const setUpElmSources = elmDir => {
    const sources = ['.', '..', '.modules']
    const config = JSON.parse(fs.readFileSync(path.join(elmDir, 'elm-package.json')))
    let diff = sources.reduce(
      (mem, el) => config['source-directories'].indexOf(el) > -1
        ? mem
        : mem.concat(el),
      []
    )
    if(diff.length > 0) {
      config['source-directories'] = config['source-directories'].concat(diff)
      fs.writeFileSync(path.join(elmDir, 'elm-package.json'), JSON.stringify(config, null, 2))
    }
    return config
  }

  return { exists, deepMkdir, findRoot, makeModuleName, shouldExpose, shouldCompile, cloneFile, setUpElmSources, isIndexModule }
}

