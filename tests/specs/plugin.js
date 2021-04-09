const {
    serial: test
} = require('ava');
const { getConfig } = require('../../lib/common');
const config = getConfig();
const h = require('../helper');

test('Run build - check output for plugin code', async t => {
    // Run build and clean
    let cmd = '';
    let cleanString = '';
    try{
        cmd = await h.exec(`${h.rootPath}/cli.js build -c`);
        cleanString = `Cleaned: ${config.buildDir}`;
    }catch(ex){
        console.log('Ex', ex);
    }

    t.deepEqual(cmd.includes(cleanString), true);
    t.deepEqual(cmd.includes('[Build complete]'), true);
    t.deepEqual(cmd.includes(`testplugin ${JSON.stringify(config.plugins[0].options)}`), true);
});
