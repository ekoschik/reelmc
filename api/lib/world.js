
var minecraft = require('minecraft_control');
var uuid = require('node-uuid');

var $worlds = {};


function World() {
    this.id = uuid.v4();
}


function createWorld() {
    var world = new World();
    $worlds[world.id] = world;

    return world;
}


function getWorld(id) {
    return $worlds[id];
}


function listWorlds(id) {
    return $worlds;
}

