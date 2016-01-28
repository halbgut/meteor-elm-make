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
    return (
      split[0][0].toUpperCase()
      + split[0].substr(1)
      + split[1][0].toUpperCase()
      + split[1].substr(1)
    )
  }

  const shouldCompile = filename => filename === 'Main.elm' || filename.substr(-6) === '._.elm'

  const cloneFile = (root, extDir, packageName, relFilePath, file) => {
    const module = makeModuleName(packageName)
    const dirname = path.dirname(relFilePath) === '.'
      ? ''
      : path.dirname(relFilePath)
    const modulePath = path.join(root, extDir, module, dirname)
    const sourcePath = path.join(modulePath, path.basename(relFilePath))

    deepMkdir(modulePath)
    fs.writeFileSync(sourcePath, file.getContentsAsBuffer())
    return sourcePath
  }

  return { exists, deepMkdir, findRoot, makeModuleName, shouldExpose, shouldCompile, cloneFile }
}

