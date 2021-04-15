const fsExtra = require('fs-extra');
const glob = require('globby');
const chalk = require('chalk');
const handlebars = require('handlebars');
const md5 = require('md5');
const path = require('path');
const fs = require('fs');
const { getMeta, getConfig, setupHelpers } = require('./common');
const config = getConfig();
setupHelpers(handlebars);

// Clean build directory
const clean = async () => {
    try{
        fsExtra.emptyDirSync(config.buildDir);
        console.log(`${chalk.cyan('Cleaned')}: ${config.buildDir}`);
    }catch(ex){
        console.log(chalk.red('Error trying to clean the build directory'));
        console.log(chalk.red(ex));
    }
};

// Create the index.html file. The entry point of the website
const buildIndex = async () => {
    // Setup templates
    const layoutPath = path.join(config.sourceDir, 'layouts', 'layout.hbs');
    const templateIndexPath = path.join(config.sourceDir, 'index.hbs');
    const template404Path = path.join(config.sourceDir, '404.hbs');

    // File checks
    if(!fs.existsSync(layoutPath)){
        console.log(`${chalk.red('Required file not found')}: ${layoutPath}`);
        process.exit();
    }
    if(!fs.existsSync(templateIndexPath)){
        console.log(`${chalk.red('Required file not found')}: ${templateIndexPath}`);
        process.exit();
    }
    if(!fs.existsSync(template404Path)){
        console.log(`${chalk.red('Required file not found')}: ${template404Path}`);
        process.exit();
    }

    // Template setup
    const layout = handlebars.compile(fs.readFileSync(layoutPath, 'utf-8'));
    const templateIndex = handlebars.compile(fs.readFileSync(templateIndexPath, 'utf-8'));
    const template404 = handlebars.compile(fs.readFileSync(template404Path, 'utf-8'));

    try{
        // Set some page meta
        const meta = {};
        meta.title = config.name;
        meta.description = config.description;
        meta.url = config.baseUrl;

        const pageData = {
            posts: process.posts,
            post: process.posts[0],
            config,
            meta
        };

        // If pagination is turned on
        if(config.pagination){
            // Set defaults for first page/index
            pageData.posts = process.pages[1];
            pageData.pages = Object.keys(process.pages).length;
            pageData.page = 1;
            if(pageData.pages > 1){
                pageData.shouldPaginate = true;
                pageData.nextPage = 2;
            }
            pageData.pagination = process.pages[1];
        }

        const indexHtml = templateIndex(Object.assign(pageData, { postList: process.postList }));
        const compiledIndexHtml = layout({ body: indexHtml, meta, config });

        // Write our index html file
        fs.writeFileSync(path.join(config.buildDir, 'index.html'), compiledIndexHtml);
        console.log(`${chalk.green('Built')}: ${path.join(config.buildDir, 'index.html')}`);

        // Write our 404 html file
        const html404 = template404();
        const compiled404Html = layout({ body: html404 });

        // Write our 404 html file
        fs.writeFileSync(path.join(config.buildDir, '404.html'), compiled404Html);
        console.log(`${chalk.green('Built')}: ${path.join(config.buildDir, '404.html')}`);
    }catch(ex){
        console.log(chalk.red('Error trying to build the index file'));
        console.log(chalk.red(ex));
    }
};

const buildFile = async () => {
    try{
        // Write build file
        const buildJson = {
            name: 'squido-build-file',
            version: '1.0.0',
            description: 'Squido build file',
            scripts: {
              build: 'squido build -c'
            },
            dependencies: {
                squido: 'latest'
            }
        };

        fs.writeFileSync(path.join(config.sourceDir, 'package.json'), JSON.stringify(buildJson, null, 2));
        console.log(`${chalk.green('Built')}: ${path.join(config.sourceDir, 'package.json')}`);
    }catch(ex){
        console.log(chalk.red('Error trying to build file'));
        console.log(chalk.red(ex));
    }
};

const buildPost = async (file) => {
    // Check file exists
    if(!fs.existsSync(file)){
        console.log(chalk.red(`Cannot build file. Not found: ${file}`));
        return;
    }

    // Read the post file meta
    const meta = await getMeta(file);
    if(!meta){
        console.log(chalk.yellow(`Skipping file as not Meta data found: ${file}`));
        return;
    }

    // Set default template file
    let templateFileName = 'post.hbs';

    // Override template file from meta data
    if(meta.template){
        templateFileName = meta.template;
    }

    const layoutPath = path.join(config.sourceDir, 'layouts', 'layout.hbs');
    const templatePath = path.join(config.sourceDir, templateFileName);

    // Check needed files exists
    if(!fs.existsSync(layoutPath)){
        console.log(`${chalk.red('Required file not found')}: ${layoutPath}`);
        process.exit();
    }
    if(!fs.existsSync(templatePath)){
        console.log(`${chalk.yellow('Skipping - Required file not found')}: ${templatePath}`);
        return;
    }

    const layout = handlebars.compile(fs.readFileSync(layoutPath, 'utf-8'));
    const template = handlebars.compile(fs.readFileSync(templatePath, 'utf-8'));

    try{
        // Don't create posts without a permalink
        if(!meta.permalink){
            console.log(chalk.red(`No permalink found. Cannot process: ${file}`));
            return;
        }

        // Check if dir exists or create
        if(!fs.existsSync(path.join(config.buildDir, meta.permalink))){
            try{
                await fsExtra.ensureDir(path.join(config.buildDir, meta.permalink));
            }catch(ex){
                console.log('ex', ex);
            }
        }

        // Render html
        const postHtml = template(Object.assign(meta, { postList: process.postList, config }));
        const compiledHtml = layout({
            body: postHtml,
            meta,
            posts: process.posts,
            config
        });

        // Write our html file
        fs.writeFileSync(path.join(config.buildDir, meta.permalink, 'index.html'), compiledHtml);
        console.log(`${chalk.green('Built')}: ${path.join(config.buildDir, meta.permalink, 'index.html')}`);

        // Get md5 of file as ID
        meta.hash = md5(compiledHtml);

        // Add to global post object
        if(!process.posts.includes(meta)){
            process.posts.push(meta);
        }
    }catch(ex){
        console.log(chalk.red(`Error trying to build post: ${file}`));
        console.log(chalk.red(ex));
    }
};

const buildPagination = async () => {
    const layoutPath = path.join(config.sourceDir, 'layouts', 'layout.hbs');
    const templatePath = path.join(config.sourceDir, 'page.hbs');

    // Check needed files exists
    if(!fs.existsSync(layoutPath)){
        console.log(`${chalk.red('Required file not found')}: ${layoutPath}`);
        process.exit();
    }
    if(!fs.existsSync(templatePath)){
        console.log(`${chalk.red('Required file not found')}: ${templatePath}`);
        process.exit();
    }

    const layout = handlebars.compile(fs.readFileSync(layoutPath, 'utf-8'));
    const template = handlebars.compile(fs.readFileSync(templatePath, 'utf-8'));
    const pagePath = path.join(config.buildDir, 'page');

    // Hold our pages
    process.pages = {};
    let pageCount = 1;
    let postCount = 0;
    const postPerPage = config.postPerPage || 12; // default to 12 if not set

    // Loop posts to build pagination
    for(const post of process.posts){
        try{
            // If the meta "ignore" is set to true, don't add to post list
            if(post.ignore === true){
                continue;
            }

            if(postCount >= postPerPage){
                pageCount++;
                postCount = 0;
            }

            // Add to post count
            postCount++;

            // Setup page if not set
            if(!process.pages[pageCount]){
                process.pages[pageCount] = [];
            }

            // Push post to page array
            process.pages[pageCount].push(post);
        }catch(ex){
            console.log(chalk.red('Error trying to build pages'));
            console.log(chalk.red(ex));
        }
    }

    // Write out page HTML
    for(const page of Object.keys(process.pages)){
        // Create the "page" directory
        if(!fs.existsSync(pagePath)){
            fs.mkdirSync(pagePath);
        }

        // Create the page number directory
        if(!fs.existsSync(path.join(pagePath, page.toString()))){
            fs.mkdirSync(path.join(pagePath, page.toString()));
        }

        // Page data
        const pageData = {
            config,
            posts: process.pages[page],
            pages: pageCount,
            page: parseInt(page),
            meta: {
                url: `${config.baseUrl}/page/${page}`
            }
        };
        if(page < pageCount){
            pageData.shouldPaginate = true;
            pageData.nextPage = parseInt(page) + 1;
        }
        if(page > 1){
            pageData.shouldPaginate = true;
            pageData.prevPage = parseInt(page) - 1;
        }

        // Render html
        const pageHtml = template(Object.assign(pageData, { postList: process.postList, config }));
        const compiledHtml = layout(Object.assign({ body: pageHtml }, pageData));

        // Write our html file
        const file = path.join(pagePath, page.toString(), 'index.html');
        fs.writeFileSync(file, compiledHtml);
        console.log(`${chalk.green('Built')}: ${file}`);
    }
};

// Build tag files
const buildTags = async () => {
    const layoutPath = path.join(config.sourceDir, 'layouts', 'layout.hbs');
    const templatePath = path.join(config.sourceDir, 'tag.hbs');

    // Check needed files exists
    if(!fs.existsSync(layoutPath)){
        console.log(`${chalk.red('Required file not found')}: ${layoutPath}`);
        process.exit();
    }
    if(!fs.existsSync(templatePath)){
        console.log(`${chalk.red('Required file not found')}: ${templatePath}`);
        process.exit();
    }

    const layout = handlebars.compile(fs.readFileSync(layoutPath, 'utf-8'));
    const template = handlebars.compile(fs.readFileSync(templatePath, 'utf-8'));
    const tagPath = path.join(config.buildDir, 'tag');

    // Hold our tag pages
    process.tags = {};

    // Loop posts to build pagination
    for(const post of process.posts){
        try{
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
        }catch(ex){
            console.log(chalk.red('Error trying to build tag list'));
            console.log(chalk.red(ex));
        }
    }

    // Write out tag HTML
    for(const tag of Object.keys(process.tags)){
        // Create the "tag" directory
        if(!fs.existsSync(tagPath)){
            fs.mkdirSync(tagPath);
        }

        // Create the tag directory if doesn't exist
        if(!fs.existsSync(path.join(tagPath, tag))){
            fs.mkdirSync(path.join(tagPath, tag));
        }

        // Tag data
        const tagData = {
            tag,
            posts: process.tags[tag],
            config,
            meta: {
                url: `${config.baseUrl}/tag/${tag}`
            }
        };

        // Render html
        const pageHtml = template(Object.assign(tagData, { postList: process.postList }));
        const compiledHtml = layout(Object.assign({ body: pageHtml }, tagData));

        // Write our html file
        const file = path.join(tagPath, tag, 'index.html');
        fs.writeFileSync(file, compiledHtml);
        console.log(`${chalk.green('Built')}: ${file}`);
    }
};

// Copy the content. Images, Stylesheets, JS etc
const copyContent = async () => {
    const contentDir = path.join(config.sourceDir, 'content');
    const contentFiles = await glob(`${contentDir}/*/**`);
    const buildContent = path.join(config.buildDir, 'content');

    // Create build content dir
    if(!fs.existsSync(buildContent)){
        fs.mkdirSync(buildContent);
    }

    for(const content of contentFiles){
        try{
            await copyFile(content);
        }catch(ex){
            console.log(chalk.red(`Error trying to copy contents on file: ${content}`));
            console.log(chalk.red(ex));
        }
    }
};

// Copy a single file when changed
const copyFile = async (file) => {
    const dest = path.join(config.buildDir, file.replace(config.sourceDir, ''));

    // Create dir if doesn't exist
    await fsExtra.ensureDir(path.dirname(dest));

    try{
        // Copy the file
        await fsExtra.copy(file, dest);
        console.log(`${chalk.green('Copied')}: ${dest}`);
    }catch(ex){
        console.log(chalk.red(`Error trying to copy file: ${file}`));
        console.log(chalk.red(ex));
    }
};

// Remove a single file or dir when deleted
const removeFile = async (file) => {
    const filePath = path.join(config.buildDir, file.replace(path.join(config.sourceDir), ''));

    try{
        // Removes file or dir
        await fsExtra.removeSync(filePath);
        console.log(`${chalk.magenta('Remove')}: ${filePath}`);
    }catch(ex){
        console.log(chalk.red(`Error removing file: ${filePath}`));
        console.log(chalk.red(ex));
    }
};

module.exports = {
    clean,
    buildIndex,
    buildFile,
    buildPost,
    buildPagination,
    buildTags,
    copyContent,
    copyFile,
    removeFile
};
