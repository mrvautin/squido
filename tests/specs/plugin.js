const {
    serial: test
} = require('ava');
const h = require('../helper');

test('Run build - check testplugin output', async t => {
    // Run build and clean
    let cmd = '';
    let cleanString = '';
    try{
        cmd = await h.exec(`node ${h.rootPath}/cli.js build -c`);
        cleanString = `Cleaned: ${process.config.buildDir}`;
    }catch(ex){
        console.log('Ex', ex);
    }

    t.deepEqual(cmd.includes(cleanString), true);
    t.deepEqual(cmd.includes('[Build complete]'), true);
    t.deepEqual(cmd.includes(`testplugin ${JSON.stringify(process.config.plugins[0].options)}`), true);
});

test('Run build - ensure dud plugins are handled', async t => {
    // Run build and clean
    let cmd = '';
    let cleanString = '';
    try{
        cmd = await h.exec(`node ${h.rootPath}/cli.js build -c`);
        cleanString = `Cleaned: ${process.config.buildDir}`;
    }catch(ex){
        console.log('Ex', ex);
    }

    t.deepEqual(cmd.includes(cleanString), true);
    t.deepEqual(cmd.includes('[Build complete]'), true);
    t.deepEqual(cmd.includes('Failed to run plugin dudplugin.'), true);
    t.deepEqual(cmd.includes('Ex Error: dudplugin failure exception'), true);
});
