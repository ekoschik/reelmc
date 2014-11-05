#!/usr/bin/env node

var restify = require('restify');

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


function worlds(req, res, next) {
    res.send('world' + req.params);
    return next();
}

server.get('/worlds', worlds);
server.head('/worlds', worlds);

server.get('/worlds/:id', worlds);
server.head('/worlds/:id', worlds);


server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
});
