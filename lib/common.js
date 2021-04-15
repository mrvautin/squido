const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const chalk = require('chalk');
const { stripHtml } = require('string-strip-html');
const highlightjs = require('highlight.js');
const markdownIt = require('markdown-it');
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

// Regex
const metaRegex = /(?<=---)(.*?)(?=---)/sm;
const bodyRegex = /---.*?---/s;

const getMeta = (file) => {
    const sourceFile = fs.readFileSync(file, 'utf-8');
    const metaMatch = sourceFile.match(metaRegex);

    if(!metaMatch[0]){
        return undefined;
    }

    // Setup meta
    const meta = yaml.load(metaMatch[0]);
    meta.body = markdown.render(sourceFile.replace(bodyRegex, ''));
    meta.summary = stripHtml(meta.body).result.substring(0, config.summaryLength || 250);
    meta.date = new Date(meta.date);
    meta.url = `${config.baseUrl}/${meta.permalink}`;

    // Return meta
    return meta;
};

const getEnvironment = () => {
    return process.env.NODE_ENV || 'development';
};

const setConfig = () => {
    const environment = getEnvironment();

    // Setup config
    const configFile = require(path.join(process.cwd(), 'config.js'));
    if(!configFile){
        console.log(chalk.red('Config file not found. Create a config.js file in root of project.'));
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

    // Set the default baseUrl if not set
    if(!config.baseUrl){
        config.baseUrl = `http://localhost:${config.port || 4965}`;
    }

    // Set full sourceDir
    config.sourceDir = path.join(process.cwd(), config.sourceDir);

    // Check build dir exists and create if not
    const buildDir = path.join(process.cwd(), config.buildDir);
    if(!fs.existsSync(buildDir)){
        fs.mkdirSync(buildDir);
    }
    config.buildDir = buildDir;

    // Set the config for later
    process.squido = config;
};

const getConfig = () => {
    // If not set, set the config
    if(!process.squido){
        setConfig();
    }
    // Return the config
    return process.squido;
};

const setupHelpers = (handlebars) => {
    handlebars.registerHelper('ifCond', (v1, operator, v2, options) => {
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
    });
};

const runPlugins = async () => {
    for(const i in config.plugins){
        const pluginConfig = config.plugins[i];
        try{
            const plugin = require(path.join(config.sourceDir, 'plugins', `${pluginConfig.name}.js`));
            await plugin.run(pluginConfig.options);
        }catch(ex){
            console.log(chalk.red(`Failed to run plugin ${pluginConfig.name}.`));
            console.log(chalk.red('Ex', ex));
        }
    }
};

// Get the config
const config = getConfig();

module.exports = {
    getMeta,
    getEnvironment,
    getConfig,
    setupHelpers,
    runPlugins
};
