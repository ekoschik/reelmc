'use strict';

var http = require('http')
  , mcworld = require('../lib/mcworld')
  ;


module.exports = function (router) {
 //   var model = new IndexModel();
    
    var model = {worlds: ['world1', 'world2', 'max keebler']};

    router.get('/', function(req, res) {
        res.render('index', model);
    });

    router.get('/worlds', function(req, res) {
        res.render('world');
    });

    router.post('/worlds/create', function(req, res) {
        mcworld.create(function(world) {
            console.log('created world ' + world.id);
            res.redirect(router.get('/world/' + world.id));
        });
    });

    router.get('/world/:world', function(req, res) {
        var world = req.params.world;
        res.render('world', {
            world: world,
            players: ['schlenkster', 'ekoschik']
        });
    });

    router.get('/player/:player', function(req, res) {
        var player = req.params.player;
        res.render('player', {
            player: player,
            location: {x: 103, y: 206, z: -408}
        });
    });
};
