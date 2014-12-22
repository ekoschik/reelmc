#!/usr/bin/env node

/**
 * TODO
 *
 * replace all console.logs with bunyan logging
 * switch from express to restify
 */

/*******************************************************************************
 *  Imports                                                                    *
 ******************************************************************************/
var readline  = require('readline')
  , events    = require('events') // used to emit events
  , spawn     = require('child_process').spawn // used to spawn
  , path      = require('path') // for concatonating file names
  , net       = require('net') // used to talk over a domain socket
  , tls       = require('tls') // used to talk over a domain socket
  , fs        = require('fs') // used to check for existing files
  ;

var log = require('./lib/logger');

/*******************************************************************************
 *  Module Globals                                                             *
 ******************************************************************************/

var APPNAME = 'streamlined';
var USE_SECURE_CONNECTIONS = true;
var SERVER_TYPE = USE_SECURE_CONNECTIONS ? tls : net;

/** The variable this module's closure will be references as. */
var streamlined = module.exports;

/** A map of pid -> process object. */
var $processes = {};

/** A map of process alias -> pid. */
var $processes_alias = {};

/******************************************************************************
 * Process class used to start a long running process and                     *
 * talk to its stdin, stdout, and stderr via a socket.                        *
 *                                                                            *
 * @constructor                                                               *
 * @param {Object} options The javascript object used to                      *
 *                         configure this Process object.                     *
 ******************************************************************************/
streamlined.Process = function(options) {
    // default options
    var opts = {
        exe: options.exe, // required
        args: [],         // defaults to an empty list
        cwd: '/tmp',      // defaults to root directory 
        name: null,       // the name you wish to associate this process with. if not set, defaults to 
        socket: options.socketName
    };

    // set to custom option if set
    for (opt in opts) {
        if (options.hasOwnProperty(opt)) {
            opts[opt] = options[opt]
        }
    }

    // socket defaults to console.sock in the current directory
    if (!opts.socket) {
        opts.socket = path.resolve(opts.cwd, 'console.sock');
    }

    this.context = opts;
    this.context.pid = null;

    this._connections = [];
    this._child = null;
    this._server = null;
}


streamlined.Process.prototype = {

    /******************************************************************************
     * Starts the process with the context from the constructor.                  *
     ******************************************************************************/
    start: function(callback) {
        // if there already is a child, don't start
        if (this._child) {
            return;
        }

        this._child = spawn(this.context.exe, this.context.args, {
            cwd: this.context.cwd,
            stdio: 'pipe'
            // TODO: add environment support
            // TODO: add chroot support
        });

        this.context.pid = this._child.pid;
        this._setup();

        var that = this;

        callback && callback(this.context.pid, this.context.name);
    },


    /*******************************************************************************
     * Ends the process by sending a SIGINT signal. `callback` will be called     *
     * when the process has fully exited.                                         *
     * @param  {Function} callback Called when the process has fully exited.      *
     ******************************************************************************/
    end: function(callback) {
        var that = this;
        this._child.kill('SIGINT');
        callback && callback();
    },

    getName: function() {
        if (this.context.name) {
            return this.context.name;
        }
        return this.context.exe + '[' + (this.context.pid ? this.context.pid : 'terminated') + ']';
    },

    /******************************************************************************
     * A proxy for the `_child` event emitter object.                             *
     * @param  {event} e The event to listen for.                                 *
     * @param  {Function} callback The callback to be called for the given event. *
     ******************************************************************************/
    on: function(e, callback) {
        this._child && this._child.on(e, callback);
        log.info('the child is %s', typeof this._child);
    },

    /******************************************************************************
     * A proxy for the `_child` event emitter object.                             *
     * @param {event} e The event to listen for.                                  *
     * @param {Function} callback The callback to be called for the given event.  *
     ******************************************************************************/
    once: function(e, callback) {
        this._child && this._child.once(e, callback);
    },

    /******************************************************************************
     * A proxy for the `_child` event emitter object.                             *
     * @param  {string} message The event to emit.                                *
     ******************************************************************************/
    emit: function(message) {
        this._child && this._child.emit(message);
    },

    /******************************************************************************
     * Send data to the stdin pipe of the process.                                *
     * @param  {string} message The message to send.                              *
     ******************************************************************************/
    command: function(message) {
        this._child.stdin.write(message);
    },

    /******************************************************************************
     * A helper function used to set up what happens when certain specific        *
     * events are fired by the _child object.                                     *
     ******************************************************************************/
    _setup: function() {
        if (!this._child) {
            return;
        }
        
        var that = this;

        function multiplexer(name) {
            return function(data) {
                log.debug('%s: %s', name, data.toString().trim());
                that._connections.forEach(function(connection) {
                    connection.write(data);
                });
            };
        }

        this._child.stdout.on('data', multiplexer('stdout'));
        this._child.stderr.on('data', multiplexer('stderr'));

        this._child.on('close', this._handleClose.bind(this));

        this._createServer();
        this._startServer();
    },

    _createServer: function() {
        var that = this;
        this._server = net.createServer(function(connection) {
            log.info('client has connected to process %s', that.getName());
            connection.on('end', function() {
                var i = that._connections.indexOf(connection);
                that._connections.splice(i, 1);
                log.info('client has disconnected from process %s', that.getName());
            });

            connection.on('data', that.command.bind(that));
            that._connections.push(connection);
        });
    },

    _startServer: function() {
        var that = this;
        fs.unlink(this.context.socket, function(err) {
            // TODO: check if the socket is already in use
            if (err && err.code != 'ENOENT') throw err;
            
            that._server.listen(that.context.socket, function() {
                log.info({process: that.context}, 'the server for %s is now listening on socket %s', that.getName(), that.context.socket);
            });
        });
    },

    _handleClose: function(code) {
        log.info({process: this.context}, 'process %s exiting with code %s', this.getName(), code);
        if (this._server) {
            this._server.close();
            this.context.pid = null;
            this._closeConnections();
            fs.unlink(this.context.socket);
            //this._child = null;
            this._server = null;
        }
    },

    _closeConnections: function() {
        this._connections.forEach(function(connection) {
            connection.write('goodbye\n');
            connection.end();
        });
        this._connections = [];
    }

};

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
};

streamlined.create = function(options, callback) {
    // TODO: if a process with the given name is already running, do we throw
    // an error or return the process belonging to that name?
    log.info({options: options}, 'creating a new processes "%s"', options.exe);
    var p = new streamlined.Process(options);
    p.start(function(pid, name) {
        $processes[pid] = p;
        if (name) {
            $processes_alias[name] = pid;
        }

        callback && callback(p);
    });

    p.on('exit', function() {
        log.info({process: $processes[p.pid].context}, 'process ending, removing from process map');
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

    var restify = require('restify');


    // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    // @@  Server Setup  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

    var server = restify.createServer({
        name: APPNAME,
        log: log
    });

    server.pre(restify.pre.userAgentConnection());
    server.use(restify.acceptParser(server.acceptable));
    server.use(restify.CORS());
    server.use(restify.gzipResponse());
    server.use(restify.bodyParser());
    server.use(restify.requestLogger());

    server.pre(function(req, res, next) {
        //var resKeys = Object.keys(req);
        //var reqKeys = Object.keys(res);
        //req.log.info({req: req, resKeys: resKeys, reqKeys: reqKeys}, 'got a request from client %s', req.connection.remoteAddress);
        req.log.info({req: req}, 'got a request from client %s', req.connection.remoteAddress);
        next();
    });

    var port = process.env.PORT || 8080; // set our port

    server.get('/', function(req, res) {
        res.write('streamlined\n');
        res.end();
    });

    function getProcesses(req, res) {
        var processes = streamlined.list();
        var data = {};
        for (var key in processes) {
            data[key] = processes[key].context;
        }
        res.json(data);
    }

    server.get('/processes', getProcesses);
    server.head('/processes', getProcesses);
    
    server.post('/processes', function(req, res) {
        req.log.info({params: req.params}, 'creating a new process');
        streamlined.create(req.params, function(process) {
            res.json(process.context);
        });
    });


    function getProcess(req, res) {
        res.json(streamlined.get(req.params.pid).context);
    }

    server.get('/processes/:pid', getProcess);
    server.head('/processes/:pid', getProcess);

    server.post('/processes/:pid', function(req, res) {
        res.send('unimplemented').end();
    });

    server.del('/processes/:pid', function(req, res) {
        streamlined.destroy(req.params.pid);
        res.status(204).end();
    });

    server.listen(port, function() {
        log.info('the magic happens on port %d', port);
    });
}

/**
 * A nifty wrapper around createServer that sets up the events on the incoming connections.
 */
function createServer(options, onConnect, eventMap) {
    return SERVER_TYPE.createServer(options, function(connection) {
        for (k in eventMap) {
            connection.on(k, eventMap[k].bind(connection));
        }
        onConnect.apply(connection);
    });
}


// include guard
if (require.main === module) {
    main(process.argv.slice(2));
}
