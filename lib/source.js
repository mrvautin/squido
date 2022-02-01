const glob = require('globby');
const _ = require('lodash');
const path = require('path');
const lunr = require('lunr');
const chalk = require('chalk');
const { buildPost } = require('./build');
const { getMeta, winPath } = require('./common');

const compilePosts = async () => {
    const dir = path.join(process.config.sourceDir, 'posts');
    const sourceFiles = await glob(`${winPath(dir)}/**/*.${process.config.sourcesExt || 'markdown'}`);

    // Keeps a list of all posts
    process.posts = [];

    // Keeps a list of posts to display
    process.postList = [];

    for(const file of sourceFiles){
        const meta = await getMeta(file);

        if(meta.visible !== false){
            // Add to global post object
            if(!process.postList.includes(meta)){
                process.postList.push(meta);
            }
        }

        // Push to raw post list with all posts
        process.posts.push(meta);
    }

    // Build post index
    await buildPostIndex();

    // Get related posts
    await getRelatedPosts();

    // Build posts
    await buildPosts();

    // Build tags
    await buildTags();

    // Sort post lists by date
    process.postList = _.sortBy(process.postList, 'date').reverse();
    process.posts = _.sortBy(process.posts, 'date').reverse();

    return process;
};

const indexPosts = async () => {
    const dir = path.join(process.config.sourceDir, 'posts');
    const sourceFiles = await glob(`${winPath(dir)}/**/*.${process.config.sourcesExt || 'markdown'}`);

    // Keeps a list of all posts
    process.posts = [];

    // Keeps a list of posts to display
    process.postList = [];

    for(const file of sourceFiles){
        const meta = await getMeta(file);

        if(meta.visible !== false){
            // Add to global post object
            if(!process.postList.includes(meta)){
                process.postList.push(meta);
            }
        }

        // Push to raw post list with all posts
        process.posts.push(meta);
    }

    // Build post index
    await buildPostIndex();

    // Get related posts
    await getRelatedPosts();

    // Build tags
    await buildTags();

    // Sort post lists by date
    process.postList = _.sortBy(process.postList, 'date').reverse();
    process.posts = _.sortBy(process.posts, 'date').reverse();
};

const buildPostIndex = async () => {
    // Index our posts
    const postIndex = lunr(function (){
        this.field('title');
        this.field('body');
        for(const post of process.postList){
            this.add({
                title: post.title,
                body: post.markdown,
                id: post.id
            });
        }
    });

    // Store our index
    process.postIndex = postIndex;
};

const getRelatedPosts = async () => {
    // Loop posts
    let postIndex = 0;
    for(const post of process.postList){
        // Search for related posts
        try{
            const relatedPosts = process.postIndex.search(post.title);
            process.posts[postIndex].related = [];

            // Add related to the post
            let relatedCount = 0;
            for(const indexedPost of relatedPosts){
                // Limit related to 4 posts
                if(relatedCount < 5){
                    const postLookup = _.find(process.posts, ['id', indexedPost.ref]);
                    const postData = {
                        id: postLookup.id,
                        title: postLookup.title,
                        permalink: postLookup.permalink
                    };
                    if(postLookup.id !== post.id){
                        process.posts[postIndex].related.push(postData);
                    }
                    relatedCount++;
                }
            }
        }catch(ex){
            console.log(chalk.red('Failed to get related posts'), ex);
        }
        postIndex++;
    }
};

const buildPosts = async () => {
    for(const post of process.posts){
        // build the post
        await buildPost(post.filename);
    }
};

const buildTags = async () => {
    // Test and init
    if(!process.tags){
        process.tags = {};
    }

    for(const post of process.posts){
        // If the post has tags
        if(post.tags){
            for(const tag of post.tags){
                // Setup tag if not set
                if(!process.tags[tag]){
                    process.tags[tag] = [];
                }
                // Push post to page array
                process.tags[tag].push(post);
            }
        }
    }
};

module.exports = {
    compilePosts,
    indexPosts
};
