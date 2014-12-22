#!/usr/bin/env node


// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@  Library Includes  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

var restify = require('restify') // rest api framework
  , path    = require('path')    // joining path names
  , fs      = require('fs')      // reading the filesystem
  ;


// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@  Local Includes  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

var defaults = require('./lib/defaults') // default path names
  , logger   = require('./lib/logger')
  ;


var server = restify.createServer({
    name: defaults.APPNAME,
    log: logger
});

server.pre(restify.pre.userAgentConnection());
server.use(restify.acceptParser(server.acceptable));
server.use(restify.CORS());
server.use(restify.gzipResponse());
server.use(restify.requestLogger());
/*
server.use(function(req, res, next) {
    console.log(req.params);
    console.log(req.route);
    next();
})
*/


// load up all of our routes
// each route should expose a function to be called with the server as 
//   the first parameter
routes = fs.readdirSync('routes')
routes.forEach(function(route) {
    if (route[0] !== '.') {
        require(path.resolve('routes', route))(server);
    }
});

server.listen(defaults.PORT, function() {
    logger.info('%s listening at %s', server.name, server.url);
});
