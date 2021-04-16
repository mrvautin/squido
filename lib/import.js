const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const chalk = require('chalk');
const slugify = require('slugify');
const xmlParser = require('xml2js');
const turndown = require('turndown');

const importWordPress = async (importFile) => {
    const fileContents = fs.readFileSync(importFile, 'utf8');
    let xmlData;
    try{
        xmlData = await xmlParser.parseStringPromise(fileContents, {
            trim: true,
            tagNameProcessors: [xmlParser.processors.stripPrefix]
        });
    }catch(parseEx){
        console.log(chalk.red('Failed to parse Wordpress export file. Please check the file and try again.'));
        process.exit();
    }

    // Check for data/posts
    if(!xmlData.rss.channel[0].item || xmlData.rss.channel[0].item.length === 0){
        console.log(chalk.red('Failed to parse Wordpress export file. There are no posts to import.'));
        process.exit();
    }

    const importDir = path.join(process.cwd(), 'imported');
    // Ensure import dir exists
    await fsExtra.ensureDir(importDir);

    // Clean previously imported files
    fsExtra.emptyDirSync(importDir);

    try{
        for(const postIndex in xmlData.rss.channel[0].item){
            // Check for a page
            const post = xmlData.rss.channel[0].item[postIndex];
            // Only process posts which have content and are published
            if(post.title[0] !== '' && post.encoded[0] && post.status[0] === 'publish'){
                // Set some defaults if data not found
                let permalink = slugify(post.title[0]);
                if(post.post_name){
                    permalink = decodeURIComponent(post.post_name[0]);
                }

                // Set date to today if not found
                let postDate = post.post_date;
                if(!post.post_date || post.post_date === ''){
                    postDate = new Date().toISOString();
                }
                const postData =
                `---
                title: ${post.title[0]}
                permalink: ${permalink}
                description: ${post.description}
                date: ${postDate}
                ---
                
                ${cleanWpPostContents(post.encoded[0])}
                `;

                fs.writeFileSync(path.join(importDir, `${post.title}.markdown`), deIndent(postData));
            }
        }
    }catch(writeContentEx){
        console.log(chalk.red('Failed to parse Wordpress export file.'), writeContentEx);
        process.exit();
    }

    console.log(`${chalk.green('Imported')}: Post Markdown files located here: ${importDir}`);
};

const cleanWpPostContents = (content) => {
    const turndownService = new turndown();

    // Clean up content
    content = content.replace(/(\r?\n){2}/g, '\n<div></div>\n');
    content = content.replace(/(<\/iframe>)/gi, '.$1');
    content = turndownService.turndown(content);
    content = content.replace(/(-|\d+\.) +/g, '$1 ');
    content = content.replace(/\.(<\/iframe>)/gi, '$1');

    return content;
};

const deIndent = (str) => {
    return str.replace(/  +/g, '');
};

const importGhost = async (importFile) => {
    const fileContents = fs.readFileSync(importFile, 'utf8');
    let jsonData;
    try{
        jsonData = JSON.parse(fileContents);
    }catch(parseEx){
        console.log(chalk.red('Failed to parse Ghost export file. Please check the file and try again.'));
        process.exit();
    }

    // Check for DB
    if(jsonData.db && jsonData.db.length < 0){
        console.log(chalk.red('Failed to parse Ghost export file. There are no posts to import.'));
        process.exit();
    }

    // Check for data/posts
    if(!jsonData.db[0].data.posts || jsonData.db[0].data.posts.length === 0){
        console.log(chalk.red('Failed to parse Ghost export file. There are no posts to import.'));
        process.exit();
    }

    const importDir = path.join(process.cwd(), 'imported');
    // Ensure import dir exists
    await fsExtra.ensureDir(importDir);

    // Clean previously imported files
    fsExtra.emptyDirSync(importDir);

    try{
        for(const postIndex in jsonData.db[0].data.posts){
            // Check for a page
            const post = jsonData.db[0].data.posts[postIndex];
            // Only process posts which have content and are published
            if(post.title !== '' && post.status === 'published'){
                // Set some defaults if data not found
                let permalink = slugify(post.title.toLowerCase());
                if(post.slug){
                    permalink = post.slug;
                }

                // Set description to the title and override if custom exists
                let description = post.title;
                if(post.custom_excerpt){
                    description = post.custom_excerpt;
                }

                const postData =
                `---
                title: ${post.title}
                permalink: ${permalink}
                description: ${description}
                date: ${post.published_at}
                ---
                
                ${convertToMarkdown(post.html)}
                `;

                fs.writeFileSync(path.join(importDir, `${permalink}.markdown`), deIndent(postData));
            }
        }
    }catch(writeContentEx){
        console.log(chalk.red('Failed to parse Ghost export file.'), writeContentEx);
        process.exit();
    }

    console.log(`${chalk.green('Imported')}: Post Markdown files located here: ${importDir}`);
};

const convertToMarkdown = (content) => {
    const turndownService = new turndown();
    return turndownService.turndown(content);
};

module.exports = {
    importWordPress,
    importGhost
};
