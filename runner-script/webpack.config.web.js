// Generated using webpack-cli https://github.com/webpack/webpack-cli

const config = require('./webpack.config.js');

module.exports = () => {
    const cfg = config();
    cfg.output.filename = 'web.js';
    cfg.target = 'web';
    return cfg;
};
