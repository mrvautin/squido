const NetlifyAPI = require('netlify');
const fs = require('fs');
const path = require('path');
const { createReadStream } = require('fs');
const _ = require('lodash');
const chalk = require('chalk');
const fetch = require('node-fetch');

const run = async (opts) => {
    console.log(`${chalk.yellow('[Deployment]')}: Starting to deploy to Netlify`);

    // Check options
    if(!opts.apiToken || opts.apiToken === ''){
        console.log(`${chalk.red('Deployment')}: Failed: apiToken not set`);
        return;
    }
    if(!opts.siteName || opts.siteName === ''){
        console.log(`${chalk.red('Deployment')}: Failed: siteName not set`);
        return;
    }

    // Check for the Zip
    const zipPath = path.join(process.config.buildDir, 'build.zip');
    if(!fs.existsSync(zipPath)){
        console.log(`${chalk.red('Deployment')}: Failed: Zip file not found. Check Zip plugin is enabled. `);
        return;
    }

    const client = new NetlifyAPI(opts.apiToken);

    // Fetch sites
    const sites = await client.listSites();

    // Find the site
    const siteIndex = _.findIndex(sites, (s) => { return s.name === opts.siteName; });

    // Find site
    let site = sites[siteIndex];

    // Check if site exists
    if(!site){
        console.log(`${chalk.green('[Deployment]')}: Creating site: ${opts.siteName}`);
        // Create a new site
        site = await client.createSite({
            body: {
                name: opts.siteName,
                build_settings: {
                    dir: 'build/'
                }
            }
        });
    }

    // Upload build zip
    const stream = createReadStream(zipPath);
    const stats = fs.statSync(zipPath);
    const fileSize = stats.size;
    fetch(`https://api.netlify.com/api/v1/sites/${site.site_id}/deploys`, {
        method: 'POST',
        body: stream,
        headers: {
            Authorization: `Bearer ${opts.apiToken}`,
            'Content-Type': 'application/zip',
            'Content-length': fileSize
        }
    })
    .then(res => {
        if(res.status === 200){
            console.log(`${chalk.green('Deployment')}: Successfully deployed site to Netlify`);
            return;
        }
        console.log(`${chalk.red('Deployment')}: Failed to deploy site to Netlify`);
    });
};

module.exports = {
    run
};
