#!/usr/bin/env node

var restify = require('restify');
var path = require('path');
var fs = require('fs');

var server = restify.createServer();
server.pre(restify.pre.userAgentConnection());
server.use(restify.acceptParser(server.acceptable));
server.use(restify.CORS());
server.use(restify.gzipResponse());
server.use(function(req, res, next) {
    console.log(req.params);
    console.log(req.route);
    next();
})


routes = fs.readdirSync('routes')
routes.forEach(function(route) {
    if (route[0] !== '.') {
        require(path.resolve('routes', route))(server);
    }
});

server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
});
