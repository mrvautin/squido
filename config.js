const config = {
    test: {
        name: 'squido',
        description: 'This is the blog description',
        twitterHandle: '@mrvautin',
        baseUrl: 'http://localhost:4965',
        sourcesExt: 'markdown',
        templateEngine: 'hbs',
        templateConfig: {
            helpers: {
                printStuff: () => {
                    return '<h1>Print stuff</h1>';
                }
            }
        },
        data: [
            {
                name: 'swagger',
                type: 'yaml',
                file: 'swagger.yaml'
            },
            {
                name: 'swagger-json',
                type: 'json',
                file: 'swagger.json'
            }
        ],
        sourceDir: 'source',
        buildDir: 'build',
        summaryLength: 250,
        port: 4965,
        pagination: true,
        postPerPage: 8,
        plugins: [
            {
                name: 'testplugin',
                options: {
                    setting: true,
                    another: false
                }
            },
            {
                name: 'dudplugin',
                options: {
                    setting: true,
                    another: false
                }
            }
        ],
        postBuild: [
            {
                name: 'zip',
                options: {}
            }
        ]
    },
    development: {
        name: 'squido',
        description: 'This is the blog description',
        twitterHandle: '@mrvautin',
        baseUrl: 'http://localhost:4965',
        sourcesExt: 'markdown',
        templateEngine: 'hbs',
        sourceDir: 'source',
        buildDir: 'build',
        data: [
            {
                name: 'swagger',
                type: 'yaml',
                file: 'swagger.yaml'
            }
        ],
        summaryLength: 250,
        port: 4965,
        pagination: true,
        postPerPage: 8,
        postBuild: [
            {
                name: 'zip',
                options: {}
            }
        ]
    },
    production: {
        name: 'squido-changed',
        description: 'This is the blog description',
        twitterHandle: '@mrvautin',
        baseUrl: 'http://example.com',
        sourcesExt: 'markdown',
        sourceDir: 'source',
        buildDir: 'build',
        summaryLength: 250,
        port: 4965,
        pagination: true,
        postPerPage: 8
    }
};

module.exports = config;
