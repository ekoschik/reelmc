/*
    The mcconfig module must be able to validate all the files that constitute a minecraft server
    configuration. Key=value pairs must be validated against a particular server version. Server properties
    must be able to be stored as json, and serialized to the proper format on the server.
 */

var util = require('util');

function getDefault(in, default) {
    return in === undefined ? default : in;
}

function PropertyValue(options) {
    this.required = getDefault(options.required, false);
    this.default  = getDefault(options.default,  null);
    this.choices  = getDefault(options.choices,  null);
}

function BooleanValue(options) {
    PropertyValue.call(this, options);
}

BooleanValue.prototype.validate(arg) {
    return typeof arg === 'boolean';
}

function IntegerValue(options) {
    PropertyValue.call(this, options);
}

IntegerValue.prototype.validate = function(n) {
    return n === +n && n === (n|0);
}

function StringValue(options) {
    PropertyValue.call(this, options);
}

StringValue.prototype.validate = function(arg) {
    return typeof arg === 'string';
}

function EnumValue(args) {
    var options = {};
    var enums = [];
    for (int i = 0; i < arguments.length; ++i) {
        if (typeof arguments[i] === 'string') {
            enums.append(arguments[i]);
        } else {
            options = arguments[i];
            break;
        }
    }
    this.enums = enums;
    PropertyValue.call(this, options);
}

EnumValue.prototype.validate = function(arg) {
    return this.enums.indexOf(arg) !== -1;
}

function IPAddressValue(options) {
    PropertyValue.call(this, options);
}

IPAddressValue.prototype.validate = function(arg) {
    // validate if ip address
    return false;
}

function URIValue(options) {
    PropertyValue.call(this, options);
}

URIValue.prototype.validate(arg) {
    // validate that this is a uri
    return false;
}

var properties_1_8 = {
    generator_settings:   StringValue(),
    op_permission_level:  IntegerValue({default: 4, minValue: 1, maxValue: 4}),
    level_name:           StringValue({default: 'world'}),
    enable_query:         BooleanValue({default: false}),
    allow_flight:         BooleanValue({default: false}),
    announce_player_achievements: BooleanValue({default: true}),
    server_port:          IntegerValue({default: 25565}),
    level_type:           EnumValue('DEFAULT', 'FLAT', 'LARGEBIOMES', 'AMPLIFIED', 'CUSTOMIZED', {default: 'DEFAULT', serialize: 'string'}),
    enable_rcon:          BooleanValue({default: false}),
    level_seed:           StringValue({default: '', quoted: false})
    force_gamemode:       BooleanValue({default: false}),
    server_ip:            IPAddressValue(),
    max_build_height:     IntegerValue({default: 256}),
    spawn_npcs:           BooleanValue({default: true}),
    white_list:           BooleanValue({default: false}),
    spawn_animals:        BooleanValue({default: true}),
    hardcore:             BooleanValue({default: false}),
    snooper_enabled:      BooleanValue({default: true}),
    online_mode:          BooleanValue({default: true}),
    resource_pack:        URIValue(),
    pvp:                  BooleanValue({default: true}),
    difficulty:           EnumValue('PEACEFUL', 'EASY', 'NORMAL', 'HARD', {default: 'EASY', serialize: 'index'}),
    enable_command_block: BooleanValue({default: false}),
    gamemode:             EnumValue('SURVIVAL', 'CREATIVE', 'ADVENTURE', 'SPECTATOR', {default: 'SURVIVAL', serialize: 'index'}),
    player_idle_timeout:  IntegerValue({default: 0}),
    max_players:          IntegerValue({default: 20}),
    spawn_monsters:       BooleanValue({default: true}),
    generate_structures:  BooleanValue({default: true}),
    view_distance:        IntegerValue({default: 10}),
    motd:                 StringValue({default: "A Minecraft Server"})
};


var SERVER_PROPERTIES;
var BANNED_PLAYERS;
var BANNED_IPS;
var WHITELIST;

var Config();
