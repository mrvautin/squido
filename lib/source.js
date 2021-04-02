const glob = require('globby');
const _ = require('lodash');
const path = require('path');
const { buildPost } = require('./build');
const { getMeta, getConfig } = require('./common');
const config = getConfig();

const readPosts = async () => {
    const dir = path.join(config.sourceDir, 'posts');
    const sourceFiles = await glob(`${dir}/*.${config.sourcesExt || 'markdown'}`);

    // Keeps a list of all posts
    process.postList = [];
    for(const file of sourceFiles){
        const meta = await getMeta(file);

        if(meta.ignore !== true){
            // Add to global post object
            if(!process.postList.includes(meta)){
                process.postList.push(meta);
            }
        }
    }

    // Sort posts by date
    process.postList = _.sortBy(process.postList, 'date').reverse();

    return sourceFiles;
};

const compilePosts = async (files) => {
    // Hold our posts
    process.posts = [];

    // Loop our files to create posts
    for(const file of files){
        await buildPost(file);
    }

    // Sort posts by date
    process.posts = _.sortBy(process.posts, 'date').reverse();
};

module.exports = {
    readPosts,
    compilePosts
};
