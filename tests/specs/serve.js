const {
    serial: test
} = require('ava');
const request = require('supertest');
const h = require('../helper');
const { readPosts } = require('../../lib/source');
const server = require('../../lib/serve');
let app;

test.before(async t => {
    // Populate process.postList for tests
    await readPosts();
    app = await server.start();
});

test('Run serve - Check index', async t => {
    // Run build and clean
    await h.exec(`${h.rootPath}/cli.js build -c`);

    const response = await request(app)
    .get('/');
    t.is(response.status, 200);
});

test('Run serve - Check 404', async t => {
    // Run build and clean
    await h.exec(`${h.rootPath}/cli.js build -c`);

    const response = await request(app)
    .get('/gdgfgdf');
    t.is(response.status, 404);
});

test('Check sitemap', async t => {
    // Run build and clean
    await h.exec(`${h.rootPath}/cli.js build -c`);

    const response = await request(app)
    .get('/sitemap.xml');
    t.is(response.status, 200);
});

test('Check json feed', async t => {
    // Run build and clean
    await h.exec(`${h.rootPath}/cli.js build -c`);

    const response = await request(app)
    .get('/json');
    t.is(response.status, 200);
});

test('Check atom feed', async t => {
    // Run build and clean
    await h.exec(`${h.rootPath}/cli.js build -c`);

    const response = await request(app)
    .get('/atom');
    t.is(response.status, 200);
});

test('Check rss feed', async t => {
    // Run build and clean
    await h.exec(`${h.rootPath}/cli.js build -c`);

    const response = await request(app)
    .get('/rss');
    t.is(response.status, 200);
});
