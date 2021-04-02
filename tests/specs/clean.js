const {
    serial: test
} = require('ava');
const glob = require('globby');
const { getConfig } = require('../../lib/common');
const config = getConfig();
const h = require('../helper');

test('Run clean command', async t => {
    const cmd = await h.exec(`${h.rootPath}/cli.js build -c`);

    const cleanString = `Cleaned: ${config.buildDir}`;

    t.deepEqual(cmd.includes(cleanString), true);
});

test('Run clean - check build dir is empty', async t => {
    // Run build and clean
    await h.exec(`${h.rootPath}/cli.js clean`);

    const buildFiles = await glob(`${config.buildDir}/*/**`);

    t.deepEqual(buildFiles.length, 0);
});
