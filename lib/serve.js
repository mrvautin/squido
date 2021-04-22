const path = require('path');
const express = require('express');
const chalk = require('chalk');
const { getConfig } = require('./common');
const expressHandlebars = require('express-handlebars');
const config = getConfig();

const start = () => {
    const app = express();
    const port = process.env.PORT || config.port || 4965;
    app.use(express.static(config.buildDir));
    app.use('/public', express.static(path.join(__dirname, '..', 'admin', 'assets')));
    if(process.env.NODE_ENV !== 'test'){
        console.log(chalk.yellow(`Server started at: http://localhost:${port}`));
    }

    // view engine setup
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.set('views', path.join(__dirname, '../', 'admin', 'views'));
    app.engine('hbs', expressHandlebars({
        extname: 'hbs',
        layoutsDir: path.join(__dirname, '../', 'admin', 'views', 'layouts'),
        defaultLayout: 'layout.hbs',
        partialsDir: [path.join(__dirname, 'views')]
    }));
    app.set('view engine', 'hbs');

    // Setup admin route
    const index = require(path.join('..', 'admin', 'routes', 'index'));
    app.use('/', index);

    // Setup 404 handling
    app.use((req, res) => {
        res.status(404).sendFile(path.join(config.buildDir, '/404.html'));
    });

    return app.listen(port);
};

module.exports = {
    start
};
