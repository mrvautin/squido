#!/usr/bin/env node
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

// Setup config
const configFile = require(path.join(process.cwd(), 'config.js'));
if(!configFile){
    console.log(chalk.red('Config file not found. Create a config.js file in root of project.'));
    process.exit();
}
const environment = process.env.NODE_ENV || 'development';
const config = configFile[environment];
if(!config){
    console.log(chalk.red(`Config file found but environment not found for: ${environment}.`));
    process.exit();
}
// Set for use later
process.config = config;

// Modules
const { Command } = require('commander');
const chokidar = require('chokidar');
const serve = require('./lib/serve');
const {
    clean,
    buildIndex,
    buildFile,
    buildPost,
    copyFile,
    copyContent,
    removeFile,
    buildPagination
} = require('./lib/build');
const { readPosts, compilePosts } = require('./lib/source');

// Setup CLI
const program = new Command();
program
    .version(require('./package.json').version);

program
    .command('build')
    .description('Builds your website')
    .option('-c --clean', 'Cleans build directory')
    .action(async(options) => {
        // If clean flag
        if(options && options.clean){
            await clean();
        }

        await runBuild();
    });

program
    .command('clean')
    .description('Clean your website build')
    .action(async(options) => {
        await clean();
    });

program
    .command('serve')
    .description('Serves website')
    .option('-w --watch', 'Watches for changes')
    .option('-b --build', 'Builds on start')
    .option('-c --clean', 'Cleans build directory')
    .action(async(options) => {
        // If clean flag
        if(options && options.clean){
            await clean();
        }

        // If build flag
        if(options && options.build){
            await runBuild();
        }

        // If watch flag
        if(options && options.watch){
            const watcher = chokidar.watch('./source', {
                ignored: /(^|[/\\])\../,
                persistent: true,
                ignoreInitial: true
            });

            console.log(chalk.green('[Watching for changes]'));

            watcher.on('change', async file => {
                const filedir = path.dirname(file);
                const fullPath = path.join(process.cwd(), file);

                // If a post, build
                if(filedir === 'source/posts'){
                    await buildPost(fullPath);
                    return;
                }

                // If a layout, run a full build
                if(filedir === 'source/layouts'){
                    const sourceFiles = await readPosts();
                await compilePosts(sourceFiles);
                await buildIndex();
                    return;
                }

                // If index, build index
                if(path.basename(file) === 'index.hbs'){
                    await buildIndex();
                    return;
                }

                // All other files
                await copyFile(fullPath);
            });
            watcher.on('unlink', async file => {
                await removeFile(file);
            });

            watcher.on('unlinkDir', async file => {
                await removeFile(file);
            });

            watcher.on('add', async file => {
                const fullPath = path.join(process.cwd(), file);
                await copyFile(fullPath);
            });
        }

        // Start the HTTP server
        await serve.start();
    });

const runBuild = async () => {
    console.log(chalk.yellow(`[Building environment: ${environment}]`));
    const sourceFiles = await readPosts();
    await compilePosts(sourceFiles);
    // If Pagination turned on
    if(config.pagination){
        await buildPagination();
    }
    await buildIndex();

    // Write default build script if one doesn't exist
    if(!fs.existsSync(path.join(process.cwd(), 'source', 'package.json'))){
        await buildFile();
    }
    await copyContent();
};

program.parse(process.argv);
