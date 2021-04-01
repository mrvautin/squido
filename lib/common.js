const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const chalk = require('chalk');
const markdownIt = require('markdown-it');
const markdown = new markdownIt();

// Regex
const metaRegex = /(?<=---)(.*?)(?=---)/sm;
const bodyRegex = /---.*?---/s;

const getMeta = (file) => {
    const sourceFile = fs.readFileSync(file, 'utf-8');
    const metaMatch = sourceFile.match(metaRegex);

    if(!metaMatch[0]){
        return undefined;
    }

    const meta = yaml.load(metaMatch[0]);
    meta.body = markdown.render(sourceFile.replace(bodyRegex, ''));
    return meta;
};

const getConfig = (environment) => {
    // Setup config
    const configFile = require(path.join(process.cwd(), 'config.js'));
    if(!configFile){
        console.log(chalk.red('Config file not found. Create a config.js file in root of project.'));
        process.exit();
    }
    const config = configFile[environment];
    if(!config){
        console.log(chalk.red(`Config file found but environment not found for: ${environment}.`));
        process.exit();
    }

    return config;
};

module.exports = {
    getMeta,
    getConfig
};
