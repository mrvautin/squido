const {
    serial: test
} = require('ava');
const glob = require('glob-promise');
const h = require('../helper');

test('Run clean command', async t => {
    const cmd = await h.exec('squido build -c');

    const cleanString = `Cleaned: ${h.buildPath}`;

    t.deepEqual(cmd.includes(cleanString), true);
});

test('Run clean - check build dir is empty', async t => {
    // Run build and clean
    await h.exec('squido clean');

    const buildFiles = await glob(`${h.buildPath}/*/**`);

    t.deepEqual(buildFiles.length, 0);
});
