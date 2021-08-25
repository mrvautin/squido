const express = require('express');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const chalk = require('chalk');
const uniqid = require('uniqid');
const _ = require('lodash');
const { compilePosts } = require('../../lib/source');
const router = express.Router();

// The admin index, shows first post
router.get('/squido', async (req, res) => {
    const firstPost = process.posts[0];
    res.redirect(`/squido/${firstPost.id}`);
});

// Viewing/editing a post
router.get('/squido/:post', async (req, res) => {
    const postId = req.params.post;
    const posts = process.posts;
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
        config: process.config
    });
});

// Used for the sidebar search
router.post('/squido/search', async (req, res) => {
    const searchResults = process.postIndex.search(req.body.searchTerm);

    const filteredResults = [];
    for(const result of searchResults){
        const post = _.find(process.posts, ['id', result.ref]);
        const postObj = {
            id: post.id,
            title: post.title,
            permalink: post.permalink
        };
        filteredResults.push(postObj);
    }

    // Return results
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
    fs.writeFileSync(path.join(process.config.sourceDir, 'posts', `squido-${postId}.${process.config.sourcesExt}`), postContents);

    // Update post list
    await compilePosts();

    res.status(200).json({
        id: postId
    });
});

// Deletes a post
router.post('/squido/delete', async (req, res) => {
    const posts = process.posts;
    const postIndex = _.findIndex(posts, (o) => { return o.id === req.body.postId; });
    const post = posts[postIndex];

    if(!post){
        res.status(400).json({ error: 'Post not found' });
        return;
    }

    // Delete file
    fs.unlinkSync(post.filename);

    // Update post list
    await compilePosts();

    res.status(200).json({});
});

// Saves changes to a post
router.post('/squido/save', async (req, res) => {
    const posts = process.posts;
    const post = posts.find(p => p.id === req.body.postId);

    // Check for title change and update
    if(post.title !== req.body.title){
        post.fileMeta.title = req.body.title;
        post.title = req.body.title;
    }

    // Update markdown
    post.markdown = req.body.markdown;

    // Check for permalink change and update
    if(post.permalink !== req.body.permalink){
        // Check for duplicates
        const permalinkIndex = _.findIndex(posts, (o) => { return o.permalink === req.body.permalink; });
        if(permalinkIndex !== -1){
            console.log(chalk.red('Error saving post: Permalink already exists'));
            res.status(400).json({ error: 'Permalink already exists' });
            return;
        }
        post.fileMeta.permalink = req.body.permalink;
        post.permalink = req.body.permalink;
    }
    // Check for description change and update
    if(post.description !== req.body.description){
        post.fileMeta.description = req.body.description;
        post.description = req.body.description;
    }
    const meta = yaml.dump(post.fileMeta);
    const updatedPost =
`---
${meta.trim()}
---

${req.body.markdown}
`;
    try{
        // Create updated object
        const updatedPostObj = {
            id: post.id,
            title: post.title,
            permalink: post.permalink,
            markdown: post.markdown,
            description: post.description
        };

        // Check for a temp post and rename file to permalink on first update
        if(path.basename(post.filename).substring(0, 7) === 'squido-'){
            const fileParse = path.parse(post.filename);
            const newName = path.join(fileParse.dir, `${req.body.permalink}${fileParse.ext}`);
            // Rename our file
            fs.renameSync(post.filename, newName);

            // Update post list
            await compilePosts();

            updatedPostObj.filename = newName;

            // Write updates to file
            fs.writeFileSync(newName, updatedPost);
            res.status(200).json(updatedPostObj);
            return;
        }
        // Update post list
        await compilePosts();

        // Write updates to file
        fs.writeFileSync(post.filename, updatedPost);
        res.status(200).json(updatedPostObj);
    }catch(ex){
        console.log(chalk.red(`Error saving post: ${ex}`));
        res.status(400).json({});
    }
});

module.exports = router;
