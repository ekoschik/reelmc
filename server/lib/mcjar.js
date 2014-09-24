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
module.exports.getVersions = (function() {

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

if (require.main === module) {
    module.exports.getVersions(function(err, versions) {
        if (err) throw err;
        console.log(versions);
    });
}
