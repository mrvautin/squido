const fsExtra = require('fs-extra');
const glob = require('glob-promise');
const chalk = require('chalk');
const handlebars = require('handlebars');
const yaml = require('js-yaml');
const md5 = require('md5');
const path = require('path');
const fs = require('fs');
const { SitemapStream } = require('sitemap');
const { Feed } = require('feed');
const markdownIt = require('markdown-it');
const { stripHtml } = require('string-strip-html');
const markdown = new markdownIt();
const config = process.config;

// Regex
const metaRegex = /(?<=---)(.*?)(?=---)/sm;
const bodyRegex = /(?<=---).*?(?=---)/sm;

// Set build dir
const buildDir = path.join(process.cwd().toString(), 'build');
// Check build dir exists and create if not
if(!fs.existsSync(buildDir)){
    fs.mkdirSync(buildDir);
}

// Clean build directory
const clean = async () => {
    try{
        fsExtra.emptyDirSync(buildDir);
        console.log(`${chalk.cyan('Cleaned')}: ${buildDir}`);
    }catch(ex){
        console.log(chalk.red('Error trying to clean the build directory'));
        console.log(chalk.red(ex));
    }
};

// Create the index.html file. The entry point of the website
const buildIndex = async () => {
    // Setup templates
    const layoutPath = path.join(process.cwd().toString(), 'source', 'layouts', 'layout.hbs');
    const templateIndexPath = path.join(process.cwd().toString(), 'source', 'index.hbs');
    const template404Path = path.join(process.cwd().toString(), 'source', '404.hbs');

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
        meta.config = config;
        meta.title = config.name;
        meta.description = config.description;
        meta.url = config.baseUrl || `http://localhost:${config.port || 4965}`;

        const pageData = {
            posts: process.posts,
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

        const indexHtml = templateIndex(pageData);
        const compiledIndexHtml = layout({ body: indexHtml, meta });

        // Write our index html file
        fs.writeFileSync(path.join(buildDir, 'index.html'), compiledIndexHtml);
        console.log(`${chalk.green('Built')}: ${path.join(buildDir, 'index.html')}`);

        // Write our 404 html file
        const html404 = template404();
        const compiled404Html = layout({ body: html404 });

        // Write our 404 html file
        fs.writeFileSync(path.join(buildDir, '404.html'), compiled404Html);
        console.log(`${chalk.green('Built')}: ${path.join(buildDir, '404.html')}`);
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

        fs.writeFileSync(path.join(process.cwd(), 'source', 'package.json'), JSON.stringify(buildJson, null, 2));
        console.log(`${chalk.green('Built')}: ${path.join(process.cwd(), 'source', 'package.json')}`);
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

    const layoutPath = path.join(process.cwd().toString(), 'source', 'layouts', 'layout.hbs');
    const templatePath = path.join(process.cwd().toString(), 'source', 'post.hbs');

    // Check needed files exists
    if(!fs.existsSync(layoutPath)){
        console.log(`${chalk.red('Required file not found')}: ${layoutPath}`);
        process.exit();
    }
    if(!fs.existsSync(templatePath)){
        console.log(`${chalk.red('Required file not found')}: ${templatePath}`);
        return;
    }

    const layout = handlebars.compile(fs.readFileSync(layoutPath, 'utf-8'));
    const template = handlebars.compile(fs.readFileSync(templatePath, 'utf-8'));
    const buildPath = path.join(process.cwd().toString(), 'build');

    // Read the post meta
    try{
        const sourceFile = fs.readFileSync(file, 'utf-8');
        const metaMatch = sourceFile.match(metaRegex);
        if(metaMatch[0]){
            const meta = yaml.load(metaMatch[0]);

            // Don't create posts without a permalink
            if(!meta.permalink){
                console.log(chalk.red(`No permalink found. Cannot process: ${file}`));
                return;
            }

            // Check if dir exists or create
            if(!fs.existsSync(path.join(buildPath, meta.permalink))){
                fs.mkdirSync(path.join(buildPath, meta.permalink));
            }

            // Setup meta
            meta.body = markdown.render(sourceFile.replace(bodyRegex, ''));
            meta.summary = stripHtml(meta.body).result.substring(0, config.summaryLength || 250);
            meta.date = new Date(meta.date);
            const baseUrl = config.baseUrl || `http://localhost:${config.port || 4965}`;
            meta.url = `${baseUrl}/${meta.permalink}`;
            meta.config = config;

            // Render html
            const postHtml = template(meta);
            const compiledHtml = layout({ body: postHtml, meta });

            // Write our html file
            fs.writeFileSync(path.join(buildPath, meta.permalink, 'index.html'), compiledHtml);
            console.log(`${chalk.green('Built')}: ${file}`);

            // Get md5 of file as ID
            meta.hash = md5(compiledHtml);

            // Add to global post object
            if(!process.posts.includes(meta)){
                process.posts.push(meta);
            }
        }
    }catch(ex){
        console.log(chalk.red(`Error trying to build post: ${file}`));
        console.log(chalk.red(ex));
    }
};

const buildPagination = async () => {
    const layoutPath = path.join(process.cwd().toString(), 'source', 'layouts', 'layout.hbs');
    const templatePath = path.join(process.cwd().toString(), 'source', 'page.hbs');

    // Check needed files exists
    if(!fs.existsSync(layoutPath)){
        console.log(`${chalk.red('Required file not found')}: ${layoutPath}`);
        process.exit();
    }
    if(!fs.existsSync(templatePath)){
        console.log(`${chalk.red('Required file not found')}: ${templatePath}`);
        return;
    }

    const layout = handlebars.compile(fs.readFileSync(layoutPath, 'utf-8'));
    const template = handlebars.compile(fs.readFileSync(templatePath, 'utf-8'));
    const buildPath = path.join(process.cwd().toString(), 'build');
    const pagePath = path.join(buildPath, 'page');

    // Hold our pages
    process.pages = {};
    let pageCount = 1;
    let postCount = 0;
    const postPerPage = config.postPerPage || 12; // default to 12 if not set

    // Loop posts to build pagination
    for(const post of process.posts){
        try{
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
            posts: process.pages[page],
            pages: pageCount,
            page: parseInt(page),
            meta: {
                config
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
        const pageHtml = template(pageData);
        const compiledHtml = layout({ body: pageHtml });

        // Write our html file
        const file = path.join(pagePath, page.toString(), 'index.html');
        fs.writeFileSync(file, compiledHtml);
        console.log(`${chalk.green('Built')}: ${file}`);
    }
};

// Build tag files
const buildTags = async () => {
    const layoutPath = path.join(process.cwd().toString(), 'source', 'layouts', 'layout.hbs');
    const templatePath = path.join(process.cwd().toString(), 'source', 'tag.hbs');

    // Check needed files exists
    if(!fs.existsSync(layoutPath)){
        console.log(`${chalk.red('Required file not found')}: ${layoutPath}`);
        process.exit();
    }
    if(!fs.existsSync(templatePath)){
        console.log(`${chalk.red('Required file not found')}: ${templatePath}`);
        return;
    }

    const layout = handlebars.compile(fs.readFileSync(layoutPath, 'utf-8'));
    const template = handlebars.compile(fs.readFileSync(templatePath, 'utf-8'));
    const buildPath = path.join(process.cwd().toString(), 'build');
    const tagPath = path.join(buildPath, 'tag');

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
            posts: process.tags[tag],
            meta: {
                config
            }
        };

        // Render html
        const pageHtml = template(tagData);
        const compiledHtml = layout({ body: pageHtml });

        // Write our html file
        const file = path.join(tagPath, tag, 'index.html');
        fs.writeFileSync(file, compiledHtml);
        console.log(`${chalk.green('Built')}: ${file}`);
    }
};

// Copy the content. Images, Stylesheets, JS etc
const copyContent = async () => {
    const contentDir = path.join(process.cwd().toString(), 'source', 'content');
    const contentFiles = await glob(`${contentDir}/*/**`);
    const buildContent = path.join(buildDir, 'content');

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
    const contentDir = path.join(process.cwd().toString(), 'source', 'content');
    const dest = path.join(buildDir, 'content', file.replace(contentDir, ''));

    // Check if content is a directory
    if(fs.lstatSync(file).isDirectory()){
        // Create dir if doesn't exist
        if(!fs.existsSync(file)){
            fs.mkdirSync(file);
        }
    }else{
        try{
            // Copy the file
            await fsExtra.copy(file, dest);
            console.log(`${chalk.green('Create')}: ${dest}`);
        }catch(ex){
            console.log(chalk.red(`Error trying to copy file: ${file}`));
            console.log(chalk.red(ex));
        }
    }
};

// Remove a single file or dir when deleted
const removeFile = async (file) => {
    const filePath = path.join(buildDir, file.replace('source/', ''));

    try{
        // Removes file or dir
        await fsExtra.removeSync(filePath);
        console.log(`${chalk.magenta('Remove')}: ${filePath}`);
    }catch(ex){
        console.log(chalk.red(`Error removing file: ${file}`));
        console.log(chalk.red(ex));
    }
};

const sitemap = async () => {
    const sitemap = new SitemapStream({ hostname: config.baseUrl });

    const writeStream = fs.createWriteStream(path.join(process.cwd(), 'build', 'sitemap.xml'));
    sitemap.pipe(writeStream);

    // Add index
    sitemap.write({ url: '/', changefreq: 'daily', priority: 0.3 });

    // Add posts
    for(const post of process.posts){
        sitemap.write({ url: `/${post.permalink}`, changefreq: 'daily', priority: 0.3 });
    }

    // Add pages
    for(const page in process.pages){
        sitemap.write({ url: `/page/${page}`, changefreq: 'daily', priority: 0.3 });
    }

    // Add tags
    for(const tag in process.tags){
        sitemap.write({ url: `/tag/${tag}`, changefreq: 'daily', priority: 0.3 });
    }

    sitemap.end();
};

const rssfeed = async () => {
    // Setup feed
    const feed = new Feed({
        title: 'Feed Title',
        description: 'This is my personal feed!',
        id: config.baseUr,
        link: config.baseUrl,
        image: 'http://example.com/image.png',
        favicon: `${config.baseUrl}/favicon.png`,
        generator: 'squido',
        feedLinks: {
          json: `${config.baseUrl}/json`,
          atom: `${config.baseUrl}/atom`,
          rss: `${config.baseUrl}/rss`
        }
    });

    // Add posts
    for(const post of process.posts){
        feed.addItem({
            title: post.title,
            id: `${config.baseUrl}/${post.permalink}`,
            link: `${config.baseUrl}/${post.permalink}`,
            description: post.description,
            content: post.body,
            date: post.date
        });
    }

    // Write feed files
    fs.writeFileSync(path.join(buildDir, 'rss'), feed.rss2());
    fs.writeFileSync(path.join(buildDir, 'atom'), feed.atom1());
    fs.writeFileSync(path.join(buildDir, 'json'), feed.json1());
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
    removeFile,
    sitemap,
    rssfeed
};
