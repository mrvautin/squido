const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { stripHtml } = require('string-strip-html');
const highlightjs = require('highlight.js');
const md5File = require('md5-file');
const markdownIt = require('markdown-it');
const handlebars = require('handlebars');
const glob = require('globby');
const ejs = require('ejs');
const pug = require('pug');
const fsExtra = require('fs-extra');
const { format } = require('date-fns');
const cheerio = require('cheerio');
const { file } = require('smart-matter');
const clearModule = require('clear-module');
const markdown = new markdownIt({
    html: true,
    highlight: (str, lang) => {
        if(lang && highlightjs.getLanguage(lang)){
            try{
                return highlightjs.highlight(str, { language: lang }).value;
            }catch(ex){
                console.log('Failed to highlight code block', ex);
            }
        }
        return '';
    }
});
markdown.use(require('markdown-it-anchor'));
const markdownItAttrs = require('markdown-it-attrs');
markdown.use(markdownItAttrs, {
    allowedAttributes: ['id', 'class', /^regex.*$/]
});

const getMeta = (filepath) => {
    const frontMatter = file(filepath);
    const fileId = md5File.sync(filepath);

    // Setup meta
    const meta = Object.assign({}, frontMatter);
    meta.body = markdown.render(frontMatter.content);
    meta.markdown = frontMatter.content;
    meta.toc = builtToc(meta.body);
    meta.filename = frontMatter.file;
    meta.id = fileId;
    meta.fileMeta = frontMatter;
    meta.date = frontMatter.dateObject;
    meta.fileMeta.date = frontMatter.dateObject;
    meta.lastupdated = frontMatter.lastupdated;
    meta.summary = stripHtml(meta.body).result.substring(0, process.config.summaryLength || 250);
    meta.url = `${process.config.baseUrl}/${meta.permalink}`;
    if(meta.permalink.slice(-1) !== '/'){
        meta.url = `${process.config.baseUrl}/${meta.permalink}/`;
    }

    // Cleanup stuff we don't want
    delete meta.content;
    delete meta.fileMeta.content;

    // Return meta
    return meta;
};

const getEnvironment = () => {
    return process.env.NODE_ENV || 'development';
};

const setConfig = () => {
    const environment = getEnvironment();
    const configFilePath = path.join(process.cwd(), 'config.js');

    // Check for config.js file in root
    if(!fs.existsSync(configFilePath)){
        console.log(chalk.red('Config file not found. Create a config.js file in root of project.'));
        process.exit();
    }

    // Setup config
    let configFile;
    try{
        clearModule(configFilePath);
        configFile = require(configFilePath);
    }catch(configEx){
        console.log(chalk.red('Failed reading the config.js file. Check the docs on creating a config.js file.'));
        console.log(chalk.yellow(configEx.stack));
        process.exit();
    }
    const config = configFile[environment];
    config.environment = environment;
    if(!config){
        console.log(chalk.red(`Config file found but environment not found for: ${environment}.`));
        process.exit();
    }

    // Set the file env for minified files
    config.fileEnv = '.min';
    if(process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined){
        config.fileEnv = '';
    }

    // Set defaults
    if(!config.sourceDir){
        config.sourceDir = 'source';
    }
    if(!config.buildDir){
        config.buildDir = 'build';
    }
    if(!config.contentDir){
        config.contentDir = 'content';
    }

    // Validate template value
    const templateEngines = ['hbs', 'ejs', 'pug'];
    if(config.templateEngine && !templateEngines.includes(config.templateEngine)){
        console.log(chalk.red(`Supplied templateEngine config is invalid. Try one of: ${templateEngines.join()}`));
        process.exit();
    }

    if(!config.templateEngine){
        config.templateEngine = 'hbs';
    }
    if(!config.templateConfig){
        config.templateConfig = {};
    }

    // Set the default baseUrl if not set
    if(!config.baseUrl){
        config.baseUrl = `http://localhost:${config.port || 4965}`;
    }

    // Set full dir paths
    if(!path.isAbsolute(config.sourceDir)){
        config.sourceDir = path.join(process.cwd(), config.sourceDir);
    }
    if(!path.isAbsolute(config.buildDir)){
        config.buildDir = path.join(process.cwd(), config.buildDir);
    }

    // Check build dir exists and create if not
    if(!fs.existsSync(config.buildDir)){
        fs.mkdirSync(config.buildDir);
    }

    // Add environment envs
    config.envVars = {};
    config.envVars = process.env;

    // Set the config for later
    delete process.config;
    delete process.squido;
    process.config = config;
    process.squido = config;
};

const getConfig = () => {
    // return if 'squido new' command is run.
    if(process.argv[2] === 'new'){
        return;
    }
    setConfig();
};

const setupHelpers = (handlebars) => {
    let helpers = {
        ifCond: (v1, operator, v2, options) => {
            switch(operator){
                case '==':
                    return (v1 === v2) ? options.fn(this) : options.inverse(this);
                case '!=':
                    return (v1 !== v2) ? options.fn(this) : options.inverse(this);
                case '===':
                    return (v1 === v2) ? options.fn(this) : options.inverse(this);
                case '<':
                    return (v1 < v2) ? options.fn(this) : options.inverse(this);
                case '<=':
                    return (v1 <= v2) ? options.fn(this) : options.inverse(this);
                case '>':
                    return (v1 > v2) ? options.fn(this) : options.inverse(this);
                case '>=':
                    return (v1 >= v2) ? options.fn(this) : options.inverse(this);
                case '&&':
                    return (v1 && v2) ? options.fn(this) : options.inverse(this);
                case '||':
                    return (v1 || v2) ? options.fn(this) : options.inverse(this);
                default:
                    return options.inverse(this);
            }
        },
        capitalize: (str) => {
            if(str){
                return str.charAt(0).toUpperCase() + str.slice(1);
            }
            return str;
        },
        formatdate: (date) => {
            if(date){
                try{
                    let dateFormat = 'dd/MM/yyyy';
                    if(process.config.dateFormat){
                        dateFormat = process.config.dateFormat;
                    }
                    return format(date, dateFormat);
                }catch(ex){
                    return date;
                }
            }
            return date;
        },
        objLength: (obj) => {
            if(obj){
                return Object.keys(obj).length;
            }
            return 0;
        },
        includes: (obj, key) => {
            if(!obj){
                return false;
            }
            if(obj.includes(key)){
                return true;
            }
            return false;
        }
    };

    // Check for helpers in the config
    if(process.config.templateConfig && process.config.templateConfig.helpers){
        helpers = Object.assign(process.config.templateConfig.helpers, helpers);
    }
    handlebars.registerHelper(helpers);
};

const runPlugins = async () => {
    for(const i in process.config.plugins){
        const pluginConfig = process.config.plugins[i];
        try{
            const plugin = require(path.join(process.config.sourceDir, 'plugins', `${pluginConfig.name}.js`));
            await plugin.run(pluginConfig.options);
        }catch(ex){
            console.log(chalk.red(`Failed to run plugin ${pluginConfig.name}.`));
            console.log(chalk.red('Ex', ex));
        }
    }
};

const runPostBuild = async () => {
    for(const i in process.config.postBuild){
        const buildTask = process.config.postBuild[i];
        try{
            const plugin = require(`./postBuild/${buildTask.name}.js`);
            await plugin.run(buildTask.options);
        }catch(ex){
            console.log(chalk.red(`Failed to run postBuild task ${buildTask.name}.`));
            console.log(chalk.red('Ex', ex));
        }
    }
};

const runSetupNew = async () => {
    // Get files for setup from squido module
    const setupFiles = await glob([
        `${winPath(path.join(__dirname, '..', 'source'))}/**/*.hbs`,
        `${winPath(path.join(__dirname, '..', 'source'))}/package.json`,
        `${winPath(path.join(__dirname, '..', 'source'))}/robots.txt`,
        `${winPath(path.join(__dirname, '..', 'source'))}/swagger.yaml`,
        `${winPath(path.join(__dirname, '..', 'source'))}/content/**/*`,
        `${winPath(path.join(__dirname, '..', 'source'))}/posts/**/*.markdown`,
        `!${winPath(path.join(__dirname, '..', 'source'))}/post-diff.hbs`
    ]);

    // Copy template files
    for(const file of setupFiles){
        const dest = file.replace(winPath(path.join(__dirname, '..', 'source')), winPath(path.join(process.cwd(), 'source')));
        const dirName = path.dirname(dest);

        // Create dir if doesn't exist
        await fsExtra.ensureDir(dirName);

        try{
            // Copy the file
            await fsExtra.copy(file, dest);
            console.log(`${chalk.green('Copied')}: ${dest}`);
        }catch(ex){
            console.log(chalk.red(`Error trying to copy file: ${file}`));
            console.log(chalk.red(ex));
        }
    }

    // Copy other needed files
    await fsExtra.copy(path.join(__dirname, '..', 'config.js'), path.join(process.cwd(), 'config.js'));
    await fsExtra.copy(path.join(__dirname, '..', 'source', 'package.json'), path.join(process.cwd(), 'package.json'));
    console.log(chalk.green('[Setup complete]'));
};

const deIndent = (str) => {
    return str.replace(/ {4}/g, '');
};

const compile = (data) => {
    if(process.config.templateEngine === 'ejs'){
        return ejs.compile(data, process.config.templateConfig);
    }
    if(process.config.templateEngine === 'pug'){
        return pug.compile(data, process.config.templateConfig);
    }
    return handlebars.compile(data);
};

const render = (template, data) => {
    return template(data);
};

const registerPartials = async () => {
    if(process.config.templateEngine === 'hbs'){
        const partialFiles = await glob(`${winPath(process.config.sourceDir)}/partials/**/*.hbs`);

        const partialData = {
            posts: process.posts,
            postList: process.postList,
            tags: process.tags,
            config: process.config
        };

        for(const partialPath of partialFiles){
            const partialName = path.parse(partialPath).name;
            const partialCompiled = compile(fs.readFileSync(partialPath, 'utf-8'));
            handlebars.registerPartial(partialName, render(partialCompiled, partialData));
        }
    }
};

const winPath = (file) => {
    // Globs need forward slashes in path no matter the OS
    // We convert backslash to forward on Windows
    if(process.platform === 'win32'){
        return file.replace(/\\/g, '/');
    }
    return file;
};

const builtToc = (html) => {
    const toc = {};
    const $ = cheerio.load(html);
    $('h1, h2, h3, h4, h5, h6').map((_, element) => {
        if(!toc[element.name]){
            toc[element.name] = [];
        }
        toc[element.name].push({
            text: $(element).html(),
            id: element.attribs.id
        });
    });
    return toc;
};

module.exports = {
    getMeta,
    getEnvironment,
    getConfig,
    setupHelpers,
    runPlugins,
    runPostBuild,
    runSetupNew,
    deIndent,
    compile,
    render,
    registerPartials,
    winPath
};
