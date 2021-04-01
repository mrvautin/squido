const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { SitemapStream } = require('sitemap');
const { Feed } = require('feed');
const config = process.config;

// Set build dir
const buildDir = path.join(process.cwd().toString(), config.buildDir);
// Check build dir exists and create if not
if(!fs.existsSync(buildDir)){
    fs.mkdirSync(buildDir);
}

const sitemap = async () => {
    const sitemap = new SitemapStream({ hostname: config.baseUrl });

    const writeStream = fs.createWriteStream(path.join(process.cwd(), config.buildDir, 'sitemap.xml'));
    sitemap.pipe(writeStream);

    // Add index
    sitemap.write({ url: '/', changefreq: 'daily', priority: 0.3 });

    // Add posts
    for(const post of process.posts){
        // If hidden, ignore
        if(post.hidden === true){
            continue;
        }
        sitemap.write({ url: `/${post.permalink}`, changefreq: 'daily', priority: 0.3 });
    }

    // Add pages
    for(const page in process.pages){
        sitemap.write({ url: `/page/${page}`, changefreq: 'daily', priority: 0.3 });
    }

    // Add tags
    for(const tag in process.tags){
        sitemap.write({ url: `/tag/${tag}`, changefreq: 'daily', priority: 0.3 });
    }

    sitemap.end();
    console.log(`${chalk.green('Built')}: ${path.join(process.cwd(), config.buildDir, 'sitemap.xml')}`);
};

const rssfeed = async () => {
    // Setup feed
    const feed = new Feed({
        title: 'Feed Title',
        description: 'This is my personal feed!',
        id: config.baseUr,
        link: config.baseUrl,
        image: 'http://example.com/image.png',
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
    fs.writeFileSync(path.join(buildDir, 'rss'), feed.rss2());
    console.log(`${chalk.green('Built')}: ${path.join(buildDir, 'rss')}`);
    fs.writeFileSync(path.join(buildDir, 'atom'), feed.atom1());
    console.log(`${chalk.green('Built')}: ${path.join(buildDir, 'atom')}`);
    fs.writeFileSync(path.join(buildDir, 'json'), feed.json1());
    console.log(`${chalk.green('Built')}: ${path.join(buildDir, 'json')}`);
};

module.exports = {
    sitemap,
    rssfeed
};
