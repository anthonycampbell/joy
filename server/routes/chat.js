const user = require('../models/user');
const chat = require('../models/chat');
const message = require('../models/message');
const validator = require('express-validator');

module.exports = function(io){
    var express = require('express');
    var router = express.Router();
    var passport = require('passport');
    var Message = require('../models/message');
    var User = require('../models/user');
    var Chat = require ('../models/chat');
    var cookie = require('cookie');
    var jwt = require('jsonwebtoken');
    var async = require('async');
    var chats = {}
    var ids = {}

    io.on('connection', (socket) => {
        socket.on('newChat', (friend) => {
            let hope = cookie.parse(socket.handshake.headers.cookie);
            jwt.verify(hope['jwt'], 'secret', function(err, decoded){
                async.series([
                    function(cb) {
                        Chat.findOne({ $or: [{participants: [decoded.id, friend]}, {participants: [friend, decoded.id]}] })
                        .exec(function(err, chat){
                            if (!chat) {
                                let newChat = new Chat;
                                newChat.participants.push(decoded.id);
                                newChat.participants.push(friend);
                                newChat.save((err, chat) => {
                                    socket.join(chat.id);
                                    cb(null, chat);
                                });
                                return;
                            } else {
                                socket.join(chat.id);
                                cb(null, chat);
                                return;
                            }
                        });
                    }], (err, results) => {
                        socket.emit('chat', {id: results[0].id, messages: results[0].messages})
                });
            });
        });
        socket.on('message', (data) => {
            validator.sanitizeBody('*').escape();
            let hope = cookie.parse(socket.handshake.headers.cookie);
            jwt.verify(hope['jwt'], 'secret', function(err, decoded){
                async.waterfall([
                    function(cb){
                        let newMessage = new Message;
                        newMessage.writer = decoded.id;
                        newMessage.data = data.message;
                        newMessage.save(function(err, msg){
                            if (err){
                                console.log(err);
                                console.log('msg', data.message);
                                return
                            }
                            cb(null, newMessage);
                        });
                    },
                    function(newMessage, cb){
                        Chat.findByIdAndUpdate(data.chat, {$push: {messages: newMessage.id} }, (err) => {
                            if (err){
                                console.log(err);
                                return;
                            }
                            cb(null, newMessage);
                        });
                    }], (err, newMessage) => {
                        io.to(data.chat).emit('newMessage', newMessage);
                    });
            });
        });
    });

    router.post('/', function(req, res, next){
        passport.authenticate('jwt', {session: false}, function(err, user, info){
            async.waterfall([
                function(cb){
                    Chat.findOne({ 
                        $or: 
                            [{participants: [user.id, req.body.friend]}, 
                            {participants: [req.body.friend, user.id]}] })
                    .exec(function(err, chat){ 
                        cb(null, chat.messages);
                    });
                },
                function(messages, cb){
                    async.map(messages, 
                        function(m , cb){
                            Message.findById(m)
                            .exec(function(err, mes){
                                cb(null, mes);
                            });
                        }, (err, results) => {
                            cb(null, results);
                        }
                    );
                }], (err, result) => {
                    res.json({messages: result});
                });
        })(req, res, next);
    });
    
    return router;
}