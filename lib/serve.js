const path = require('path');
const express = require('express');
const chalk = require('chalk');
const config = process.config;

const start = () => {
    const app = express();
    const port = process.env.PORT || config.port || 4965;
    app.use(express.static(path.join(process.cwd(), 'build')));
    console.log(chalk.yellow(`Server started at: http://localhost:${port}`));

    // Setup 404 handling
    app.use((req, res, next) => {
        const err = new Error('Not Found');
        err.status = 404;
        res.sendFile(path.join(process.cwd(), 'build', '/404.html'));
    });

    app.listen(port);
};

module.exports = {
    start
};
