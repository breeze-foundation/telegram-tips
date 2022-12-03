require('dotenv').config()
const BlockStreamer = require('./blockStreamer.js')
const {Telegraf, Markup } = require('telegraf');
const breej = require('breej')
const mysql = require('mysql2'); 
const express = require("express");
const bodyParser = require('body-parser');
var cors = require('cors')
const moment = require('moment')
const token      = process.env.TOKEN; 
const bot        = new Telegraf(token);
const Db    = require('./db.js');
let db      = new Db(); 
let rains   = [] 
let posts = []
var refreshTime = 15000
let paying_account = {
    user:process.env.PAYING_ACCOUNT,
    key:process.env.KEY
} 
let blkStreamer = new BlockStreamer()
const app = express();
const PORT = 3000;
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

function isInArray(name, arr){
    for (let i = 0; i < arr.length; i++) {
        const e = arr[i];
        if (e.author == name) return i;
    }
    return -1;
}
function getTotalPosts(posts){
    let count = 0;
    for (let i = 0; i < posts.length; i++) {
        const e = posts[i];
        count+= e.count;
    }
    return count;
}
function transfer(receiver, amount, memo) {
    let newTx = { type: 3, data: { receiver: receiver, amount: parseInt(amount*1000000), memo: memo } };
    let signedTx = breej.sign(paying_account.key, paying_account.user, newTx);
    breej.sendTransaction(signedTx, (error, result) => { if (error) {
        console.log(error);
    }else console.log(amount + " TMAC sent to " + receiver); }) 
}
function bring() {
    try {
        let connection = mysql.createConnection(db.dbConnection);
        connection.connect(async (err) => {
            if (err) throw err;
            rains = await db.getRains(connection);
            setTimeout(() => {
                connection.end();
            }, refreshTime - 500);
        });
    } catch (error) {
        console.log("Error: " + error);
        bring();
    }
}
function closeRain(id) {
    try {
        let connection = mysql.createConnection(db.dbConnection);
        connection.connect(async (err) => {
            if (err) throw err;
            rains = await db.updateRain(connection, id);
            setTimeout(() => {
                connection.end();
            }, refreshTime - 500);
        });
    } catch (error) {
        console.log("Error: " + error);
        closeRain(id);
    }
}
function updateData() {
    bring();
    return setInterval(() => {
        console.log('Getting new rains...');
        bring(); 

    }, refreshTime);
}
function updater() { 
    let handler = {
        updater:false,
        checker:false
    }
    handler.updater = updateData();
    let active = false;
    handler.checker = setInterval(() => {
        if (!active) { 
            console.log('Checking new rains...');
            if (rains.length > 0) {
                let total_distribution = rains[0].amount;
                let hours = rains[0].hours; 
                console.log('New rain detected, handling it. ', total_distribution, ' TMAC will be distributed in ', hours, ' hours.');
                active=true;
                let now = moment().utc();
                let end = moment().utc().add(hours, 'hours') 
                rains[0].start_date = now;
                rains[0].end_date   = end;
                clearInterval(handler.updater);
                //Starting rain, this method receive 2 params, the callback and the stop time in seconds
                blkStreamer.streamBlocks((newBlock) => { 
                    if (newBlock == 'Rain closed!') {
                        console.log("Summarizing results..."); 
                        if (posts.length > 0) {
                            let total = getTotalPosts(posts);
                            
                            for (let i = 0; i < posts.length; i++) {
                                posts[i].share = (posts[i].count*100/total).toFixed(2);
                                let amount = total_distribution*(posts[i].share/100);
                                if (amount >= 0.001) {
                                    transfer(posts[i].author, amount, '');
                                }else console.log('skipping ', posts[i].author, 'min amount reached'); 
                            } 
                            
                        }else console.log('Nothing to distribute'); 
                        closeRain(rains[0].id);
                        bot.telegram.sendMessage(rains[0].chatid, 'Rain finished');
                        rains = [];
                        posts = [];
                        active = false;
                        handler.updater = updateData();
                    }else if(newBlock === false){
                        console.log('Cant query api');
                    }else {
                        let ops = newBlock.txs; 
                        if (ops.length > 0) {
                            for (let i = 0; i < ops.length; i++) {
                                if (ops[i].type == 4) {
                                    let exist = isInArray(ops[i].sender, posts);
                                    if (exist == -1) {
                                        posts.push({ 
                                            author:ops[i].sender,
                                            count:1,
                                            share:0
                                        });
                                    }else posts[exist].count+=1;  
                                } 
                            }
                            console.log(posts);
                        }
                    }
                    
                }, hours*60*60);

            }
        }
        
    }, refreshTime/2);
}
function main() {
    updater(); 
}
main()
app.get('/', function (req, res) {
    let json = {status:'ok', message:"Use /status to know the current rain."}
    res.send(json);
    
});
app.get('/status', function (req, res) {
    let json = {}
    try { 
        if (rains.length>0) {
            json = {status:'ok', message:"There is one rain happening", data:{rain:{amount:rains[0].amount,duration:rains[0].hours, start_date:rains[0].start_date, end_date:rains[0].end_date}, ranking:posts}}
        }else { json = {status:'ok', message:"No rains active at this moment."} }
    } catch (error) {
        json = {status:'fail', message:"internal server error", error:error}
    }
    res.send(json); 
});

app.listen(PORT, () => {
    console.log('Server initialized.');
});
