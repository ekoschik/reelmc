/**
 * The default file and directory locations for this project.
 */

var path = require('path')
  , fs   = require('fs')
  ;

/**
 * True if we are running on windows, false otherwise.
 * @const
 * @type {boolean}
 */
var isWin = process.platform === 'win32';


/**
 * Makes sure the given path exists by creating it. Returns the path that was passed in.
 * @param  {string} path The path we want to check for existance. 
 * @return {string} The path that was passed in.
 */
function ensureExists(path) {
    fs.mkdir(path, 0755, function(err) {
        if (err && err.code != 'EEXIST') throw err;
    });

    return path;
}


/**
 * The port to run the api server on.
 * @const
 * @type {number}
 */
module.exports.PORT = 8080;

/**
 * The name of our app.
 * @const
 * @type {string}
 */
module.exports.APPNAME = "reelmc";

/**
 * The OS specific directory that is safe to store files under
 * @const
 * @type {string}
 */
module.exports.LOCAL_DIR = ensureExists(isWin ? process.env.LOCALAPPDATA : path.join(process.env.HOME, '.local', 'share'));

/**
 * The root directory for all of our files.
 * @const
 * @type {string}
 */
module.exports.ROOT_DIR = ensureExists(path.join(module.exports.LOCAL_DIR, module.exports.APPNAME));

/**
 * The location of the saved minecraft worlds.
 * @const
 * @type {string}
 */
module.exports.WORLD_DIR = ensureExists(path.join(module.exports.ROOT_DIR, 'worlds'));

/**
 * The location of the saved minecraft jar files.
 * @const
 * @type {string}
 */
module.exports.JARFILE_DIR = ensureExists(path.join(module.exports.ROOT_DIR, 'jarfiles'));

/**
 * The OS specific temporary file directory.
 * @const
 * @type {string}
 */
module.exports.TEMP_DIR = ensureExists(isWin ? path.join(process.env.TEMP, module.exports.APPNAME) : path.join('/tmp', module.exports.APPNAME));

/**
 * The directory that runtime files such as pidfiles will be written to.
 * @const
 * @type {string}
 */
module.exports.RUNTIME_DIR = ensureExists(path.join(module.exports.ROOT_DIR, 'run'));

/**
 * The directory that logs get created and stored in.
 * @const
 * @type {string}
 */
module.exports.LOG_DIR = ensureExists(path.join(module.exports.ROOT_DIR, 'log'));

/**
 * The main log file.
 * @const
 * @type {string}
 */
module.exports.LOG_FILE = path.join(module.exports.LOG_DIR, module.exports.APPNAME + '.log');
