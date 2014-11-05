'use strict';

function worlds(req, res, next) {
    res.send('world ' + JSON.stringify(req.params));
    return next();
}

module.exports = function(server) {

    server.get('/worlds', worlds);
    server.head('/worlds', worlds);

    server.get('/worlds/:id', worlds);
    server.head('/worlds/:id', worlds);
};
