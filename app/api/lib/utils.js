'use strict';

var fs = require('fs');

/**
 * This file contains generic functions that don't really have
 * a specific place to go.
 */

/**
 * Returns true if the given `path` is a file,
 * false otherwise.
 * @param  {string} path The path to check if it is a file.
 * @return {boolean} Whether the given `path` is a file.
 */
var isFile = module.exports.isFile = function(path) {
    try {
        return fs.lstatSync(path).isFile();
    } catch (err) {
        return false;
    }
    return false;
}

