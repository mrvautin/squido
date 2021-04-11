const {
    serial: test
} = require('ava');
const path = require('path');
const fs = require('fs');
const glob = require('globby');
const { getMeta, getConfig } = require('../../lib/common');
const config = getConfig();
const h = require('../helper');

test('Run build command', async t => {
    let cmd = '';
    try{
        cmd = await h.exec(`${h.rootPath}/cli.js build`);
    }catch(ex){
        console.log('Ex', ex);
    }

    t.deepEqual(cmd.includes('[Build complete]'), true);
});

test('Run build with clean', async t => {
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
});

test('Run build - check output', async t => {
    // Run build and clean
    try{
        await h.exec(`${h.rootPath}/cli.js build -c`);
    }catch(ex){
        console.log('Ex', ex);
    }

    t.deepEqual(await h.exists(path.join(config.buildDir, 'index.html')), true);
    t.deepEqual(await h.exists(path.join(config.buildDir, '404.html')), true);
    t.deepEqual(await h.exists(path.join(config.buildDir, 'sitemap.xml')), true);
    t.deepEqual(await h.exists(path.join(config.buildDir, 'json')), true);
    t.deepEqual(await h.exists(path.join(config.buildDir, 'rss')), true);
    t.deepEqual(await h.exists(path.join(config.buildDir, 'atom')), true);
});

test('Run build - check for a post', async t => {
    // Run build and clean
    try{
        await h.exec(`${h.rootPath}/cli.js build -c`);
    }catch(ex){
        console.log('Ex', ex);
    }

    // Get posts
    const posts = await glob(`${h.postPath}/*.${config.sourcesExt || 'markdown'}`);

    // Get random post index
    const postIndex = Math.ceil(Math.random() * posts.length - 1);

    // Get the post meta
    const postMeta = getMeta(posts[postIndex]);

    t.deepEqual(await h.exists(path.join(config.buildDir, postMeta.permalink, 'index.html')), true);
});

test('Run build - check for a post template', async t => {
    // Run build and clean
    try{
        await h.exec(`${h.rootPath}/cli.js build -c`);
    }catch(ex){
        console.log('Ex', ex);
    }

    const filePath = path.join(config.buildDir, 'ibi-talia-non-caruit-thisbes-vitae-thyrsos', 'index.html');

    // Check file exists
    t.deepEqual(await h.exists(filePath), true);

    // Read file
    const fileContents = fs.readFileSync(filePath, 'utf8');

    // Check for <h1> tag in file
    t.deepEqual(fileContents.includes('<h1>Diff post template</h1>'), true);
});

test.only('Run build - template doesnt exist', async t => {
    const filecontents = `---
title: a dodgy template file
permalink: a-dodgy-template-file
description: a dodgy template file
date: '2021-03-18 10:30:00'
template: some-template-path-doesnt-exist.hbs
---

## a dodgy template file
`;
    const filepath = path.join(config.sourceDir, 'posts', 'a-dodgy-template-file.markdown');
    const dogyTemplatePath = path.join(config.sourceDir, 'some-template-path-doesnt-exist.hbs');

    // write new post
    fs.writeFileSync(filepath, filecontents);

    // Run build
    let cmd = '';
    try{
        cmd = await h.exec(`${h.rootPath}/cli.js build -c`);
    }catch(ex){
        console.log('Ex', ex);
    }

    const filePath = path.join(config.buildDir, 'ibi-talia-non-caruit-thisbes-vitae-thyrsos', 'index.html');

    // Check file exists
    t.deepEqual(await h.exists(filePath), true);

    // Check for build complete string
    t.deepEqual(cmd.includes('[Build complete]'), true);

    // Check skipped file with a template which doesn't exist
    t.deepEqual(cmd.includes(`Skipping - Required file not found: ${dogyTemplatePath}`), true);

    // Remove temp post file
    fs.unlinkSync(filepath);
});
