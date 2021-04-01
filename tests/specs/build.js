const {
    serial: test
} = require('ava');
const path = require('path');
const h = require('../helper');

test('Run build command', async t => {
    const cmd = await h.exec('squido build');

    t.deepEqual(cmd.includes('[Build complete]'), true);
});

test('Run build command', async t => {
    const cmd = await h.exec('squido build');

    t.deepEqual(cmd.includes('[Build complete]'), true);
});

test('Run build with clean', async t => {
    const cmd = await h.exec('squido build -c');

    const cleanString = `Cleaned: ${h.buildPath}`;

    t.deepEqual(cmd.includes(cleanString), true);
    t.deepEqual(cmd.includes('[Build complete]'), true);
});

test('Run build - check output', async t => {
    // Run build and clean
    await h.exec('squido build -c');

    t.deepEqual(await h.exists(path.join(h.buildPath, 'index.html')), true);
    t.deepEqual(await h.exists(path.join(h.buildPath, '404.html')), true);
    t.deepEqual(await h.exists(path.join(h.buildPath, 'sitemap.xml')), true);
    t.deepEqual(await h.exists(path.join(h.buildPath, 'json')), true);
    t.deepEqual(await h.exists(path.join(h.buildPath, 'rss')), true);
    t.deepEqual(await h.exists(path.join(h.buildPath, 'atom')), true);
});
