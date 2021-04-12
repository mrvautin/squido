const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { SitemapStream } = require('sitemap');
const { Feed } = require('feed');
const { getConfig } = require('./common');
const config = getConfig();

const sitemap = async () => {
    const sitemap = new SitemapStream({ hostname: config.baseUrl });

    const writeStream = fs.createWriteStream(path.join(config.buildDir, 'sitemap.xml'));
    sitemap.pipe(writeStream);

    // Add index
    sitemap.write({ url: '/', changefreq: 'daily', priority: 0.3 });

    // Add posts
    for(const post of process.posts){
        // If hidden, ignore
        if(post.hidden === true){
            continue;
        }
        sitemap.write({ url: `/${post.permalink}/`, changefreq: 'daily', priority: 0.3 });
    }

    // Add pages
    for(const page in process.pages){
        sitemap.write({ url: `/page/${page}/`, changefreq: 'daily', priority: 0.3 });
    }

    // Add tags
    for(const tag in process.tags){
        sitemap.write({ url: `/tag/${tag}/`, changefreq: 'daily', priority: 0.3 });
    }

    sitemap.end();
    console.log(`${chalk.green('Built')}: ${path.join(config.buildDir, 'sitemap.xml')}`);
};

const rssfeed = async () => {
    // Setup feed
    const feed = new Feed({
        title: config.name,
        description: config.description,
        id: config.baseUrl,
        link: config.baseUrl,
        favicon: `${config.baseUrl}/favicon.png`,
        generator: 'squido',
        feedLinks: {
          json: `${config.baseUrl}/json`,
          atom: `${config.baseUrl}/atom`,
          rss: `${config.baseUrl}/rss`
        }
    });

    // Add posts
    for(const post of process.posts){
        // If hidden, ignore
        if(post.hidden === true){
            continue;
        }

        feed.addItem({
            title: post.title,
            id: `${config.baseUrl}/${post.permalink}`,
            link: `${config.baseUrl}/${post.permalink}`,
            description: post.description,
            content: post.body,
            date: post.date
        });
    }

    // Write feed files
    fs.writeFileSync(path.join(config.buildDir, 'rss'), feed.rss2());
    console.log(`${chalk.green('Built')}: ${path.join(config.buildDir, 'rss')}`);
    fs.writeFileSync(path.join(config.buildDir, 'atom'), feed.atom1());
    console.log(`${chalk.green('Built')}: ${path.join(config.buildDir, 'atom')}`);
    fs.writeFileSync(path.join(config.buildDir, 'json'), feed.json1());
    console.log(`${chalk.green('Built')}: ${path.join(config.buildDir, 'json')}`);
};

module.exports = {
    sitemap,
    rssfeed
};
