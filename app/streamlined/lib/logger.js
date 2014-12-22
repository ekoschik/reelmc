var bunyan = require('bunyan');
var log = bunyan.createLogger({
    name: 'streamlined',
    streams: [
        {
            level: 'debug',
            stream: process.stdout
        }
    ],
    serializers: {req: bunyan.stdSerializers.req}
});

module.exports = log;

