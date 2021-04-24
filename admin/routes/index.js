const express = require('express');
const fs = require('fs');
const yaml = require('js-yaml');
const chalk = require('chalk');
const FlexSearch = require('flexsearch');
const _ = require('lodash');
const router = express.Router();

// Setup post index
const htmlRegex = /<.+?>/g;
const index = new FlexSearch();
for(const post of process.postList){
    index.add(post.id, post.body.replace(htmlRegex, ''));
}

router.get('/squido', async (req, res) => {
    const firstPost = process.postList[0];
    res.redirect(`/squido/${firstPost.id}`);
});

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
        config: req.app.config
    });
});

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
        fs.writeFileSync(post.filename, updatedPost);
        res.status(200).json({});
    }catch(ex){
        console.log(chalk.red(`Error saving post: ${ex}`));
        res.status(400).json({});
    }
});

module.exports = router;
