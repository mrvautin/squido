const config = {
    development: {
        name: 'squido',
        description: 'This is the blog description',
        twitterHandle: '@mrvautin',
        baseUrl: 'http://localhost:4965',
        layout: 'layout.hbs',
        sourceDir: 'posts/',
        sourcesExt: 'markdown',
        summaryLength: 250,
        port: 4965
    },
    production: {
        name: 'squido2',
        description: 'This is the blog description',
        twitterHandle: '@mrvautin',
        baseUrl: 'http://example.com',
        layout: 'layout.hbs',
        sourceDir: 'posts/',
        sourcesExt: 'markdown',
        summaryLength: 250,
        port: 4965
    }
};

module.exports = config;
