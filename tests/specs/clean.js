const {
    serial: test
} = require('ava');
const glob = require('globby');
const { winPath } = require('../../lib/common');
const h = require('../helper');

test('Run clean command', async t => {
    const cmd = await h.exec(`node ${h.rootPath}/cli.js build -c`);

    const cleanString = `Cleaned: ${process.config.buildDir}`;

    t.deepEqual(cmd.includes(cleanString), true);
});

test('Run clean - check build dir is empty', async t => {
    // Run build and clean
    await h.exec(`node ${h.rootPath}/cli.js clean`);

    const buildFiles = await glob(`${winPath(process.config.buildDir)}/*/**`);

    t.deepEqual(buildFiles.length, 0);
});
