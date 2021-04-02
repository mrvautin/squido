const util = require('util');
const path = require('path');
const fs = require('fs');
const ex = util.promisify(require('child_process').exec);
const { getConfig } = require('../lib/common');
const config = getConfig();

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
    postPath: path.join(config.sourceDir, 'posts'),
    config
};
