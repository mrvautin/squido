const {
    serial: test
} = require('ava');
const path = require('path');
const h = require('../helper');

test('Import Wordpress XML file', async t => {
    const importDir = path.join(process.cwd(), 'imported');
    const wordpressFile = path.join(process.cwd(), 'tests', 'wordpress.xml');
    const cmd = await h.exec(`${h.rootPath}/cli.js import -f ${wordpressFile} -t wordpress`);

    const importedString = `Imported: Post Markdown files located here: ${importDir}`;

    t.deepEqual(cmd.includes(importedString), true);
});

test('Import Wordpress XML file - Empty', async t => {
    const wordpressFile = path.join(process.cwd(), 'tests', 'wordpress-empty.xml');
    const cmd = await h.exec(`${h.rootPath}/cli.js import -f ${wordpressFile} -t wordpress`);

    t.deepEqual(cmd.includes('Failed to parse Wordpress export file. There are no posts to import.'), true);
});

test('Import Ghost JSON file', async t => {
    const importDir = path.join(process.cwd(), 'imported');
    const wordpressFile = path.join(process.cwd(), 'tests', 'ghost.json');
    const cmd = await h.exec(`${h.rootPath}/cli.js import -f ${wordpressFile} -t ghost`);

    const importedString = `Imported: Post Markdown files located here: ${importDir}`;

    t.deepEqual(cmd.includes(importedString), true);
});

test('Import file - File doesnt exist', async t => {
    const wordpressFile = path.join(process.cwd(), 'tests', 'wordpress-i-no-exist.xml');
    const cmd = await h.exec(`${h.rootPath}/cli.js import -f ${wordpressFile} -t wordpress`);

    t.deepEqual(cmd.includes('File not found. Please check the file path and try again.'), true);
});

test('Import file - Type not supported', async t => {
    const wordpressFile = path.join(process.cwd(), 'tests', 'wordpress.xml');
    const cmd = await h.exec(`${h.rootPath}/cli.js import -f ${wordpressFile} -t nonsupported`);

    t.deepEqual(cmd.includes('File type not supported. Please check the file type is supported and try again.'), true);
});

test('Import file - File path not specified', async t => {
    const cmd = await h.exec(`${h.rootPath}/cli.js import -t nonsupported`);

    t.deepEqual(cmd.includes('Import file not specified. Please specify the full path to the file you wish to import'), true);
});
