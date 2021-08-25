const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { SitemapStream } = require('sitemap');
const { Feed } = require('feed');

const sitemap = async () => {
    const sitemap = new SitemapStream({ hostname: process.config.baseUrl });

    const writeStream = fs.createWriteStream(path.join(process.config.buildDir, 'sitemap.xml'));
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
    console.log(`${chalk.green('Built')}: ${path.join(process.config.buildDir, 'sitemap.xml')}`);
};

const rssfeed = async () => {
    // Setup feed
    const feed = new Feed({
        title: process.config.name,
        description: process.config.description,
        id: process.config.baseUrl,
        link: process.config.baseUrl,
        favicon: `${process.config.baseUrl}/favicon.png`,
        generator: 'squido',
        feedLinks: {
          json: `${process.config.baseUrl}/json`,
          atom: `${process.config.baseUrl}/atom`,
          rss: `${process.config.baseUrl}/rss`
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
            id: `${process.config.baseUrl}/${post.permalink}`,
            link: `${process.config.baseUrl}/${post.permalink}`,
            description: post.description,
            content: post.body,
            date: post.date
        });
    }

    // Write feed files
    fs.writeFileSync(path.join(process.config.buildDir, 'rss'), feed.rss2());
    console.log(`${chalk.green('Built')}: ${path.join(process.config.buildDir, 'rss')}`);
    fs.writeFileSync(path.join(process.config.buildDir, 'atom'), feed.atom1());
    console.log(`${chalk.green('Built')}: ${path.join(process.config.buildDir, 'atom')}`);
    fs.writeFileSync(path.join(process.config.buildDir, 'json'), feed.json1());
    console.log(`${chalk.green('Built')}: ${path.join(process.config.buildDir, 'json')}`);
};

module.exports = {
    sitemap,
    rssfeed
};
