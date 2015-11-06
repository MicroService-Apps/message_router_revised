#!/usr/bin/env node
var amqp = require('amqp');
var connection = amqp.createConnection({host:'127.0.0.1'});
var rpcLib = require('./amqprpc');
var rpc = new (rpcLib)(connection);
var studentService = 'student';
var courseService = 'course';

exports.execute = function(req, res) {
    var method = req.body.method;

    switch(method) {
        case 'create':
            handleCreate(req, res);

            break;
        case 'read':
            handleRead(req, res);

            break;
        case 'update':
            handleUpdate(req, res);

            break;
        case 'delete':
            handleDelete(req, res);

            break;
        case 'config':
            handleConfig(req, res);

            break;
        case 'revert':
            handleCreate(req, res);

            break;
        default:
            res.send('No such method');

            break;
    }
}

// handle create method
function handleCreate(req, res) {
    var body = req.body;

    rpcLib.sendTo(rpc, courseService, body, function response(err, response){
        if(err) {
            if(err.code == 'ECONNRESET') {
                //handle the reponse timeout
                console.error('response timeout');
            }
            else
                console.error(err);

            // send back error info
            res.send('error occurred when create course service');
        }
        else {
            console.log("response", response);
            res.send(response);
        }
    });
}

// handle read method
function handleRead(req, res) {
    var body = req.body;

    rpcLib.sendTo(rpc, courseService, body, function response(err, response){
        if(err) {
            if(err.code == 'ECONNRESET') {
                //handle the reponse timeout
                console.error('response timeout');
            }
            else
                console.error(err);

            // send back error info
            res.send('error occurred when read course service');
        }
        else {
            console.log("response", response);
            res.send(response);
        }
    });
}

// handle update method
function handleUpdate(req, res) {
    var body = req.body;

    // send update message to course first and get response
    rpcLib.sendTo(rpc, courseService, body, function response(err, response){
        if(err) {
            if(err.code == 'ECONNRESET') {
                //handle the reponse timeout
                console.error('response timeout');
            }
            else
                console.error(err);

            // send back error info
            res.send('error occurred when updating course service');
        }
        else {
            console.log("response", response);

            var status = response.status;
            if(status == 'succeed') {
                // try to update student if student reply succeed
                updateStudent(body);
            } else {
                res.send(response);
            }
        }
    });

    // If updating course correctly, send update message to student
    function updateStudent(body) {
        var message = {
            'method': 'update',
            'uni': body.student,
            'name': '',
            'instructor': '',
            'courseAction': body.studentAction,
            'course': body.cid
        };

        rpcLib.sendTo(rpc, studentService, message, function response(err, response){
            if(err) {
                if(err.code == 'ECONNRESET') {
                    //handle the reponse timeout
                    console.error('response timeout');
                }
                else
                    console.error('error occurred when updating student');

                // revert action in course when error occurs
                revertCourse();
                // send back error message
                res.send('error occurred when updating student service');
            }
            else {
                var status = response.status;
                if(status == 'failed') {
                    // revert action in student when error occurs
                    revertCourse();
                }

                console.log("response", response);
                res.send(response);
            }
        });
    }

    function revertCourse() {
        var revertMessage = {
            'method': 'revert'
        };

        rpcLib.sendTo(rpc, courseService, revertMessage, function response(err, response){
            if(err) {
                if(err.code == 'ECONNRESET') {
                    //handle the reponse timeout
                    console.error('response timeout');
                }
                else
                    console.error(err);

                res.send('error occurred when revert course service');
            }
            else {
                console.log("response", response);
            }
        });
    }
}

// handle delete method
function handleDelete(req, res) {
    var body = req.body;

    rpcLib.sendTo(rpc, courseService, body, function response(err, response){
        if(err) {
            if(err.code == 'ECONNRESET') {
                //handle the reponse timeout
                console.error('response timeout');
            }
            else
                console.error();

            // send back error info
            res.send('error occurred when deleting course service');
        }
        else {
            console.log("response", response);

            var status = response.status;
            if(status == 'succeed') {
                // delete course in student service
                deleteCourseInStudent(body);
            } else {
                res.send(response);
            }
        }
    });


    // delete course in student service
    function deleteCourseInStudent(body) {
        var message = {
            'method': 'update',
            'uni': '#',
            'name': '',
            'courseAction': 'Del',
            'course': body.cid,
        };

        rpcLib.sendTo(rpc, studentService, message, function response(err, response){
            if(err) {
                if(err.code == 'ECONNRESET') {
                    //handle the reponse timeout
                    console.error('response timeout');
                }
                else
                    console.error(error);

                // send back error info
                res.send('error occurred when deleting student service');
            }
            else {
                console.log("response", response);
                res.send(response);
            }
        });
    }
}

// handle config method
function handleConfig(req, res) {
    var body = req.body;

    rpcLib.sendTo(rpc, courseService, body, function response(err, response){
        if(err) {
            if(err.code == 'ECONNRESET') {
                //handle the reponse timeout
                console.error('response timeout');
            }
            else
                console.error(err);
        }
        else {
            console.log("response", response);
            res.send(response);
        }
    });
}