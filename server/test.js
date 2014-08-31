var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
    res.render('index', {
        worlds: ['world1', 'evansworld']
    });
});

/* GET world page */
router.get('/world/:world', function(req, res) {
    var world = req.params.world;
    res.render('world', {
        world: world,
        players: ['schlenkster', 'ekoschik']
    });
});


/* GET player page */
router.get('/player/:player', function(req, res) {
    var player = req.params.player;
    res.render('player', {
        player: player,
        location: {x: 103, y: 206, z: -408}
    });
});

module.exports = router;
