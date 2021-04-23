const path = require('path');
const AdmZip = require('adm-zip');
const glob = require('globby');
const { getConfig } = require('../common.js');
const config = getConfig();

const run = async (opts) => {
    const zipFile = new AdmZip();

    // Get the build files
    const buildFiles = await glob([
        `${config.buildDir}/**/*`
    ]);

    // Loop our build
    for(const file of buildFiles){
        // Get the base path
        const zipPath = path.dirname(file).replace(config.buildDir, '');
        // Add file to zip
        zipFile.addLocalFile(file, zipPath);
    }

    // Write zip file
    zipFile.writeZip(path.join(config.buildDir, 'build.zip'));
};

module.exports = {
    run
};
