/**
 * Created by Wayne on 10/24/15.
 */


var fs = require('fs');
var path = require('path');
var lr = require("line-reader");


exports.handleMsg = function (message, ch, Callback){
    var msg = JSON.parse(message.content);
    console.log(msg);
    var db = require('./../util/mongo.js');
    var student = db.collection('student');
    var response = new Object();
    switch (msg["method"])
    {
        case 'create':
            handleCreate(msg,message,ch,student,Callback);
            break;

        case 'update':
            if(msg["uni"]=="#"){
                if(msg["courseAction"]=="Del"){
                    student.find({CourseEnrolled: msg["course"]}).toArray(function(err,result) {
                        if(err){
                            response.status = "failed";
                            response.message = err.toSring();
                            Callback(message,ch,response);
                        }
                        if(result.length>0){
                            var str = "";
                            var count = 0;
                            result.forEach(function(resultStudent){
                                var course = resultStudent.CourseEnrolled;
                                course.splice(course.indexOf(msg["course"]),1);
                                student.update({Uni: resultStudent["Uni"]},{'$set':{CourseEnrolled: course}},function(err,res){
                                    if(!err) {
                                        str = str+" "+resultStudent["Uni"];
                                        count++;
                                        if(count == result.length){
                                            response.status = "succeed";
                                            response.message = "course "+msg["course"]+" is deleted from Student(Uni:"+str+").";
                                            logmsg(JSON.stringify(msg)+"\n");
                                            Callback(message,ch,response);
                                        }
                                    }
                                });
                            });
                        }
                        else{
                            response.status = "succeed";
                            response.message = "No student take course "+msg["course"];
                            Callback(message,ch,response);
                        }
                    });

                }
                else{
                    response.status = "failed";
                    response.message = "No such Course Action";
                    Callback(message,ch,response);
                }
            }
            else{
                handleUpdate(msg,message,ch,student,Callback);
            }
            break;

        case 'read':
            var query = new Object();
            if(msg["name"]) query.Name = msg["name"];
            if(msg["uni"]) query.Uni = msg["uni"];
            if(msg["course"]) query.CourseEnrolled = msg["course"];

            if(msg["uni"] == "#") {
                student.find({}, {Uni: true}).toArray(function(err, results) {
                    response.status = "succeed";
                    response.message = "list all students uni";
                    response.body = results;

                    logmsg(JSON.stringify(msg) + "\n");
                    Callback(message, ch, response);
                });
            } else {
                student.count({Uni: msg["uni"]}, function (err, count) {
                    if (count > 0) {
                        student.find(query).toArray(function (err, result) {
                            if (err) {
                                response.status = "failed";
                                response.message = err.toSring();
                                Callback(message, ch, response);
                            }
                            else {
                                response.status = "succeed";
                                response.message = count + " Student found";
                                response.body = result;
                                logmsg(JSON.stringify(msg) + "\n");
                                Callback(message, ch, response);
                            }
                        });
                    }
                    else {
                        response.status = "failed";
                        response.message = "no student match your request";
                        logmsg(JSON.stringify(msg) + "\n");
                        Callback(message, ch, response);
                    }
                });
            }
            break;

        case 'delete':
            handleDelete(msg,message,ch,student,Callback);
            break;


        case 'revert':
            lr.eachLine(path.join(path.dirname(__dirname),'log/student.log'), function(line, last) {
                if(last){
                    console.log(line);

                    var command = JSON.parse(line);
                    switch (command["method"]){
                        case 'create':
                            command["method"] = "delete";
                            handleDelete(command,message,ch,student,Callback);
                            break;
                        case 'delete':
                            command["method"] = "create";
                            handleCreate(command,message,ch,student,Callback);
                            break;
                        case 'update':
                            if(command["name"]){
                                command["name"]=command["oldname"];
                                handleUpdate(command,message,ch,student,Callback)
                            }
                            if(command["course"]){
                                if(command["courseAction"]=="Add"){
                                    command["courseAction"]="Del";
                                    handleUpdate(command,message,ch,student,Callback);
                                }
                                else if(command["courseAction"]=="Del"){
                                    command["courseAction"]="Add";
                                    handleUpdate(command,message,ch,student,Callback);
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

function handleCreate(msg,message,ch,student,Callback){
    var response = new Object();
    student.count({Uni: msg["uni"]}, function(err, count) {
        if(count==0){
            student.insert({Name: msg["name"],Uni: msg["uni"],CourseEnrolled: msg["course"].split(",")},function(err, result) {
                if (err) {
                    response.status = "failed";
                    response.message = err.toSring();
                    Callback(message,ch,response);
                }
                if (result){
                    response.status = "succeed";
                    response.message = "Student "+msg["name"]+" added";
                    logmsg(JSON.stringify(msg)+"\n");
                    Callback(message,ch,response);

                }
            });
        }
        else{
            response.status = "failed";
            response.message = "uni existed";
            Callback(message,ch,response);
        }
    });
}


function handleUpdate(msg,message,ch,student,Callback){
    var response = new Object();

    student.findOne({Uni: msg["uni"]}, function(err, result) {
        if (err) {
            response.status = "failed";
            response.message = err.toSring();
            Callback(message,ch,response);

            return;
        }

        if(result)
        {
            if(msg["name"]){
                student.update({Uni: msg["uni"]},{'$set':{Name: msg["name"]}},function(err,res){
                    if(err){
                        response.status = "failed";
                        response.message = err.toSring();
                        Callback(message,ch,response);
                    }
                    else {
                        response.status = "succeed";
                        response.message = "student "+msg["uni"]+"'s name has been chanded to "+msg["name"];
                        msg["oldname"] = result["Name"];
                        logmsg(JSON.stringify(msg)+"\n");
                        Callback(message,ch,response);
                    }

                });
            } else if(msg["course"]){
                if(msg["courseAction"]=="Add"){
                    var course = result.CourseEnrolled;
                    if(course.indexOf(msg["course"])==-1){
                        course.push(msg["course"]);
                        student.update({Uni: msg["uni"]},{'$set':{CourseEnrolled: course}},function(err,result){
                            if(err){
                                response.status = "failed";
                                response.message = err.toSring();
                                Callback(message,ch,response);
                            }
                            if(result){
                                response.status = "succeed";
                                response.message = "course "+msg["course"]+" is added to Student(Uni:"+msg["uni"]+").";
                                logmsg(JSON.stringify(msg)+"\n");
                                Callback(message,ch,response);
                            }
                        });
                    }
                    else{
                        response.status = "failed";
                        response.message = "course already enrolled by Student(Uni:"+msg["uni"]+").";
                        Callback(message,ch,response);
                    }
                } else if(msg["courseAction"]=="Del"){
                    var course = result.CourseEnrolled;
                    if(course.indexOf(msg["course"])!=-1){
                        course.splice(course.indexOf(msg["course"]),1);
                        student.update({Uni: msg["uni"]},{'$set':{CourseEnrolled: course}},function(err,result){
                            if(err) {
                                response.status = "failed";
                                response.message = err.toSring();
                                Callback(message,ch,response);
                            }
                            if(result){
                                response.status = "succeed";
                                response.message = "course "+msg["course"]+" is deleted from Student(Uni:"+msg["uni"]+").";
                                logmsg(JSON.stringify(msg)+"\n");
                                Callback(message,ch,response);
                            }
                        });
                    }
                    else{
                        response.status = "failed";
                        response.message = "Student("+msg["uni"]+") does not enroll this course.";
                        Callback(message,ch,response);
                    }

                }
                else{
                    response.status = "failed";
                    response.message = "No such Course Action";
                    Callback(message,ch,response);
                }
            }
        }
        else{
            response.status = "failed";
            response.message = "uni "+msg["uni"]+" does not exist.";
            Callback(message,ch,response);
        }

    });
}

function handleDelete(msg,message,ch,student,Callback){
    var response = new Object();
    student.findOne({Uni: msg["uni"]}, function(err, result) {
        if(result){
            student.remove({Uni: msg["uni"]},function(err, res) {
                if (err) {
                    response.status = "failed";
                    response.message = err.toSring();
                    Callback(message,ch,response);
                }
                else{
                    var tmp = new Object();
                    tmp.method = "delete";
                    tmp.name = result["Name"];
                    tmp.uni = result["Uni"];
                    tmp.course = result["CourseEnrolled"].join();
                    response.status = "succeed";
                    response.message = "student "+msg["uni"]+" removed";
                    logmsg(JSON.stringify(tmp)+"\n");
                    Callback(message,ch,response);
                }
            });
        }
        else{
            response.status = "failed";
            response.message = "no student match your request";
            Callback(message,ch,response);
        }
    });
}

function logmsg(string){
    var logpath = path.join(path.dirname(__dirname),'log/student.log');

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




