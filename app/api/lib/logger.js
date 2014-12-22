var bunyan = require('bunyan');
var defaults = require('./defaults');
var log = bunyan.createLogger({
    name: defaults.APPNAME,
    streams: [
        {
            level: 'debug',
            stream: process.stdout
        },
        {
            level: 'debug',
            path: defaults.LOG_FILE
        }
    ]
});


module.exports = log;

