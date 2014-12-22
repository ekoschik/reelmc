var utils = require('utils');
var events = require('events');
var path = require('path');
var _ = require('underscore');
var child_process = require('child_process');
var split = require('split');


/**
 * Create a new Minecraft instance.
 * @constructor
 */
function Game(options, callback){
    this.options = _.extend({}, this.defaultOptions, options);
    this.players = {};
    this.running = false;
    this.starting = false;
    events.EventEmitter.call(this);
};

util.inherits(Game, events.EventEmitter);

Game.prototype.defaultOptions = {
    java: '/usr/bin/java',
    javaOpts: ['-Xmx1024M','-Xms1024M'],
    extraOpts: [],
};

/**
 * Starts the minecraft server.
 * @return number The pid of the server that was started.
 */
Game.prototype.start = function(){
    var self = this;

    if (self.starting || self.running) {
        return self.child.pid;
    }

    var command = self.options.java;
    var commandArgs = []
        .concat(['-jar', path.resolve(process.cwd(), self.options.server)])
        .concat(self.options.javaOpts)
        .concat(self.options.extraOpts);
    var processOptions = {cwd: self.options.world};
    self.starting = true;
    var child = child_process.spawn(command, commandArgs, processOptions);
    self.emit('spawn', child.pid);
    self.child = child;

    child.on('error', function(err){
        self.starting = false;
        self.running = false;
        self.emit('error', err);
    });

    child.on('close', function(code, signal) {
        if (self.running) {
            self.emit('stop', code, signal);
        }
        else {
            self.emit('error', new Error('Failed to start server with args:', commandArgs));
        }

        self.running = false;
        self.starting = false;
    });

    child.stdout.pipe(split()).on('data', function(line) {
        self.handleLine(line)
    });
};

var messageParser = /^\[(\d+):(\d+):(\d+)\]\s+\[([^\/\]]+)\/([^\]]+)\]:\s(.*)$/;
var specialMessageHandlers = {
    start: {
        regex: /^Done \(([\d\.]+)s\)\! For help, type "help" or "\?"/,
        callback: function(game, message, match){
            game.running = true;
            game.players = {};
            game.emit('start', parseFloat(match[1]));
        }
    },
    joined: {
        regex: /^(\S+) joined the game/,
        callback: function(game, message, match){
            var player = match[1];
            // TOOD: get the uuid of the player here (or load playerCache.json)
            game.players[player] = '';
            game.emit('joined', player);
        }
    },
    left: {
        regex: /^(\S+) left the game/,
        callback: function(game, message, match){
            var player = match[1];
            delete game.players[player];
            game.emit('left', player);
        }
    },
    lostConnection: {
        regex: /^(\S+) lost connection/,
        callback: function(game, message, match){
            var player = match[1];
            delete game.players[player];
            game.emit('lostConnection', player);
            game.emit('left', player);
        }
    },
    said: {
        regex: /^<([^>]+)> (.*)$/,
        callback: function(game, message, match){
            var player = match[1];
            var said = match[2];
            game.emit('said', player, said);
        }
    },
    action: {
        regex: /^\* (\S+) (.*)$/,
        callback: function(game, message, match){
            var player = match[1];
            var action = match[2];
            game.emit('action', player, action);
        }
    },
    earnedAchievement: {
        regex: /^(\S+) has just earned the achievement \[([^\]]+)\]/,
        callback: function(game, message, match){
            var player = match[1];
            var achievement = match[2];
            game.players = game.players.concat([player]);
            game.emit('earnedAchievement', player, achievement);
        }
    },
    died: {
        regex: /^(\S+) (.*)$/,
        callback: function(game, message, match){
            var player = match[1];
            var cause = match[2];
            if (_.indexOf(game.players, player) != -1) {
                if (!specialMessageHandlers.joined.regex.exec(message.rawBody) &&
                        !specialMessageHandlers.lostConnection.regex.exec(message.rawBody) &&
                        !specialMessageHandlers.left.regex.exec(message.rawBody) &&
                        !specialMessageHandlers.earnedAchievement.regex.exec(message.rawBody)) {
                    game.emit('died', player, cause);
                }
                return true;
            }
            else{
                return false;
            }
        }
    },
};

Game.prototype.handleLine = function(line){
    var self = this;
    var match = messageParser.exec(line);
    var message;
    var knownMessage = false;
    if (match) {
        message = {
            time: {
                      hours: match[1],
                      minutes: match[2],
                      seconds: match[3],
                  },
            source: match[4],
            level: match[5],
            rawBody: match[6],
            rawMessage: line
        };
        self.emit('message', message);
        _.values(specialMessageHandlers).forEach(function(handler){
            var match = handler.regex.exec(message.rawBody);
            var handled;
            if (match) {
                handled = handler.callback(self, message, match);
                if (!(handled == false)) {
                    knownMessage = true;
                }
            }
        });
        if (!knownMessage) {
            self.emit('unknownMessage', message);
        }
    }
    else {
        self.emit('unknownLine', line);
    }

    self.emit('raw', line);
};

Game.prototype.sendCommand = function(command, callback) {
    var self = this;
    if ((!self.running || !self.child)) {
        var error = new Error('not running');
        process.nextTick(function() { callback(error); });
        self.emit('error', error);
        return;
    }

    if (command.indexOf('\n', command.length - 1) === -1) {
        command += '\n';
    }
    self.child.stdin.write(command, 'UTF8', callback);
};

Game.prototype.stop = function(callback){
    var self = this;
    if (callback) {
        self.once('stop', callback);
    }
    self.sendCommand('stop');
};

module.exports.Game = Game;
