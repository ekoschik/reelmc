#!/usr/bin/env node

'use strict';

// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@  Imports  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

var streamlined = require('streamlined')
  , events      = require('events')
  , uuid        = require('node-uuid')
  , path        = require('path')
  , util        = require('util')
  , net         = require('net')
  , fs          = require('fs')
  ;

// local imports
var defaults = require('./defaults');

// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@  World Class  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

function World(id) {
    events.EventEmitter.call(this);

    this.id = id || uuid.v4();

    this._server = null;
    this._connection = null;

    this.log('created');
}

util.inherits(World, events.EventEmitter);

World.prototype.log = function(message) {
    console.log('[World ' + this.id.substring(0, 8) + '] ', message);
}

/**
 * Save the current state of the {@link World} object.
 */
World.prototype.save = function(callback) {
    try {
        fs.mkdirSync(this.getPath());
    } catch(err) {
        if (err.code !== 'EEXIST') {
            console.log(err);
            throw err;
        }
    }

    this.emit('save');
    callback();
}

World.prototype.getPath = function() {
    return path.join(defaults.WORLD_DIR, this.id);
};

World.prototype.socketPath = function() {
    return this._server.context.socket;
};

World.prototype.start = function() {
    if (this._server) {
        return;
    }

    this.log('starting');
    this._server = streamlined.create({
        exe: path.join(this.getPath(), 'minecraft_server'),
        cwd: this.getPath(),
        name: this.id
    });

    this.emit('start');
    this._connect();
};

World.prototype._connect = (function() {
    var failures = 0;
    return function(callback) {
        this.log('connecting');
        var that = this;

        if (this._connection && callback) {
            console.log('connection already established, calling callback');
            callback && callback();
            return;
        }

        this._connection = net.connect({path: this.socketPath()}, function() {
            console.log('connected to wrapper socket');
            that._connection.on('data', function(data) { 
                /* do stuff with the data */ 
                console.log(data.toString().trim());
            });
            that.emit('connect');
            callback && callback();
        });

        this.connection.on('error', function(err) {
            that._connection = null;
            console.log(err);
            if (failures > 10) {
                throw err;
            }
            ++failures;
            setTimeout(function() {
                that._connect(callback);
            }, 200);
        });
    };
})();

World.prototype.command = function(command) {
    var that = this;
    this._connect(function() {
        that.connection.write(command.toString().trim());
        that.connection.write('\n');
    });
};


// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@  Main Entry Point  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

var main = function() {
    console.log('running main method');

    var files = fs.readdirSync(WORLD_ROOT);
    var id;
    if (files.length != 0) {
        id = files[0];
    }

    var world = new World(id);
    world.start();
    console.log(world.getPath());

    process.stdin.on('data', function(data) {
        world.command(data);
    });
}

if (require.main === module) {
    main();
}
