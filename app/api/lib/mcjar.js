#!/usr/bin/env node

'use strict';

var path     = require('path')
  , util     = require('util')
  , fs       = require('fs')
  ;

var defaults = require('./defaults')
  , logger   = require('./logger')
  , web      = require('./web')
  ;

var JARFILE_DIR  = defaults.JARFILE_DIR
  , BASE_URL     = 'https://s3.amazonaws.com/Minecraft.Download/versions/'
  , VERSION_FILE = 'versions.json'
  , QUERY_URL    = BASE_URL + VERSION_FILE
  ;


var JARFILE_TTL = 1000 * 60 * 60 * 24 * 7; // 1 week
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
        logger.info('downloading versions file from %s', QUERY_URL);
        web.download({
            url: QUERY_URL,
            ttl: MINECRAFT_VERSIONS_TTL,
            checkModifiedTime: true,
            savefile: path.join(defaults.TEMP_DIR, VERSION_FILE)
        }, function(err, fname, updated) {
            if (err) {
                callback(err);
                return;
            }

            logger.info('version file was' + (updated ? ' ' : ' not ') + 'updated');

            // if we haven't already loaded the versions file, or it was updated with the download request,
            // then we need to reload it
            if (!versions || updated) {
                logger.debug('loading versions file from %s', fname);
                // load the json file
                fs.readFile(fname, 'utf8', function (err, data) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    versions = JSON.parse(data);
                    callback(null, versions, updated);
                    return;
                });
            } else {
                callback(null, versions, updated);
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
    var versionGet;
    if (version === 'latest') {
        versionGet = function(versions) { return versions.latest.release; }
    } else if (version === 'latest_snapshot') {
        versionGet = function(versions) { return versions.latest.snapshot; }
    } else {
        process.nextTick(function() { callback(null, version); });
        return;
    }

    getVersions(function(err, versions) {
        if (err) {
            callback(err, null);
        } else {
            callback(null, versionGet(versions));
        }
    });
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
      ttl: JARFILE_TTL,
      savefile: path.join(JARFILE_DIR, path.basename(url))
    }, callback);
}

/**
 * Downloads the given server version to JARFILE_DIR, calling the callback
 * with an error if one occured, and the path to the downloaded file. This
 * call is a noop if the jarfile has already been downloaded.
 * @param {string} version The version of the minecraft server to download.
 * @param {function(error, string, boolean)} callback The callback to call after the server has been downloaded.
 *      The second argument is the path to the downloaded file. The third argument is whether the server jar was
 *      updated or not.
 */
var downloadServer = module.exports.downloadServer = function(version, callback) {
    resolveVersion(version, function(err, version) {
        if (err) 
            callback && callback(err);
        else 
            downloadHelper(getServerUrl(version), callback);
    });
}

/**
 * Downloads the given client version to JARFILE_DIR, calling the callback
 * with an error if one occured, and the path to the downloaded file. This
 * call is a noop if the jarfile has already been downloaded.
 * @param {string} version The version of the minecraft client to download.
 * @param {function(error, string, boolean)} callback The callback to call after the client has been downloaded.
 *      The second argument is the path to the downloaded file. The third argument is whether the client jar was
 *      updated or not.
 */
var downloadClient = module.exports.downloadClient = function(version, callback) {
    resolveVersion(version, function(err, version) {
        if (err)
            callback && callback(err);
        else
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

        if (process.argv[2] === '-d') {
            downloadServer('latest', function(err, file, updated) {
                console.log('downloaded the latest server to', file);
            });
        }
    });
}
