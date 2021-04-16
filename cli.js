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
    importWordPress,
    importGhost
} = require('./lib/import');
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
    .command('import')
    .description('Import from external sources')
    .option('-f, --file <path>', 'Specify file to import')
    .option('-t, --type <type>', 'Specify the type of file to import. Eg: wordpress')
    .action(async(options) => {
        // Check for a file
        if(options && !options.file){
            console.log(chalk.red('Import file not specified. Please specify the full path to the file you wish to import.'));
            return;
        }

        // Check the file path is correct
        if(!fs.existsSync(options.file)){
            console.log(chalk.red('File not found. Please check the file path and try again.'));
            return;
        }

        // Run Wordpress import
        if(options && options.type === 'wordpress'){
            await importWordPress(options.file);
            return;
        }

         // Run Ghost import
         if(options && options.type === 'ghost'){
            await importGhost(options.file);
            return;
        }

        console.log(chalk.red('File type not supported. Please check the file type is supported and try again.'));
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
