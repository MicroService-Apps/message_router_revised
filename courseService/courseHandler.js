/**
 * Created by Wayne on 10/26/15.
 */


var fs = require('fs');
var path = require('path');
var lr = require("line-reader");


exports.handleMsg = function (message, ch, Callback){
    var msg = JSON.parse(message.content);
    console.log(msg);
    var db = require('./../util/mongo.js');
    var course = db.collection('course');
    var response = new Object();
    switch (msg["method"])
    {
        case 'create':
            handleCreate(msg,message,ch,course,Callback);
            break;

        case 'update':
            if(msg["cid"]=="#"){
                if(msg["studentAction"]=="Del"){
                    course.find({StudentsEnrolled: msg["student"]}).toArray(function(err,result) {
                        if(err){
                            response.status = "failed";
                            response.message = err.toSring();
                            Callback(message,ch,response);
                        }
                        if(result.length>0){
                            var str = "";
                            var count = 0;
                            result.forEach(function(resultCourse){
                                var student = resultCourse.StudentsEnrolled;
                                student.splice(student.indexOf(msg["student"]),1);
                                course.update({Cid: resultCourse["Cid"]},{'$set':{StudentsEnrolled: student}},function(err,res){
                                    if(!err) {
                                        str = str+" "+resultCourse["Cid"];
                                        count++;
                                        if(count == result.length){
                                            response.status = "succeed";
                                            response.message = "Student "+msg["student"]+" is deleted and deleted from all Courses.";
                                            logmsg(JSON.stringify(msg)+"\n");
                                            Callback(message,ch,response);
                                        }
                                    }
                                });
                            });
                        }
                        else{
                            response.status = "succeed";
                            response.message = "No course is enrolled by student "+msg["student"];
                            Callback(message,ch,response);
                        }
                    });
                }
                else{
                    response.status = "failed";
                    response.message = "No such Student Action";
                    Callback(message,ch,response);
                }
            } else{
                handleUpdate(msg,message,ch,course,Callback);
            }
            break;

        case 'read':
            var query = new Object();
            if(msg["name"]) query.Name = msg["name"];
            if(msg["cid"]) query.Cid = msg["cid"];
            if(msg["instructor"]) query.Instructor = msg["instructor"];
            if(msg["student"]) query.StudentsEnrolled = msg["student"];

            if(msg["cid"] == "#") {
                course.find({}, {Cid: true}).toArray(function(err, results) {
                    response.status = "succeed";
                    response.message = "list all courses cid";
                    response.body = results;

                    logmsg(JSON.stringify(msg) + "\n");
                    Callback(message, ch, response);
                });
            } else {
                course.count({Cid: msg["cid"]}, function (err, count) {
                    if (count > 0) {
                        course.find(query).toArray(function (err, result) {
                            if (err) {
                                response.status = "failed";
                                response.message = err.toSring();
                                Callback(message, ch, response);
                            }
                            else {
                                response.status = "succeed";
                                response.message = count + " Course found";
                                response.body = result;
                                logmsg(JSON.stringify(msg) + "\n");
                                Callback(message, ch, response);
                            }
                        });
                    }
                    else {
                        response.status = "failed";
                        response.message = "no course match your request";
                        logmsg(JSON.stringify(msg) + "\n");
                        Callback(message, ch, response);
                    }
                });
            }

            break;

        case 'delete':
            handleDelete(msg,message,ch,course,Callback);
            break;


        case 'revert':
            lr.eachLine(path.join(path.dirname(__dirname),'log/course.log'), function(line, last) {
                if(last){
                    console.log(line);

                    var command = JSON.parse(line);
                    switch (command["method"]){
                        case 'create':
                            command["method"] = "delete";
                            handleDelete(command,message,ch,course,Callback);
                            break;
                        case 'delete':
                            command["method"] = "create";
                            handleCreate(command,message,ch,course,Callback);
                            break;
                        case 'update':
                            if(command["name"]){
                                command["name"]=command["oldname"];
                                handleUpdate(command,message,ch,course,Callback);
                            } else if(command['instructor']) {
                                command["instructor"]=command["oldinstructor"];
                                handleUpdate(command,message,ch,course,Callback);
                            } else if(command["student"]){
                                if(command["studentAction"]=="Add"){
                                    command["studentAction"]="Del";
                                    handleUpdate(command,message,ch,course,Callback);
                                }
                                else if(command["studentAction"]=="Del"){
                                    command["studentAction"]="Add";
                                    handleUpdate(command,message,ch,course,Callback);
                                }
                            }
                            break;

                        default :
                            handleDefaultRevert(message, ch, Callback);
                            break;
                    }
                }

                //if (/* done */) {
                //    return false; // stop reading
                //}
            });
            break;

        case 'config':
            break;
        default :
            break;

    }

    if(response.length==0){
        response.status = "unknown";
        response.message = "unknown error";
        Callback(message,ch,response);
    }

    //return response;
};

function handleCreate(msg,message,ch,course,Callback){
    var response = new Object();
    course.count({Cid: msg["cid"]}, function(err, count) {
        if(count==0){
            course.insert({Name: msg["name"],Cid: msg["cid"],Instructor: msg["instructor"],StudentsEnrolled: msg["student"].split(",")},function(err, result) {
                if (err) {
                    response.status = "failed";
                    response.message = err.toSring();
                    Callback(message,ch,response);
                }
                if (result){
                    response.status = "succeed";
                    response.message = "course "+msg["name"]+" added";
                    logmsg(JSON.stringify(msg)+"\n");
                    Callback(message,ch,response);

                }
            });
        }
        else{
            response.status = "failed";
            response.message = "Cid existed";
            Callback(message,ch,response);
        }
    });
}


function handleUpdate(msg,message,ch,course,Callback){
    var response = new Object();

    course.findOne({Cid: msg["cid"]}, function(err, result) {
        if (err) {
            response.status = "failed";
            response.message = err.toSring();
            Callback(message,ch,response);
        }
        if(result)
        {
            if(msg["name"]){
                course.update({Cid: msg["cid"]},{'$set':{Name: msg["name"]}},function(err,res){
                    if(err){
                        response.status = "failed";
                        response.message = err.toSring();
                        Callback(message,ch,response);
                    }
                    else {
                        response.status = "succeed";
                        response.message = "course "+msg["cid"]+"'s name has been changed to "+msg["name"];
                        msg["oldname"] = result["Name"];
                        logmsg(JSON.stringify(msg)+"\n");
                        Callback(message,ch,response);
                    }

                });
            } else if(msg["instructor"]){
                course.update({Cid: msg["cid"]},{'$set':{Instructor: msg["instructor"]}},function(err,res){
                    if(err){
                        response.status = "failed";
                        response.message = err.toSring();
                        Callback(message,ch,response);
                    }
                    else {
                        response.status = "succeed";
                        response.message = "course "+msg["cid"]+"'s instructor has been changed to "+msg["instructor"];
                        msg["oldinstructor"] = result["Instructor"];
                        logmsg(JSON.stringify(msg)+"\n");
                        Callback(message,ch,response);
                    }
                });
            } else if(msg["student"]){
                if(msg["studentAction"]=="Add"){
                    var student = result.StudentsEnrolled;
                    if(student.indexOf(msg["student"])==-1){
                        student.push(msg["student"]);
                        course.update({Cid: msg["cid"]},{'$set':{StudentsEnrolled: student}},function(err,result){
                            if(err){
                                response.status = "failed";
                                response.message = err.toSring();
                                Callback(message,ch,response);
                            }
                            if(result){
                                response.status = "succeed";
                                response.message = "student "+msg["student"]+" is added to course(Cid:"+msg["cid"]+").";
                                logmsg(JSON.stringify(msg)+"\n");
                                Callback(message,ch,response);
                            }
                        });
                    }
                    else{
                        response.status = "failed";
                        response.message = "student already enroll course(Cid:"+msg["cid"]+").";
                        Callback(message,ch,response);
                    }

                }
                else if(msg["studentAction"]=="Del"){
                    var student = result.StudentsEnrolled;
                    if(student.indexOf(msg["student"])!=-1){
                        student.splice(student.indexOf(msg["student"]),1);
                        course.update({Cid: msg["cid"]},{'$set':{StudentsEnrolled: student}},function(err,result){
                            if(err) {
                                response.status = "failed";
                                response.message = err.toSring();
                                Callback(message,ch,response);
                            }
                            if(result){
                                response.status = "succeed";
                                response.message = "student "+msg["student"]+" is deleted from Course(Cid:"+msg["cid"]+").";
                                logmsg(JSON.stringify(msg)+"\n");
                                Callback(message,ch,response);
                            }
                        });
                    }
                    else{
                        response.status = "failed";
                        response.message = "Course("+msg["cid"]+") are not enrolled by this student.";
                        Callback(message,ch,response);
                    }

                }
                else{
                    response.status = "failed";
                    response.message = "No such Student Action";
                    Callback(message,ch,response);
                }
            }

        }
        else{
            response.status = "failed";
            response.message = "Cid "+msg["cid"]+" does not exist.";
            Callback(message,ch,response);
        }

    });

}

function handleDelete(msg,message,ch,course,Callback){
    var response = new Object();
    course.findOne({Cid: msg["cid"]}, function(err, result) {
        if(result){
            course.remove({Cid: msg["cid"]},function(err, res) {
                if (err) {
                    response.status = "failed";
                    response.message = err.toSring();
                    Callback(message,ch,response);
                }
                else{
                    var tmp = new Object();
                    tmp.method = "delete";
                    tmp.name = result["Name"];
                    tmp.cid = result["Cid"];
                    tmp.instructor = result["Instructor"];
                    tmp.student = result["StudentsEnrolled"].join();
                    response.status = "succeed";
                    response.message = "course "+msg["cid"]+" removed";
                    logmsg(JSON.stringify(tmp)+"\n");
                    Callback(message,ch,response);
                }
            });
        }
        else{
            response.status = "failed";
            response.message = "no course match your request";
            Callback(message,ch,response);
        }
    });
}


function logmsg(string){
    var logpath = path.join(path.dirname(__dirname),'log/course.log');

    fs.appendFile(logpath, string, function (err) {
        if (err) throw err;
    });

}

// handle the default revert if can't find revert
function handleDefaultRevert(message,ch, Callback) {
    var response = new Object();
    response.status = "failed";
    response.message = "can't revert the last operation";

    Callback(message,ch,response);
}



