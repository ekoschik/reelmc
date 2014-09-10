#!/usr/bin/env node

// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@  Imports  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

var readline = require('readline')
  , events   = require('events') // used to emit events
  , spawn    = require('child_process').spawn // used to spawn
  , path     = require('path') // for concatonating file names
  , net      = require('net') // used to talk over a domain socket
  , fs       = require('fs') // used to check for existing files
  ;

var streamlined = module.exports;

// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@  Moduel Globals  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

// map of pid to process
var $processes = {};

// map of process alias to pid
var $processes_alias = {};

// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@  Process Class  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

/**
 * Process class used to start a long running process and 
 * talk to it's stdin, stdout, and stderr via a socket.
 * @param {Object} options The javascript object used to 
 *                         configure this Process object.
 */
function Process(options) {
    // default options
    var opts = {
        exe: options.exe, // required
        args: [],         // defaults to an empty list
        cwd: '/',         // defaults to root directory 
        name: null,       // the name you wish to associate this process with. if not set, defaults to 
        socket: null
    };

    // set to custom option if set
    for (opt in opts) {
        if (opt in options) {
            opts[opt] = options[opt]
        }
    }

    // socket defaults to console.sock in the current directory
    if (!opts.socket) {
        opts.socket = path.join(opts.cwd, 'console.sock');
    }

    this.context = opts;
    this.context.pid = null;

    console.log('creating process with context:', this.context);

    this._connections = [];
    this._child = null;
    this._server = null;
}

/**
 * Starts the process with the context from the constructor.
 * @emits start Emitted at the end of the start function.
 */
Process.prototype.start = function(callback) {
    // if there already is a child, don't start
    if (this._child) {
        return;
    }

    this._child = spawn(this.context.exe, this.context.args, {
        cwd: this.context.cwd,
        stdio: 'pipe'
        // TODO: add environment support
    });

    this.context.pid = this._child.pid;

    this._setup();

    this.emit('start');

    callback && callback(this.context.pid, this.context.name);
};

/**
 * A helper function used to set up what happens when certain specific
 * events are fired by the _child object.
 */
Process.prototype._setup = function() {
    if (!this._child) {
        return;
    }
    
    var that = this;

    var multiplexer = function(name) {
        return function(data) {
            console.log(name + ': ' + data.toString().trim());
            for (var i = 0; i < that._connections.length; ++i) {
                that._connections[i].write(data);
            }
        };
    }

    this._child.stdout.on('data', multiplexer('stdout'));
    this._child.stderr.on('data', multiplexer('stderr'));

    this._child.on('close', function(code) {
        if (that._server) {
            that._server.close();
            that.emit('close');
            that.context.pid = null;
            that._child = null;
            that._server = null;
        }
    });

    this._server = net.createServer(function(connection) {
        console.log('client ' + connection.remoteAddress + ' has connected');
        connection.on('end', function() {
            var i = that._connections.indexOf(connection);
            that._connections.splice(i, 1);
            console.log('client ' + connection.remoteAddress + ' has exited');
        });

        // TODO: this should be on a readline basis
        connection.on('data', function(data) {
            that._child.stdin.write(data);
        });

        that._connections.push(connection);
    });

    fs.unlink(this.context.socket, function(err) {
        if (err && err.code != 'ENOENT') throw err;
        
        that._server.listen(that.context.socket, function() {
            console.log('the server for', that.context.exe, 'listening on socket', that.context.socket);
            that.emit('listen');
        });
    });
};

/**
 * Ends the process by sending a SIGINT signal. `callback` will be called
 * when the process has fully exited.
 * @param  {Function} callback Called when the process has fully exited.
 */
Process.prototype.end = function(callback) {
    var that = this;
    this._child.kill('SIGINT');
};

/**
 * A proxy for the `_child` event emitter object.
 * @param  {event} e The event to listen for.
 * @param  {Function} callback The callback to be called for the given event.
 */
Process.prototype.on = function(e, callback) {
    if (!this._child) {
        return;
    }

    this._child.on(e, callback);
};

/**
 * A proxy for the `_child` event emitter object.
 * @param {event} e The event to listen for.
 * @param {Function} callback The callback to be called for the given event.
 */
Process.prototype.once = function(e, callback) {
    if (!this._child) {
        return;
    }

    this._child.once(e, callback);
}

/**
 * A proxy for the `_child` event emitter object.
 * @param  {string} message The event to emit.
 */
Process.prototype.emit = function(message) {
    if (!this._child) {
        return;
    }

    this._child.emit(message);
}

// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@  Module Exports  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

streamlined.list = function() {
    return $processes;
};

streamlined.get = function(query) {
    if (!isNaN(query)) {
        return $processes[query];
    }

    return $processes[$processes_alias[query]];
}

streamlined.create = function(options, callback) {
    // TODO: if a process with the given name is already running, do we throw
    // an error or return the process belonging to that name?
    var p = new Process(options);
    p.start(function(pid, name) {
        $processes[pid] = p;
        if (name) {
            $processes_alias[name] = pid;
        }

        callback && callback(p);
    });

    p.once('end', function() {
        delete $processes[p.pid];
        if (p.name) {
            delete $processes_alias[p.name];
        }
    });

    return p;
};

streamlined.destroy = function(query) {
    var p = streamlined.get(query)
    p.end();
}

// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@  Server Wrapper  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

var main = function(argv) {

    // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    // @@  Imports  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

    var express     = require('express')
      , bodyParser  = require('body-parser')
      ;

    // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    // @@  App Setup  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

    var app = express();

    // configure app to use bodyParser()
    // this will let us get the data from a POST
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    var port = process.env.PORT || 8080; // set our port

    // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    // @@  Routes  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

    var router = express.Router(); // get an instance of the express Router

    router.route('/')
        .get(function(req, res) {
            res.write('streamlined\n');
            res.end();
        });

    router.route('/processes')
        .get(function(req, res) {
            var processes = streamlined.list();
            var data = {};
            for (var key in processes) {
                data[key] = processes[key].context;
            }
            res.json(data);
        })

        .post(function(req, res) {
            streamlined.create(req.body, function(process) {
                res.json(process.context);
            });
        });


    router.route('/processes/:pid')
        .get(function(req, res) {
            res.json(streamlined.get(req.params.pid).context);
        })

        .post(function(req, res) {

        })

        .delete(function(req, res) {
            streamlined.destroy(req.params.pid);
            res.status(204).end();
        });

    // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    // @@  Route Registration  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

    // all of our routes will be prefixed with /
    app.use('/', router);

    // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    // @@  Start Server  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

    app.listen(port);
    console.log('Magic happens on port ' + port);

}

// include guard
if (require.main === module) {
    main(require('minimist')(process.argv.slice(2)));
}
