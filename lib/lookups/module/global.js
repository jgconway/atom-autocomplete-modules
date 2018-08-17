const internalModules = require('../../utils/internal-modules');
const Promise = require('bluebird');

class GlobalLookup {
  constructor(readdir, getProjectPath, path, localLookup) {
    this.readdir = readdir;
    this.getProjectPath = getProjectPath;
    this.path = path;
    this.local = localLookup;
  }

  isNeeded(prefix) { return prefix[0] !== '.'; }

  getList(prefix, filePath, configs) {
    const vendors = (configs && configs.vendors) || ['node_modules'];
    const includeExtension = (configs && configs.includeExtension) || false;
    const promises = vendors.map(vendor => this.lookup(prefix, filePath, vendor, includeExtension));
    return Promise.all(promises)
    .reduce((total, result) => [...total, ...result], []);
  }

  lookup(prefix, activePanePath, vendor = 'node_modules', includeExtension) {
    const projectPath = this.getProjectPath(activePanePath);
    if (!projectPath) {
      return Promise.resolve([]);
    }

    const vendorPath = this.path.join(projectPath, vendor);

    if (prefix.indexOf('/') !== -1) {
      return this.local.lookup(`./${prefix}`, vendorPath, includeExtension);
    }

    return this.readdir(vendorPath)
    .catch(e => {
      if (e.code !== 'ENOENT') { throw e; }
      return Promise.resolve([]);
    })
    .then(libs => [...internalModules, ...libs])
    .filter(module => prefix ? module.includes(prefix) : true)
    .map(lib => ({
      text: lib,
      replacementPrefix: prefix,
      type: 'import'
    }));
  }
}

module.exports = GlobalLookup;