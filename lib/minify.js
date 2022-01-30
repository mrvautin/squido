const path = require('path');
const fs = require('fs');
const uglifyjs = require('uglify-js');
const cleanCss = require('clean-css');
const chalk = require('chalk');
const glob = require('globby');
const { winPath } = require('./common');

const minifyJs = async() => {
    const jsFiles = await glob([
        `${winPath(process.config.buildDir)}/**/*.js`,
        `!${winPath(process.config.buildDir)}/**/*.min.js`
    ]);

    // Loop JS files and minify
    for(const file of jsFiles){
        const fileParsed = path.parse(file);
        const filePath = fileParsed.dir;
        const fileName = fileParsed.name;
        const fileContents = fs.readFileSync(file, 'utf-8');
        const minified = uglifyjs.minify(fileContents);
        const finalFilePath = path.join(filePath, `${fileName}.min.js`);
        fs.writeFileSync(finalFilePath, minified.code);
        console.log(`${chalk.green('Minified')}: ${finalFilePath}`);
    }
};

const minifyCss = async() => {
    const cssFiles = await glob([
        `${winPath(process.config.buildDir)}/**/*.css`,
        `!${winPath(process.config.buildDir)}/**/*.min.css`
    ]);

    // Loop CSS files and minify
    for(const file of cssFiles){
        const fileParsed = path.parse(file);
        const filePath = fileParsed.dir;
        const fileName = fileParsed.name;
        const fileContents = fs.readFileSync(file, 'utf-8');
        const minified = await new cleanCss({}).minify(fileContents).styles;
        const finalFilePath = path.join(filePath, `${fileName}.min.css`);
        fs.writeFileSync(finalFilePath, minified);
        console.log(`${chalk.green('Minified')}: ${finalFilePath}`);
    }
};

module.exports = {
    minifyJs,
    minifyCss
};
