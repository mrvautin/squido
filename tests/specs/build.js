const {
    serial: test
} = require('ava');
const path = require('path');
const fs = require('fs');
const glob = require('globby');
const _ = require('lodash');
const AdmZip = require('adm-zip');
const { getConfig, globPath } = require('../../lib/common');
const { compilePosts } = require('../../lib/source');
const config = getConfig();
const h = require('../helper');

test('Run build command', async t => {
    let cmd = '';
    try{
        cmd = await h.exec(`node ${h.rootPath}/cli.js build`);
    }catch(ex){
        console.log('Ex', ex);
    }

    t.deepEqual(cmd.includes('[Build complete]'), true);
});

test('Run build with clean', async t => {
    let cmd = '';
    let cleanString = '';
    try{
        cmd = await h.exec(`node ${h.rootPath}/cli.js build -c`);
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
        await h.exec(`node ${h.rootPath}/cli.js build -c`);
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
        await h.exec(`node ${h.rootPath}/cli.js build -c`);
    }catch(ex){
        console.log('Ex', ex);
    }

    // Compile our posts
    const generatedPosts = await compilePosts();

    // Get posts
    const posts = generatedPosts.posts;

    // Get random post index
    const postIndex = Math.ceil(Math.random() * posts.length - 1);

    // Get the post meta
    const postMeta = posts[postIndex];

    t.deepEqual(await h.exists(path.join(config.buildDir, postMeta.permalink, 'index.html')), true);
});

test('Run build - check for content', async t => {
    // Run build and clean
    try{
        await h.exec(`node ${h.rootPath}/cli.js build -c`);
    }catch(ex){
        console.log('Ex', ex);
    }

    // Get content files
    const contentSourceFiles = await glob([
        `${globPath(config.sourceDir)}/content/**/*`
    ]);

    // Fix paths and check build file exists
    for(const sourceFile in contentSourceFiles){
        const filename = path.normalize(contentSourceFiles[sourceFile]);
        const parsed = path.parse(filename);
        const fileRawDir = parsed.dir.replace(config.sourceDir, '');
        const fixedFilePath = path.join(fileRawDir, parsed.base);
        t.deepEqual(await h.exists(path.join(config.buildDir, fixedFilePath)), true);
    }
});

test('Run build - custom post template', async t => {
    const postContents = `---
title: Custom template
permalink: custom-template
description: Custom template
date: '2021-03-18 10:30:00'
template: post-diff.hbs
---

## A Custom template
`;

    // Set out custom post path
    const customPostPath = path.join(config.sourceDir, 'posts', 'custom-template.markdown');
    // Write out custom post
    fs.writeFileSync(customPostPath, postContents);

    // Contents of our different post template file
    const templateContents = `<h1>Diff post template</h1>
<div class="row">
    <div class="col-md-8 offset-md-2 mb-5">
        <div class="mt-5">
            <h1>{{title}}</h1>
            {{{body}}}
        </div>
    </div>
</div>`;

    // Write a custom template for this post
    const templateFile = path.join(config.sourceDir, 'post-diff.hbs');
    fs.writeFileSync(templateFile, templateContents);

    // Check file exists
    t.deepEqual(await h.exists(templateFile), true);

    // Run build and clean
    try{
        await h.exec(`node ${h.rootPath}/cli.js build -c`);
    }catch(ex){
        console.log('Ex', ex);
    }

    const buildFilePath = path.join(config.buildDir, 'custom-template', 'index.html');
    const customPostContents = fs.readFileSync(buildFilePath, 'utf-8');

    // Check for <h1> tag in file
    t.deepEqual(customPostContents.includes('<h1>Diff post template</h1>'), true);

    // Remove temp files
    fs.unlinkSync(customPostPath);
    fs.unlinkSync(templateFile);
});

test('Run build - template doesnt exist', async t => {
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
        cmd = await h.exec(`node ${h.rootPath}/cli.js build -c`);
    }catch(ex){
        console.log('Ex', ex);
    }

    // Check for build complete string
    t.deepEqual(cmd.includes('[Build complete]'), true);

    // Check skipped file with a template which doesn't exist
    t.deepEqual(cmd.includes(`Skipping - Required file not found: ${dogyTemplatePath}`), true);

    // Remove temp post file
    fs.unlinkSync(filepath);
});

test('Run build - postBuild zip', async t => {
    // Run build and clean
    try{
        await h.exec(`node ${h.rootPath}/cli.js build -c`);
    }catch(ex){
        console.log('Ex', ex);
    }

    // Check for zip file
    t.deepEqual(await h.exists(path.join(config.buildDir, 'build.zip')), true);

    // Get all files in the build dir
    const buildFiles = await glob([
        `${globPath(config.buildDir)}/**/*`,
        `!${globPath(config.buildDir)}/build.zip`
    ]);

    // Read our zip to get files
    const zip = new AdmZip(path.join(config.buildDir, 'build.zip'));
    const zipEntries = await zip.getEntries();

    // Check the number of files in /build dir matches the Zip
    t.deepEqual(buildFiles.length, zipEntries.length);
});
