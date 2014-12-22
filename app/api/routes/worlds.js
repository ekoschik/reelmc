'use strict';

var mcmanager = require('../lib/mcmanager');


function listWorlds(req, res, next) {
    var worlds = mcmanager.listWorlds(function(err, worlds) {
        if (err) return next(err);

        res.write(JSON.stringify(worlds));
        next();
    });
}

function getWorld(req, res, next) {
    var world = mcmanager.getWorld(req.params.id, function(err, world) {
        if (err) return next(err);

        res.write(JSON.stringify(world));
        next();
    });
}

/**
 * Set up the world endpoints on the given server object.
 * @param {object} server The server object to set up routes on.
 */
module.exports = function(server) {

    server.get('/worlds', listWorlds);
    server.head('/worlds', listWorlds);

    server.get('/worlds/:id', getWorld);
    server.head('/worlds/:id', getWorld);
};
