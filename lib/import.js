const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const chalk = require('chalk');
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
                const postData =
                `---
                title: ${post.title}
                permalink: ${decodeURIComponent(post.post_name[0])}
                description: ${post.description}
                date: ${post.post_date}
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

module.exports = {
    importWordPress
};
