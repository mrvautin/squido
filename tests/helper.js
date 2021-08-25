const util = require('util');
const path = require('path');
const fs = require('fs');
const ex = util.promisify(require('child_process').exec);
const { getConfig } = require('../lib/common');
// Setup the config
getConfig();

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

const greaterThan = (v1, v2) => {
    if(v1 > v2){
        return true;
    }
    return false;
};

module.exports = {
    exec,
    exists,
    greaterThan,
    rootPath: path.join(process.cwd()),
    postPath: path.join(process.config.sourceDir, 'posts'),
    config: process.config
};
