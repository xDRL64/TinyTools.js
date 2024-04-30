const client = require('./client');
const server = require('./server');

const client_address = `http://${client.ip}:${client.port}`;
const server_port = server.port;
const server_storage = server.storage;
const server_mime = server.mime;

module.exports = {client_address, server_port, server_storage, server_mime};