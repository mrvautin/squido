const express = require('express');
const fs = require('fs');
const yaml = require('js-yaml');
const chalk = require('chalk');
const _ = require('lodash');
const router = express.Router();

router.get('/squido', async (req, res) => {
    const firstPost = process.postList[0];
    res.redirect(`/squido/${firstPost.permalink}`);
});

router.get('/squido/:post', async (req, res) => {
    const postPermalink = req.params.post;
    const posts = process.postList;
    const post = posts.find(p => p.permalink === postPermalink);

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

router.post('/squido/save', async (req, res) => {
    const posts = process.postList;
    const postIndex = _.findIndex(posts, (o) => { return o.permalink === req.body.permalink; });
    const post = posts[postIndex];
    // Check for title change and update
    if(post.fileMeta.title !== req.body.title){
        post.fileMeta.title = req.body.title;
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
        fs.writeFileSync(post.filename, updatedPost);
        res.status(200).json({});
    }catch(ex){
        console.log(chalk.red(`Error saving post: ${ex}`));
        res.status(400).json({});
    }
});

module.exports = router;
