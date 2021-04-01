const util = require('util');
const path = require('path');
const fs = require('fs');
const ex = util.promisify(require('child_process').exec);
const { getConfig } = require('../lib/common');
const environment = process.env.NODE_ENV || 'development';
const config = getConfig(environment);

const exec = async(cmd) => {
    const { stdout, stderr } = await ex(cmd);

    if(stderr){
        return stderr;
    }
    return stdout;
};

const exists = async(file) => {
    return fs.existsSync(file);
};

module.exports = {
    exec,
    exists,
    rootPath: path.join(process.cwd()),
    buildPath: path.join(process.cwd(), config.buildDir),
    sourcePath: path.join(process.cwd(), config.sourceDir),
    postPath: path.join(process.cwd(), config.sourceDir, 'posts'),
    config
};
