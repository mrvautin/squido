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

test('Check admin index at /squido', async t => {
    // Run build and clean
    await h.exec(`${h.rootPath}/cli.js build -c`);

    const response = await request(app)
    .get('/squido/');
    t.is(response.status, 302);
});

test('Create new post', async t => {
    // Run build and clean
    await h.exec(`${h.rootPath}/cli.js build -c`);

    const response = await request(app)
    .post('/squido/create');
    t.is(response.status, 200);
    t.deepEqual(response.body.id.length, 18);
});

test('Search term', async t => {
    // Run build and clean
    await h.exec(`${h.rootPath}/cli.js build -c`);

    const response = await request(app)
    .post('/squido/search')
    .send({
        searchTerm: 'Dilectu'
    })
    .set('Accept', 'application/json');
    t.is(response.status, 200);
    t.deepEqual(response.body.length, 1);
});

test('Search term - not found', async t => {
    // Run build and clean
    await h.exec(`${h.rootPath}/cli.js build -c`);

    const response = await request(app)
    .post('/squido/search')
    .send({
        searchTerm: 'not-found'
    })
    .set('Accept', 'application/json');
    t.is(response.status, 200);
    t.deepEqual(response.body.length, 0);
});

test('Update existing post', async t => {
    // Run build and clean
    await h.exec(`${h.rootPath}/cli.js build -c`);

    const post = process.postList[0];

    const updatedPost = {
        postId: post.id,
        tile: 'new title',
        permalink: 'new-permalink',
        markdown: 'some body markdown text',
        description: 'new description'
    };

    const response = await request(app)
    .post('/squido/save')
    .send(updatedPost)
    .set('Accept', 'application/json');
    t.is(response.status, 200);

    // Check response that values are updated
    t.deepEqual(response.body.id, updatedPost.postId);
    t.deepEqual(response.body.title, updatedPost.title);
    t.deepEqual(response.body.permalink, updatedPost.permalink);
    t.deepEqual(response.body.markdown, updatedPost.markdown);
    t.deepEqual(response.body.description, updatedPost.description);

    // Check file exists
    t.deepEqual(await h.exists(response.body.filename), true);
});

test('Delete existing post', async t => {
    // Run build and clean
    await h.exec(`${h.rootPath}/cli.js build -c`);

    const post = process.postList[0];

    const response = await request(app)
    .post('/squido/delete')
    .send({
        postId: post.id
    })
    .set('Accept', 'application/json');
    t.is(response.status, 200);
});
