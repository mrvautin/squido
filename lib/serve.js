const path = require('path');
const express = require('express');
const chalk = require('chalk');
const { getConfig } = require('./common');
const config = getConfig();

const start = () => {
    const app = express();
    const port = process.env.PORT || config.port || 4965;
    app.use(express.static(config.buildDir));
    if(process.env.NODE_ENV !== 'test'){
        console.log(chalk.yellow(`Server started at: http://localhost:${port}`));
    }

    // Setup 404 handling
    app.use((req, res) => {
        res.status(404).sendFile(path.join(config.buildDir, '/404.html'));
    });

    return app.listen(port);
};

module.exports = {
    start
};
