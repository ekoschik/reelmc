'use strict';

var fs = require('fs');
var path = require('path');
var events = require('events');
var util = require('util');
var net = require('net');
var request = require('request-json');

var REELMC_ROOT = '/var/games/reelmc';
var WORLD_ROOT = path.join(REELMC_ROOT, 'worlds');
var JARFILE_ROOT = path.join(REELMC_ROOT, 'jarfiles');
var MINECRAFT_JAR = path.join(JARFILE_ROOT, 'minecraft_server.1.7.10.jar');

var client = request.newClient('http://localhost:73129/');

function apply(callback, args) {
    args = Array.prototype.slice.call(arguments[1]);
    return function() {
        if (callback) {
            callback.apply(args);
        }
    };
}

module.exports = {
    create: function(callback) {
        client.get('/world/create', function(err, res, body) {
            var world = new World(body.uuid);
            process.nextTick(function() {
                callback(world);
            });
        });
    },

    list: function(callback) {
        client.get('/world/list', function(err, res, body) {
            var worlds = body.worlds;
            process.nextTick(function() {
                callback(worlds);
            });
        });
    },

    get: function(uuid, callback) {
        var world = new World(uuid);
        process.nextTick(function() {
            callback(world);
        });
    },

    destroy: function(uuid, callback) {
        var world = new World(uuid);
        world.destroy(callback);
    }
};

// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@  The World class  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

function World(id) {
    // call the parent constructor
    events.EventEmitter.call(this);
    if (!id) {
        throw new Error('id must be defined');
    }
    this.id = id;
}

util.inherits(World, events.EventEmitter);

// World prototypes

World.prototype.start = function(callback) {
    var that = this;
    console.log('starting the server');
    //this.emit('starting');
    client.get('/worlds/' + this.id + '/start', function(err, res, body) {
        process.nextTick(function() {
            callback(that);
        });
    });
};

World.prototype.command = function(command, callback) {
    var that = this;
    client.get('/worlds/' + this.id + '/command/' + command, function(err, res, body) {
        process.nextTick(callback);
    });
};

