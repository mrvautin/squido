const express = require('express');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const chalk = require('chalk');
const uniqid = require('uniqid');
const FlexSearch = require('flexsearch');
const _ = require('lodash');
const { getConfig } = require('../../lib/common');
const { readPosts, compilePosts } = require('../../lib/source');
const config = getConfig();
const router = express.Router();

// Setup post index
const htmlRegex = /<.+?>/g;
const index = new FlexSearch();
for(const post of process.postList){
    index.add(post.id, post.body.replace(htmlRegex, ''));
}

// The admin index, shows first post
router.get('/squido', async (req, res) => {
    const firstPost = process.postList[0];
    res.redirect(`/squido/${firstPost.id}`);
});

// Viewing/editing a post
router.get('/squido/:post', async (req, res) => {
    const postId = req.params.post;
    const posts = process.postList;
    const post = posts.find(p => p.id === postId);

    // Check for post
    if(!post){
        res.redirect('/squido');
        return;
    }

    res.render('post', {
        title: 'squido - Admin',
        posts,
        post,
        config
    });
});

// Used for the sidebar search
router.post('/squido/search', async (req, res) => {
    const results = await index.search({
        query: req.body.searchTerm,
        async: false,
        limit: 10,
        encode: 'icase',
        tokenize: 'full',
        worker: 4
    });

    const filteredResults = _.chain(process.postList)
    .keyBy('id')
    .at(results)
    .value();

    res.status(200).json(filteredResults);
});

// Creates a new empty post
router.post('/squido/create', async (req, res) => {
    const postId = uniqid();
    const postContents =
`---
title: hello world
permalink: ${postId}
description: hello world
date: ${new Date().toISOString()}
--- 
Hello world
`;
    // Save our new file
    fs.writeFileSync(path.join(config.sourceDir, 'posts', `squido-${postId}.${config.sourcesExt}`), postContents);

    // Update post list
    const sourceFiles = await readPosts();
    await compilePosts(sourceFiles);
    res.status(200).json({
        id: postId
    });
});

// Deletes a post
router.post('/squido/delete', async (req, res) => {
    const posts = process.postList;
    const postIndex = _.findIndex(posts, (o) => { return o.id === req.body.postId; });
    const post = posts[postIndex];

    if(!post){
        res.status(400).json({ error: 'Post not found' });
        return;
    }

    // Delete file
    fs.unlinkSync(post.filename);

    // Update post list
    const sourceFiles = await readPosts();
    await compilePosts(sourceFiles);
    res.status(200).json({});
});

// Saves changes to a post
router.post('/squido/save', async (req, res) => {
    const posts = process.postList;
    const postIndex = _.findIndex(posts, (o) => { return o.id === req.body.postId; });
    const post = posts[postIndex];
    // Check for title change and update
    if(post.fileMeta.title !== req.body.title){
        post.fileMeta.title = req.body.title;
    }
    // Check for permalink change and update
    if(post.fileMeta.permalink !== req.body.permalink){
        // Check for duplicates
        const permalinkIndex = _.findIndex(posts, (o) => { return o.permalink === req.body.permalink; });
        if(permalinkIndex !== -1){
            console.log(chalk.red('Error saving post: Permalink already exists'));
            res.status(400).json({ error: 'Permalink already exists' });
            return;
        }
        post.fileMeta.permalink = req.body.permalink;
    }
    // Check for description change and update
    if(post.fileMeta.description !== req.body.description){
        post.fileMeta.description = req.body.description;
    }
    const meta = yaml.dump(post.fileMeta);
    const updatedPost =
`---
${meta.trim()}
---

${req.body.markdown}
`;
    try{
        // Update values to memory
        process.postList[postIndex].markdown = req.body.markdown;
        process.postList[postIndex].title = req.body.title;
        process.postList[postIndex].permalink = req.body.permalink;
        process.postList[postIndex].description = req.body.description;
        // Check for a temp post and rename file to permalink on first update
        if(path.basename(post.filename).substring(0, 7) === 'squido-'){
            const fileParse = path.parse(post.filename);
            const newName = path.join(fileParse.dir, `${req.body.permalink}${fileParse.ext}`);
            // Rename our file
            fs.renameSync(post.filename, newName);
            // Write updates to new file
            process.postList[postIndex].filename = newName;
            fs.writeFileSync(newName, updatedPost);
            res.status(200).json(process.postList[postIndex]);
            return;
        }
        fs.writeFileSync(post.filename, updatedPost);
        res.status(200).json(process.postList[postIndex]);
    }catch(ex){
        console.log(chalk.red(`Error saving post: ${ex}`));
        res.status(400).json({});
    }
});

module.exports = router;
