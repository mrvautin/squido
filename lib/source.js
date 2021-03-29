const glob = require('glob-promise');
const _ = require('lodash');
const path = require('path');
const { buildPost } = require('./build');
const config = process.config;

const readPosts = async () => {
    const dir = path.join(process.cwd().toString(), 'source', config.sourceDir);
    const sourceFiles = await glob(`${dir}/*.${config.sourcesExt}`);
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
