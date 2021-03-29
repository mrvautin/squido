const fsExtra = require('fs-extra');
const glob = require('glob-promise');
const chalk = require('chalk');
const handlebars = require('handlebars');
const yaml = require('js-yaml');
const md5 = require('md5');
const path = require('path');
const fs = require('fs');
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
    const layoutPath = path.join(process.cwd().toString(), 'source', 'layouts', config.layout);
    const templatePath = path.join(process.cwd().toString(), 'source', 'index.hbs');
    const layout = handlebars.compile(fs.readFileSync(layoutPath, 'utf-8'));
    const template = handlebars.compile(fs.readFileSync(templatePath, 'utf-8'));

    try{
        // Set some page meta
        const meta = {};
        meta.config = config;
        meta.title = config.name;
        meta.description = config.description;
        meta.url = config.baseUrl;

        const indexHtml = template({ posts: process.posts, meta });
        const compiledHtml = layout({ body: indexHtml, meta });

        // Write our html file
        fs.writeFileSync(path.join(buildDir, 'index.html'), compiledHtml);

        console.log(`${chalk.green('Built')}: ${templatePath}`);
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
              build: 'squido build'
            },
            dependencies: {
                squido: 'latest'
            }
        };

        fs.writeFileSync(path.join(process.cwd().toString(), 'source', 'package.json'), JSON.stringify(buildJson, null, 2));
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

    const layoutPath = path.join(process.cwd().toString(), 'source', 'layouts', config.layout);
    const templatePath = path.join(process.cwd().toString(), 'source', 'post.hbs');
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
            meta.summary = stripHtml(meta.body).result.substring(0, config.summaryLength | 250);
            meta.date = new Date(meta.date);
            meta.url = `${config.baseUrl}/${meta.permalink}`;
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

module.exports = {
    clean,
    buildIndex,
    buildFile,
    buildPost,
    copyContent,
    copyFile,
    removeFile
};
