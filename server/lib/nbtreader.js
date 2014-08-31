#!/usr/bin/env node

var fs = require('fs'),
    nbt = require('nbt'),
    jdp = require('jsondiffpatch'),
    path = require('path');

/** @const */
var EXTENSIONS = ['dat', 'mca']

/**
 * parse the NBT file {@code fname}
 * @param {string} fname the name of the file
 * @param {function(exception, object)} callback
 */
function parseNbt(fname, callback) {
    fs.readFile(fname, function(err, data) {
        if (err) throw err;
        nbt.parse(data, function(err, result) {
            if (err) throw err;
            callback && callback(err, result);
        });
    });
}

// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@  NBTFile  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

/**
 * NBTFile Class
 * @constructor
 * @param {string} fname The absolute path to the NBT file
 *      this class will represent.
 */
function NBTFile(fname) {
    var scope = this;
    scope.fname = fname;
    scope.lastUpdated = new Date().getTime();

    console.log('new nbtfile ' + fname);

    parseNbt(scope.fname, function(err, data) {
        if (err) throw err;
        scope.data = data;
        // TODO: send an event to connected sockets
    });
}

/**
 * Update this NBTFile with new data. Emits a diff
 * of the previous and new data. 
 */
NBTFile.prototype.update = function() {
    // get diff of data
    var scope = this;
    var now = new Date().getTime();
    console.log(scope.fname, "updated after", now - scope.lastUpdated, "milliseconds");
    scope.lastUpdated = now;

    parseNbt(scope.fname, function(err, data) {
        var delta = jdp.diff(scope.data, data);
        console.log(delta);
        // TODO: send an update event out to connected sockets
        scope.data = data;
    });
};

// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@  NBTMonitor  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

/**
 * NBTMonitor Class
 * starts monitoring the directory {@code dir} for changes
 * @param {String} dir the directory to watch
 */
function NBTMonitor(dir) {
    var scope = this;
    scope.dir = dir;
    scope.files = {};

    // initialize our files
    fs.readdir(scope.dir, function(err, files) {
        if (err) throw err;

        console.log("Found files in" + scope.dir + ": " + files);
        files.forEach(function(fname) {
            scope.newFile(path.join(dir, fname));
        });
    });

    // set up a watch on the directory
    fs.watch(dir, function (event, fname) {
        console.log('event: ' + event + ', file: ' + fname);
        if (!validFormat(fname)) return;

        if (fname) {
            scope.updateFile(path.join(dir, fname));
        } else {
            console.log('filename not provided');
        }
    });
}

/**
 * Start monitoring the file given by {@code fname}.
 * @param  {String} fname The absolute path of the file to watch.
 */
NBTMonitor.prototype.newFile = function(fname) {
    var scope = this;
    scope.files[fname] = new NBTFile(fname);
};

/**
 * Tells the file given by {@code fname} to reload its file.
 * If the file does not yet exist in our map, call newFile first.
 * @param  {String} fname The name of the file to update.
 * @return {[type]}
 */
NBTMonitor.prototype.updateFile = function(fname) {
    var scope = this;
    if (fname in scope.files) {
        scope.files[fname].update();
    } else {
        scope.newFile(fname);
    }
}

// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@  NBTMonitor  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

/**
 * Checks to see if the path {@code fname} ends with an extension
 * we want to watch.
 * @param  {string} fname The path to check.
 * @return {boolean} Whether we should watch this file or not.
 */
function validFormat(fname) {
    var ext = fname.split('.').slice(-1);
    return EXTENSIONS.some(function(val) {
        return val == ext;
    });
}

var dir = process.argv[2];
if (!dir) {
    console.log("usage:", process.argv[0], path.basename(process.argv[1]), "<directory>");
    process.exit();
}

var monitor = new NBTMonitor(dir);
console.log("monitoring", dir);
