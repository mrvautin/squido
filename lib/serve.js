const path = require('path');
const express = require('express');
const chalk = require('chalk');
const config = process.config;

const start = () => {
    const app = express();
    const port = process.env.PORT || config.port || 4965;
    app.use(express.static(path.join(process.cwd(), config.buildDir)));
    if(process.env.NODE_ENV !== 'test'){
        console.log(chalk.yellow(`Server started at: http://localhost:${port}`));
    }

    // Setup 404 handling
    app.use((req, res) => {
        res.status(404).sendFile(path.join(process.cwd(), config.buildDir, '/404.html'));
    });

    return app.listen(port);
};

module.exports = {
    start
};
