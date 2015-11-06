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
            handleConfig(req, res);

            break;
        default:
            res.send('No such method');

            break;
    }
}

// handle create method
function handleCreate(req, res) {
    var body = req.body;

    rpcLib.sendTo(rpc, studentService, body, function response(err, response){
        if(err) {
            if(err.code == 'ECONNRESET') {
                //handle the reponse timeout
                console.error('response timeout');
            }
            else
                console.error(err);

            // send back error info
            res.send('error occurred when create student service');
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

    rpcLib.sendTo(rpc, studentService, body, function response(err, response){
        if(err) {
            if(err.code == 'ECONNRESET') {
                //handle the reponse timeout
                console.error('response timeout');
            }
            else
                console.error(err);

            // send back error info
            res.send('error occurred when read student service');
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

    // send update message to student first and get response
    rpcLib.sendTo(rpc, studentService, body, function response(err, response){
        if(err) {
            if(err.code == 'ECONNRESET') {
                //handle the reponse timeout
                console.error('response timeout');
            }
            else
                console.error(err);

            // send back error info
            res.send('error occurred when updating student service');
        }
        else {
            console.log("response", response);

            var status = response.status;
            var courseAction = response.courseAction;
            if(status == 'succeed' && courseAction != '') {
                // try to update course if student reply succeed
                updateCourse(body);
            } else {
                res.send(response);
            }
        }
    });

    // If updating student correctly, send update message to course
    function updateCourse(body) {
        var message = {
            'method': 'update',
            'cid': body.course,
            'name': '',
            'instructor': '',
            'studentAction': body.courseAction,
            'student': body.uni
        };

        rpcLib.sendTo(rpc, courseService, message, function response(err, response){
            if(err) {
                if(err.code == 'ECONNRESET') {
                    //handle the reponse timeout
                    console.error('response timeout');
                }
                else
                    console.error('error occurred when updating course');

                // revert action in student when error occurs
                revertStudent();
                // send back error message
                res.send('error occurred when updating course service');
            }
            else {
                var status = response.status;
                if(status == 'failed') {
                    // revert action in student when error occurs
                    revertStudent();
                }

                console.log("response", response);
                res.send(response);
            }
        });
    }

    function revertStudent() {
        var revertMessage = {
            'method': 'revert'
        };

        rpcLib.sendTo(rpc, studentService, revertMessage, function response(err, response){
            if(err) {
                if(err.code == 'ECONNRESET') {
                    //handle the reponse timeout
                    console.error('response timeout');
                }
                else
                    console.error(err);

                res.send('error occurred when revert student service');
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

    rpcLib.sendTo(rpc, studentService, body, function response(err, response){
        if(err) {
            if(err.code == 'ECONNRESET') {
                //handle the reponse timeout
                console.error('response timeout');
            }
            else
                console.error();

            // send back error info
            res.send('error occurred when deleting student service');
        }
        else {
            console.log("response", response);

            var status = response.status;
            if(status == 'succeed') {
                // delete student in course service
                deleteStudentInCourse(body);
            } else {
                res.send(response);
            }
        }
    });


    // delete student in course service
    function deleteStudentInCourse(body) {
        var message = {
            'method': 'update',
            'cid': '#',
            'name': '',
            'instructor': '',
            'studentAction': 'Del',
            'student': body.uni
        };

        rpcLib.sendTo(rpc, courseService, message, function response(err, response){
            if(err) {
                if(err.code == 'ECONNRESET') {
                    //handle the reponse timeout
                    console.error('response timeout');
                }
                else
                    console.error(error);

                // send back error info
                res.send('error occurred when deleting course service');
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

    rpcLib.sendTo(rpc, studentService, body, function response(err, response){
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