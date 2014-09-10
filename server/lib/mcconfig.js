#!/usr/bin/env node

/*
    The mcconfig module must be able to validate all the files that constitute a minecraft server
    configuration. Key=value pairs must be validated against a particular server version. Server properties
    must be able to be stored as json, and serialized to the proper format on the server.
 */

 var util = require('util');


function PropertyValue(options) {
    this.default = options.default || null;
}

function BooleanValue(options) {
    PropertyValue.call(this, options);
}

var properties_1_7_4 = {
    generator_settings: null,
    op_permission_level: 4,
    level_name: "world",
    enable_query: false,
    allow_flight: false,
    announce_player_achievements: true,
    server_port: 25565,
    level_type: "DEFAULT",
    enable_rcon: false,
    level_seed: null,
    force_gamemode: false,
    server_ip: null,
    max_build_height: 256,
    spawn_npcs: true,
    white_list: false,
    spawn_animals: true,
    hardcore: false,
    snooper_enabled: true,
    online_mode: true,
    resource_pack: null,
    pvp: true,
    difficulty: 1,
    enable_command_block: false,
    gamemode: 0,
    player_idle_timeout: 0,
    max_players: 20,
    spawn_monsters: true,
    generate_structures: true,
    view_distance: 10,
    motd: "A Minecraft Server"
};


var SERVER_PROPERTIES;
var BANNED_PLAYERS;
var BANNED_IPS;
var WHITELIST;

var Config();
