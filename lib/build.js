const fsExtra = require('fs-extra');
const glob = require('globby');
const chalk = require('chalk');
const handlebars = require('handlebars');
const md5 = require('md5');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const md5File = require('md5-file');
const yaml = require('js-yaml');
const { setupHelpers, compile, render, winPath, registerPartials } = require('./common');
setupHelpers(handlebars);

// Clean build directory
const clean = async () => {
    try{
        fsExtra.emptyDirSync(process.config.buildDir);
        console.log(`${chalk.cyan('Cleaned')}: ${process.config.buildDir}`);
    }catch(ex){
        console.log(chalk.red('Error trying to clean the build directory'));
        console.log(chalk.red(ex));
    }
};

// Create the index.html file. The entry point of the website
const buildIndex = async () => {
    // Setup templates
    const layoutPath = path.join(process.config.sourceDir, 'layouts', `layout.${process.config.templateEngine}`);
    const templateIndexPath = path.join(process.config.sourceDir, `index.${process.config.templateEngine}`);

    // File checks
    if(!fs.existsSync(layoutPath)){
        console.log(`${chalk.red('Required file not found')}: ${layoutPath}`);
        process.exit();
    }
    if(!fs.existsSync(templateIndexPath)){
        console.log(`${chalk.red('Required file not found')}: ${templateIndexPath}`);
        process.exit();
    }

    // Template setup
    await registerPartials();
    const layoutHtml = layoutTemplate(fs.readFileSync(layoutPath, 'utf-8'));
    const layout = compile(layoutHtml);
    const templateIndex = compile(fs.readFileSync(templateIndexPath, 'utf-8'));

    try{
        // Set some page meta
        const meta = {};
        meta.title = process.config.name;
        meta.description = process.config.description;
        meta.url = process.config.baseUrl;

        const pageData = {
            posts: process.posts,
            post: process.posts[0],
            tags: process.tags,
            config: process.config,
            meta
        };

        // Check for custom data
        if(process.config.data){
            pageData.data = await getCustomData();
        }

        // If pagination is turned on
        if(process.config.pagination){
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

        const indexHtml = render(templateIndex, Object.assign(pageData, { postList: process.postList }));
        const compiledIndexHtml = render(layout, { body: indexHtml, meta, config: process.config });

        // Write our index html file
        fs.writeFileSync(path.join(process.config.buildDir, 'index.html'), compiledIndexHtml);
        console.log(`${chalk.green('Built')}: ${path.join(process.config.buildDir, 'index.html')}`);
    }catch(ex){
        console.log(chalk.red('Error trying to build the index file'));
        console.log(chalk.red(ex));
    }
};

const build404 = async () => {
    // Setup templates
    const layoutPath = path.join(process.config.sourceDir, 'layouts', `layout.${process.config.templateEngine}`);
    const template404Path = path.join(process.config.sourceDir, `404.${process.config.templateEngine}`);

    if(!fs.existsSync(template404Path)){
        console.log(`${chalk.red('Required file not found')}: ${template404Path}`);
        process.exit();
    }

    // Set some page meta
    const meta = {};
    meta.title = process.config.name;
    meta.description = process.config.description;
    meta.url = process.config.baseUrl;

    // Template setup
    await registerPartials();
    const layoutHtml = layoutTemplate(fs.readFileSync(layoutPath, 'utf-8'));
    const layout = compile(layoutHtml);
    const template404 = compile(fs.readFileSync(template404Path, 'utf-8'));

    // Write our 404 html file
    const html404 = render(template404, {});
    const compiled404Html = render(layout, { body: html404, meta, config: process.config });

    // Write our 404 html file
    fs.writeFileSync(path.join(process.config.buildDir, '404.html'), compiled404Html);
    console.log(`${chalk.green('Built')}: ${path.join(process.config.buildDir, '404.html')}`);
};

const getCustomData = async () => {
    const customData = {};

    // Loop our custom data
    for(const data of process.config.data){
        const filePath = path.join(process.config.sourceDir, data.file);

        // Check required properties
        if(!data.name){
            console.log(chalk.red('No "name" property set'));
            process.exit();
        }
        if(!data.type){
            console.log(chalk.red('No "type" property set'));
            process.exit();
        }
        if(!data.file){
            console.log(chalk.red('No "file" property set'));
            process.exit();
        }

        // Set allowed types
        const allowedTypes = [
            'yaml',
            'json',
            'text'
        ];

        // Check type is allowed
        if(!allowedTypes.includes(data.type)){
            console.log(chalk.red('Type is not allowed. User either: yaml, json, text'));
            process.exit();
        }

        // Check file exists
        if(!fs.existsSync(filePath)){
            console.log(`${chalk.red('Required file not found')}: ${filePath}`);
            process.exit();
        }

        // Read file
        const fileContents = fs.readFileSync(filePath, 'utf-8');

        // Parse JSON
        if(data.type === 'json'){
            try{
                customData[data.name] = JSON.parse(fileContents);
                continue;
            }catch(ex){
                console.log(`${chalk.red('Failed to parse JSON formatted file')}: ${filePath}`);
                process.exit();
            }
        };

        // Parse YAML
        if(data.type === 'yaml'){
            try{
                const obj = yaml.load(fileContents);
                customData[data.name] = obj;
                continue;
            }catch(ex){
                console.log(`${chalk.red('Failed to parse YAML formatted file')}: ${filePath}`);
                process.exit();
            }
        }

        // Plaintext
        customData[data.name] = fileContents;
    }

    return customData;
};

const rootFiles = async () => {
    try{
        // Get the root files
        const rootFiles = await glob([
            `${winPath(process.config.sourceDir)}/*`,
            `!${winPath(process.config.sourceDir)}/*.${process.config.templateEngine}`
        ]);

        // Loop our root files and copy them
        for(const file of rootFiles){
            if(fs.existsSync(file)){
                const filename = path.basename(file);
                fs.copyFileSync(file, path.join(process.config.buildDir, filename));
                console.log(`${chalk.green('Copied')}: ${path.join(process.config.buildDir, filename)}`);
            }
        }
    }catch(ex){
        console.log(chalk.red('Error trying to copy root file'));
        console.log(chalk.red(ex));
    }
};

const buildPost = async (file) => {
    // Check file exists
    if(!fs.existsSync(file)){
        console.log(chalk.red(`Cannot build file. Not found: ${file}`));
        return;
    }

    // Lookup the post
    const meta = _.find(process.posts, ['id', md5File.sync(file)]);

    if(!meta){
        console.log(chalk.yellow(`Skipping file as not Meta data found: ${file}`));
        return;
    }

    // Set default template file
    let templateFileName = `post.${process.config.templateEngine}`;

    // Override template file from meta data
    if(meta.template){
        templateFileName = meta.template;
    }

    const layoutPath = path.join(process.config.sourceDir, 'layouts', `layout.${process.config.templateEngine}`);
    const templatePath = path.join(process.config.sourceDir, templateFileName);

    // Check needed files exists
    if(!fs.existsSync(layoutPath)){
        console.log(`${chalk.red('Required file not found')}: ${layoutPath}`);
        process.exit();
    }
    if(!fs.existsSync(templatePath)){
        console.log(`${chalk.yellow('Skipping - Required file not found')}: ${templatePath}`);
        return;
    }

    // Template setup
    await registerPartials();
    const layoutHtml = layoutTemplate(fs.readFileSync(layoutPath, 'utf-8'));
    const layout = compile(layoutHtml);
    const template = compile(fs.readFileSync(templatePath, 'utf-8'));

    try{
        // Don't create posts without a permalink
        if(!meta.permalink){
            console.log(chalk.red(`No permalink found. Cannot process: ${file}`));
            return;
        }

        // Check if dir exists or create
        if(!fs.existsSync(path.join(process.config.buildDir, meta.permalink))){
            try{
                await fsExtra.ensureDir(path.join(process.config.buildDir, meta.permalink));
            }catch(ex){
                console.log('ex', ex);
            }
        }

        // Render html
        const data = {
            postList: process.postList,
            config: process.config
        };

        // Check for custom data
        if(process.config.data){
            data.data = await getCustomData();
        }

        const postHtml = render(template, Object.assign(meta, data));
        const compiledHtml = render(layout, {
            body: postHtml,
            meta,
            posts: process.posts,
            config: process.config
        });
        // Write our html file
        fs.writeFileSync(path.join(process.config.buildDir, meta.permalink, 'index.html'), compiledHtml);
        console.log(`${chalk.green('Built')}: ${path.join(process.config.buildDir, meta.permalink, 'index.html')}`);

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
    const layoutPath = path.join(process.config.sourceDir, 'layouts', `layout.${process.config.templateEngine}`);
    const templatePath = path.join(process.config.sourceDir, `page.${process.config.templateEngine}`);

    // Check needed files exists
    if(!fs.existsSync(layoutPath)){
        console.log(`${chalk.red('Required file not found')}: ${layoutPath}`);
        process.exit();
    }
    if(!fs.existsSync(templatePath)){
        console.log(`${chalk.red('Required file not found')}: ${templatePath}`);
        process.exit();
    }

    // Template setup
    await registerPartials();
    const layoutHtml = layoutTemplate(fs.readFileSync(layoutPath, 'utf-8'));
    const layout = compile(layoutHtml);
    const template = compile(fs.readFileSync(templatePath, 'utf-8'));
    const pagePath = path.join(process.config.buildDir, 'page');

    // Hold our pages
    process.pages = {};
    let pageCount = 1;
    let postCount = 0;
    const postPerPage = process.config.postPerPage || 12; // default to 12 if not set

    // Loop posts to build pagination
    for(const post of process.posts){
        try{
            // If the meta "visible" is set to false, don't show it
            if(post.visible === false){
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
            config: process.config,
            posts: process.pages[page],
            pages: pageCount,
            page: parseInt(page),
            meta: {
                url: `${process.config.baseUrl}/page/${page}/`
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
        const pageHtml = render(template, Object.assign(pageData, { postList: process.postList, config: process.config }));
        const compiledHtml = render(layout, Object.assign({ body: pageHtml }, pageData));

        // Write our html file
        const file = path.join(pagePath, page.toString(), 'index.html');
        fs.writeFileSync(file, compiledHtml);
        console.log(`${chalk.green('Built')}: ${file}`);
    }
};

// Build tag files
const buildTags = async () => {
    const layoutPath = path.join(process.config.sourceDir, 'layouts', `layout.${process.config.templateEngine}`);
    const templatePath = path.join(process.config.sourceDir, `tag.${process.config.templateEngine}`);

    // Check needed files exists
    if(!fs.existsSync(layoutPath)){
        console.log(`${chalk.red('Required file not found')}: ${layoutPath}`);
        process.exit();
    }
    if(!fs.existsSync(templatePath)){
        console.log(`${chalk.red('Required file not found')}: ${templatePath}`);
        process.exit();
    }

    // Template setup
    await registerPartials();
    const layoutHtml = layoutTemplate(fs.readFileSync(layoutPath, 'utf-8'));
    const layout = compile(layoutHtml);
    const template = compile(fs.readFileSync(templatePath, 'utf-8'));
    const tagPath = path.join(process.config.buildDir, 'tag');

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
            config: process.config,
            meta: {
                url: `${process.config.baseUrl}/tag/${tag}/`
            }
        };

        // Render html
        const pageHtml = render(template, Object.assign(tagData, { postList: process.postList }));
        const compiledHtml = render(layout, Object.assign({ body: pageHtml }, tagData));

        // Write our html file
        const file = path.join(tagPath, tag, 'index.html');
        fs.writeFileSync(file, compiledHtml);
        console.log(`${chalk.green('Built')}: ${file}`);
    }
};

// Copy the content. Images, Stylesheets, JS etc
const copyContent = async () => {
    const contentDir = path.join(process.config.sourceDir, process.config.contentDir);
    const contentFiles = await glob(`${winPath(contentDir)}/**`);
    const buildContent = path.join(process.config.buildDir, process.config.contentDir);

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
    const dest = path.join(process.config.buildDir, path.normalize(file).replace(process.config.sourceDir, ''));
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
    const filePath = path.join(process.config.buildDir, file.replace(path.join(process.config.sourceDir), ''));

    try{
        // Removes file or dir
        await fsExtra.removeSync(filePath);
        console.log(`${chalk.magenta('Remove')}: ${filePath}`);
    }catch(ex){
        console.log(chalk.red(`Error removing file: ${filePath}`));
        console.log(chalk.red(ex));
    }
};

const layoutTemplate = (html) => {
    const { EOL } = require('os');
    const comment = `<!--  This site was generated by squido. https://squido.org  -->${EOL}`;
    return html.replace('<head>', `${comment}<head>`);
};

module.exports = {
    clean,
    buildIndex,
    build404,
    rootFiles,
    buildPost,
    buildPagination,
    buildTags,
    copyContent,
    copyFile,
    removeFile
};
