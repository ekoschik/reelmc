'use strict';

var fs = require('fs');
var path = require('path');
var uuid = require('node-uuid');
var defaults = require('./defaults');
var mcjar = require('./mcjar');

/**
 * The job of this module is to handle the creation and setup of a minecraft world environment
 * that a minecraft process can run under. 
 */

function MinecraftManager(options) {
    this.id = options.id || uuid.v4();
    this.version = options.version || 'latest';
    this.homeDir = path.join(defaults.WORLD_DIR, this.id);

    // validate that the version is a valid version
}

MinecraftManager.prototype.setup = function(callback) {
    // download the server jar given by the version string
    // error if the version string is invalid
    // create a directory for the world
    // ensure that the config files exist
    // create the config files for the version of the server
    // if the config files already exist, make sure that they are valid 
    
    var scope = this;
    
    async.parallel(tasks, function(err, results) {
        callback && callback(scope.getContext());
    });
}

MinecraftManager.prototype.createConfig(callback) {
    // if the version is 1.7.10 or greater, we must agree to the eula file
    // write eula=true to eula.txt
    
    // create server.properties
    // create whitelist.json
    // create ops.json
    // create banned-ips.json
    // create banned-players.json
}

MinecraftManager.prototype.downloadServer(callback) {
    mcjar.downloadServer(this.version, callback);
}

MinecraftManager.prototype.createHomeDir(callback) {
    // create the home directory for the minecraft world to live in
    // must be done before creating the config file
    
    fs.mkdir(this.homeDir, function(err) {
        callback(err, this.homeDir);
    }
}


MinecraftManager.prototype.getContext() {
    return {
        java:    this.java,
        dir:     this.dir,
        server:  this.server,
        jvmargs: this.jvmargs
    }
}
