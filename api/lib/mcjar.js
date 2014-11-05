#!/usr/bin/env node

'use strict';

var defaults = require('./defaults')
  , path     = require('path')
  , util     = require('util')
  , web      = require('./web')
  , fs       = require('fs')
  ;

var JARFILE_DIR  = defaults.JARFILE_DIR
  , BASE_URL     = 'https://s3.amazonaws.com/Minecraft.Download/versions/'
  , VERSION_FILE = 'versions.json'
  , QUERY_URL    = BASE_URL + VERSION_FILE
  , SERVER_NAME  = 'minecraft_server.%(version)s.jar'
  , CLIENT_NAME  = '%(version)s.jar'
  ;


var MINECRAFT_VERSIONS_TTL = 1000 * 60 * 60 * 24; // 24 hours

/**
 * Get the url of the Minecraft server of the given `version`.
 * @param  {string} version The version of the Minecraft server to download.
 * @return {string} The download url of the Minecraft server.
 */
function getServerUrl(version) {
    return BASE_URL + version + '/minecraft_server.' + version + '.jar';
}

/**
 * Get the url of the Minecraft client of the given `version`.
 * @param  {string} version The version of the Minecraft client to download.
 * @return {string} The download url of the Minecraft client.
 */
function getClientUrl(version) {
    return BASE_URL + version + '/' + version + '.jar';
}

/**
 * Returns a json object containing information on the available Minecraft
 * versions, including what the latest stable and snapshot versions of Minecraft
 * are currently available.
 * @return {[type]} [description]
 */
var getVersions = module.exports.getVersions = (function() {

    var versions = null;

    return function(callback) {
        console.log('downloading file from ' + QUERY_URL);
        web.download({
            url: QUERY_URL,
            ttl: MINECRAFT_VERSIONS_TTL,
            checkModifiedTime: true,
            savefile: path.join(defaults.TEMP_DIR, VERSION_FILE)
        }, function(err, fname, updated) {
            if (err) {
                callback(err, null);
                return;
            }

            console.log('version file was' + (updated ? ' ' : ' not ') + 'updated');

            // if we haven't already loaded the versions file, or it was updated with the download request,
            // then we need to reload it
            if (!versions || updated) {
                console.log('loading versions file');
                // load the json file
                fs.readFile(fname, 'utf8', function (err, data) {
                    if (err) {
                        callback(err, null);
                        return;
                    }
                    versions = JSON.parse(data);
                    callback(null, versions);
                    return;
                });
            } else {
                callback(null, versions);
            }
        });
    };
})();

/**
 * If the version is either latest or latest_snapshot, resolves
 * to what that would be by querying minecraft's official version 
 * json file. Otherwise, calls callback with the given version.
 * @param {string} version The version string.
 * @param {function(string)} callback Called with the resolved version string.
 */
function resolveVersion(version, callback) {
    version = version.toLowerCase();
    if (version === 'latest') {
        getVersions(function(versions) {
            callback(versions.latest.release);
        });
    } else if (version === 'latest_snapshot') {
        getVersions(function(versions) {
            callback(versions.latest.snapshot);
        });
    } else {
        process.nextTick(function() { callback(version); });
    }
}

/**
 * Downloads the given url to the JARFILE_DIR and saves it as the name of
 * the file on the server. Executes the callback with an exception if there was one else null,
 * the location of the saved file, and whether the file was updated.
 * @param {string} url The url of the file to download.
 * @param {function(error, string, boolean)} callback The callback to call after the file has been downloaded.
 */
function downloadHelper(url, callback) {
    web.download({
      url: url,
      savefile: path.join(defaults.JARFILE_DIR, path.basename(url))
    }, callback);
}

var downloadServer = module.exports.downloadServer = function(version, callback) {
    resolveVersion(version, function(version) {
        downloadHelper(getServerUrl(version), callback);
    });
}

var downloadClient = module.exports.downloadClient = function(version, callback) {
    resolveVersion(version, function(version) {
        downloadHelper(getClientUrl(version), callback);
    });
}

// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@  Called if this file is ran by itself  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

if (require.main === module) {
    getVersions(function(err, versions) {
        if (err) throw err;
        console.log(versions);
    });
}
