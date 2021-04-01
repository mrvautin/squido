const {
    serial: test
} = require('ava');
const path = require('path');
const glob = require('glob-promise');
const { getMeta } = require('../../lib/common');
const h = require('../helper');
const config = process.config;

test('Run build command', async t => {
    const cmd = await h.exec(`${h.rootPath}/cli.js build`);

    t.deepEqual(cmd.includes('[Build complete]'), true);
});

test('Run build with clean', async t => {
    const cmd = await h.exec(`${h.rootPath}/cli.js build -c`);

    const cleanString = `Cleaned: ${h.buildPath}`;

    t.deepEqual(cmd.includes(cleanString), true);
    t.deepEqual(cmd.includes('[Build complete]'), true);
});

test('Run build - check output', async t => {
    // Run build and clean
    await h.exec(`${h.rootPath}/cli.js build -c`);

    t.deepEqual(await h.exists(path.join(h.buildPath, 'index.html')), true);
    t.deepEqual(await h.exists(path.join(h.buildPath, '404.html')), true);
    t.deepEqual(await h.exists(path.join(h.buildPath, 'sitemap.xml')), true);
    t.deepEqual(await h.exists(path.join(h.buildPath, 'json')), true);
    t.deepEqual(await h.exists(path.join(h.buildPath, 'rss')), true);
    t.deepEqual(await h.exists(path.join(h.buildPath, 'atom')), true);
});

test('Run build - check for a post', async t => {
    // Run build and clean
    await h.exec(`${h.rootPath}/cli.js build -c`);

    // Get posts
    const posts = await glob(`${h.postPath}/*.${config.sourcesExt || 'markdown'}`);

    // Get random post index
    const postIndex = Math.ceil(Math.random() * posts.length - 1);

    // Get the post meta
    const postMeta = getMeta(posts[postIndex]);

    t.deepEqual(await h.exists(path.join(h.buildPath, postMeta.permalink, 'index.html')), true);
});
