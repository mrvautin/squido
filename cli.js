#!/usr/bin/env node
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const { getConfig, runPlugins } = require('./lib/common');
const config = getConfig();

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
    buildPagination,
    buildTags
} = require('./lib/build');
const {
    sitemap,
    rssfeed
} = require('./lib/feeds');
const { readPosts, compilePosts } = require('./lib/source');
const { minifyJs, minifyCss } = require('./lib/minify');

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
    .action(async() => {
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
            const watcher = chokidar.watch(config.sourceDir, {
                ignored: /(^|[/\\])\../,
                persistent: true,
                ignoreInitial: true,
                atomic: true
            });

            console.log(chalk.green('[Watching for changes]'));

            watcher.on('change', async file => {
                const filedir = path.dirname(file);

                // If a post, build
                if(filedir === `${config.sourceDir}/posts`){
                    await buildPost(file);
                    return;
                }

                // If a layout, run a full build
                if(filedir === `${config.sourceDir}/layouts`){
                    const sourceFiles = await readPosts();
                    await compilePosts(sourceFiles);
                    await buildIndex();
                    return;
                }

                // If index, build index
                if(path.extname(file) === '.hbs'){
                    if(path.basename(file) === 'index.hbs'){
                        await buildIndex();
                        return;
                    }
                    await runBuild();
                }

                // All other files
                await copyFile(file);
            });
            watcher.on('unlink', async file => {
                await removeFile(file);
            });

            watcher.on('unlinkDir', async file => {
                await removeFile(file);
            });

            watcher.on('add', async file => {
                await copyFile(file);
            });
        }

        // Start the HTTP server
        await serve.start();
    });

const runBuild = async () => {
    console.log(chalk.yellow(`[Building environment: ${config.environment}]`));
    const sourceFiles = await readPosts();
    await compilePosts(sourceFiles);
    // If Pagination turned on
    if(config.pagination){
        await buildPagination();
    }
    await buildIndex();
    await buildTags();

    // Write default build script if one doesn't exist
    if(!fs.existsSync(path.join(config.sourceDir, 'package.json'))){
        await buildFile();
    }
    await copyContent();
    await minifyJs();
    await minifyCss();
    await sitemap();
    await rssfeed();

    // Run plugins if any configured
    if(config.plugins){
        await runPlugins();
    }
    console.log(chalk.green('[Build complete]'));
};

program.parse(process.argv);
