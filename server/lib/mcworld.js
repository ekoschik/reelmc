'use strict';

// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@  Imports  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

var request = require('request-json');
var events  = require('events');
var path    = require('path');
var util    = require('util');
var net     = require('net');
var fs      = require('fs');

// local imports
var defaults = require('./defaults');

// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@  Constants  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

var client = request.newClient('http://localhost:73129/');

module.exports = {
    create: function(callback) {
        client.get('/world/create', function(err, res, body) {
            var world = new World(body.uuid);
            callback(world);
        });
    },

    list: function(callback) {
        client.get('/world/list', function(err, res, body) {
            var worlds = body.worlds;
            callback(worlds);
        });
    },

    get: function(uuid, callback) {
        var world = new World(uuid);
        callback(world);
    },

    destroy: function(uuid, callback) {
        var world = new World(uuid);
        world.destroy(callback);
    }
};

// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@  The World class  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

function World(context) {
    events.EventEmitter.call(this);

    var uuid = 

    var defaults = {
        name: 
    }
    this.id = id;
}

util.inherits(World, events.EventEmitter);

// World prototypes

World.prototype.start = function(callback) {
    var that = this;
    console.log('starting the server');
    //this.emit('star');
    client.get('/worlds/' + this.id + '/start', function(err, res, body) {
        callback(that);
    });
};

World.prototype.command = function(command, callback) {
    var that = this;
    client.get('/worlds/' + this.id + '/command/' + command, function(err, res, body) {
        callback();
    });
};

