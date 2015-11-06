#!/usr/bin/env node

var amqp = require('amqplib');
var courseHandler = require('./courseHandler')

var CONTENT_TYPE='application/json';
var serviceType = 'course';

// Process the received message
amqp.connect('amqp://localhost').then(function(conn) {
    process.once('SIGINT', function() { conn.close(); });
    return conn.createChannel().then(function(ch) {
        var ok = ch.assertQueue(serviceType, {durable: true});
        var ok = ok.then(function() {
            ch.prefetch(1);
            return ch.consume(serviceType, reply);
        });
        return ok.then(function() {
            console.log(' [x] Awaiting RPC requests');
        });

        function reply(msg) {
            courseHandler.handleMsg(msg,ch,sendBack);
        }
    });
}).then(null, console.warn);


function sendBack(msg, ch, response) {
    ch.sendToQueue(msg.properties.replyTo,
        new Buffer(JSON.stringify(response)),
        {correlationId: msg.properties.correlationId,
            contentType:CONTENT_TYPE});
    ch.ack(msg);
}