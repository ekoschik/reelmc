'use strict';

var request = require('request')
  , moment  = require('moment')
  , http    = require('http')
  , fs      = require('fs')
  ;

/**
 * The format expected by the http protocol.
 * @const
 */
var HTTP_TIME_FORMAT = 'ddd, DD MMM YYYY HH:mm:ss';

/**
 * Returns the milliseconds since the Linux epoch of the given time string.
 * @param  {string} httptime A string in the format expected by the http protocol.
 *                           {@link http://tools.ietf.org/html/rfc2616#section-3.3.1}
 * @return {number} milliseconds since the Linux epoch
 */
module.exports.parseHttpTime = function(httptime) {
    return moment(httptime, HTTP_TIME_FORMAT).zone('+0000').valueOf();
}

/**
 * Returns the string representation of the given `time`
 * as described in {@link http://tools.ietf.org/html/rfc2616#section-3.3.1}
 * @param  {number} time The number of milliseconds since the Linux epoch.
 * @return {string} The date as an http string.
 */
module.exports.formatHttpTime = function(time) {
    return moment(time).format(HTTP_TIME_FORMAT) + ' GMT';
}

/**
 * Returns true if the given `path` is a file,
 * false otherwise.
 * @param  {string} path The path to check if it is a file.
 * @return {boolean} Whether the given `path` is a file.
 */
function isFile(path) {
    try {
        return fs.lstatSync(path).isFile();
    } catch (err) {
        return false;
    }
    return false;
}

/**
 * Returns the current time as milliseconds since the Linux epoch.
 * @return {number} The time as milliseconds since the Linux epoch.
 */
function currentTime() {
    return new Date().getTime();
}

/**
 * Downloads the given url to `savefile`. If `savefile`
 * is not given, saves the file to the last part of the 
 * url name. If `checkModifiedTime` is true and `savefile` exists,
 * only download the file if the last-modified time of the file
 * is later than the last-modified time of the file that exists.
 * If ttl is set, and the file already exists, only check the file on 
 * the server if currentTime - ttl > last-modified-time.
 *
 * This function always calls the callback asynchronously. There is no 
 * possibility that it will be invoked immediately.
 *
 * @param {object} options An object containing the parameters to this function.
 *      url {string} required The url to download.
 *      savefile {string} The name to save the file as. If left blank, will use the basename of the url.
 *      checkModifiedTime {boolean} Defaults to false. If true, and `savefile` already exists, the modified time
 *              of the file on the server is checked before downloading. If it is newer than the file on the filesystem,
 *              it will be downloaded and overwrite the existing file. Otherwise, it will not be redownloaded.
 *      ttl {number} The time in millis that `savefile`, if it exists, should be the file returned, regardless of whether
 *              the file on the server is more recent.
 * @param {function(error, string, boolean)} callback Called after the file has been downloaded. The first parameter will be set 
 *      if there was an exception. The second parameter is the filename that the file was saved as. The third parameter is true
 *      if the file was downloaded, or false if the file already existed and met the requirements to be returned.
 */
module.exports.download = function(options, callback) {
    var url = options.url
      , savefile = options.savefile || url.split('/').pop()
      , checkModifiedTime = options.checkModifiedTime
      , ttl = options.ttl
      ;

    console.log('Downloading file from ' + url + ', saving as ' + savefile + '. CheckModifiedTime: ' + checkModifiedTime + ', ttl: ' + ttl);

    // if this is null/false, the file doesn't exist.
    // otherwise it is the last modified time of the file
    var mtime = isFile(savefile) && fs.statSync(savefile).mtime.getTime();

    console.log('Modified time of ' + savefile + ': ' + mtime);

    // if the file exists and the ttl is not expired, return the file
    if (mtime && ttl && !((currentTime() - ttl) > mtime)) {
        console.log('The file exists and is not yet expired.');
        process.nextTick(function() { callback(null, savefile, false); });
        return;
    }

    // if the file exists and we want to check the modified time
    var headers = undefined;
    if (mtime && checkModifiedTime) {
        headers = {
            'If-Modified-Since': module.exports.formatHttpTime(mtime)
        }
    }

    var tempFile = savefile + '.tmp';
    var file = fs.createWriteStream(tempFile);

    console.log('beginning download of file');

    var r = request({
        url: url,
        headers: headers
    }).pipe(file).on('finish', function() {
        console.log('done downloading file');
        file.close(function() {
            if (fs.lstatSync(tempFile).size) {
                console.log('newer version of file exists');
                fs.renameSync(tempFile, savefile);
                callback(null, savefile, true);
            } else {
                console.log('file is already the latest');
                fs.unlink(tempFile);
                callback(null, savefile, false);
            }
        });
    });
}
