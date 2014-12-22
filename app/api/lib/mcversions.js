'use strict';

var mcjar = require('./mcjar');
var logger = require('./logger');


/**
 * Return an object mapping minecraft version strings to a number
 * indicating its position in the release cycle.
 * @param {function(error, object)} callback Called with the version order
 *      object as the second parameter.
 */
var getVersionOrder = (function() {
    var versionOrder = null;
    return function(callback) {
        mcjar.getVersions(function(err, versions, updated) {
            if (err) {
                callback(err);
                return;
            }

            if (versionOrder && !updated) {
                process.nextTick(function() { callback(null, versionOrder); });
                return;
            }

            versionOrder = {};

            for (var i = 0; i < versions.versions.length; ++i) {
                versionOrder[versions.versions[i]['id']] = versions.versions.length - i - 1;
            }

            logger.debug({versionOrder: versionOrder}, 'loaded version order');

            callback(null, versionOrder);
        });
    };
})();

/**
 * Compare the two version strings. Calls the callback
 * with a number less than 0 if `v1` is less than `v2`, 
 * greater than 0 if `v1` is greater than `v2`, and 0
 * if they are equal. The result represents the number
 * of versions apart the two passed in versions are.
 * @param {function(error, number)} Called with the result of the comparison.
 */
module.exports.compare = function(v1, v2, callback) {
    getVersionOrder(function(err, versionOrder) {
        var v1val = versionOrder[v1];
        var v2val = versionOrder[v2];

        if (v1val === undefined) {
            callback(new Error(v1 + ' is not a valid Minecraft version'));
            return;
        }

        if (v2val === undefined) {
            callback(new Error(v2 + ' is not a valid Minecraft version'));
            return;
        }

        logger.info('comparing version %s (%d) and %s (%d)', v1, v1val, v2, v2val);

        callback(null, v1val - v2val);
    });
}


// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@  Called if this file is ran by itself  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

if (require.main === module) {
    var v1 = process.argv[2]
    var v2 = process.argv[3]

    /*
    if (v1 === undefined || v2 === undefined) {
        console.log('must specify two versions to compare');
        process.exit(1);
    }*/

    module.exports.compare(v1, v2, function(err, result) {
        if (err) {
            console.log(err);
            return;
        }
        if (result < 0) {
            console.log(v1, 'is less than', v2);
        } else if (result > 0) {
            console.log(v1, 'is greater than', v2);
        } else {
            console.log(v1, 'is equal to', v2);
        }

        console.log('result:', result);
    });
}
