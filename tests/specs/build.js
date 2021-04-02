const {
    serial: test
} = require('ava');
const path = require('path');
const glob = require('globby');
const { getMeta, getConfig } = require('../../lib/common');
const config = getConfig();
const h = require('../helper');

test('Run build command', async t => {
    const cmd = await h.exec(`${h.rootPath}/cli.js build`);

    t.deepEqual(cmd.includes('[Build complete]'), true);
});

test('Run build with clean', async t => {
    const cmd = await h.exec(`${h.rootPath}/cli.js build -c`);

    const cleanString = `Cleaned: ${config.buildDir}`;

    t.deepEqual(cmd.includes(cleanString), true);
    t.deepEqual(cmd.includes('[Build complete]'), true);
});

test('Run build - check output', async t => {
    // Run build and clean
    await h.exec(`${h.rootPath}/cli.js build -c`);

    t.deepEqual(await h.exists(path.join(config.buildDir, 'index.html')), true);
    t.deepEqual(await h.exists(path.join(config.buildDir, '404.html')), true);
    t.deepEqual(await h.exists(path.join(config.buildDir, 'sitemap.xml')), true);
    t.deepEqual(await h.exists(path.join(config.buildDir, 'json')), true);
    t.deepEqual(await h.exists(path.join(config.buildDir, 'rss')), true);
    t.deepEqual(await h.exists(path.join(config.buildDir, 'atom')), true);
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

    t.deepEqual(await h.exists(path.join(config.buildDir, postMeta.permalink, 'index.html')), true);
});
