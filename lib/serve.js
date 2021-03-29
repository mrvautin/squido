const path = require('path');
const express = require('express');
const chalk = require('chalk');
const config = process.config;

const start = () => {
    const app = express();
    const port = process.env.PORT || config.port || 4965;
    app.use(express.static(path.join(process.cwd(), 'build')));
    console.log(chalk.yellow(`Server started at: http://localhost:${port}`));
    app.listen(port);
};

module.exports = {
    start
};
