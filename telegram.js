require('dotenv').config() 
const {Telegraf, Markup } = require('telegraf');
const mysql      = require('mysql');
const axios = require('axios')
const Db         = require('./db.js');
const token      = process.env.TOKEN; 
const node_server= process.env.SERVER;
const bot        = new Telegraf(token);
let db           = new Db();  
let refreshTime = 5000;
let admin = [];
let request = {};
(async () => {
    await bring();
    
    setInterval(() => {
        bring();
    }, refreshTime); 
})();

bot.start(async (ctx) => {
    let username = ctx.message.chat.username;
    if (admin.indexOf(username) != -1) {
        ctx.reply(`Welcome back @${username},
        
You can use the following commands:
/new Creat a new rain.`);
    }else{
        ctx.reply(`You need admin permissions to use this tool.`);
    }
});
bot.help(async (ctx) => {
    let username = ctx.message.chat.username;
    if (admin.indexOf(username) != -1) {
        ctx.reply(`You can use the following commands:
/new Creat a new rain.`);
    }else{
        ctx.reply(`You need admin permissions to use this tool.`);
    }
});
bot.command('status',async (ctx) => {
    
    let username = ctx.message.chat.username;
    let text     = ctx.message.text;
    console.log(text);
    if (admin.indexOf(username) != -1) {
        axios.get(node_server+"/status").then(res => {
            let status = res.data;
            if (status.message == "No rains active at this moment." || status.message == "internal server error") {
                ctx.reply(`${status.message}`);
            }else {
                let ranking_str = '';
                if (status.data.ranking.length > 0) {
                    ranking_str = 'Ranking:';
                    for (let i = 0; i < status.data.ranking.length; i++) {
                        const e = status.data.ranking[i];
                        ranking_str += `(Author: ${e.author}, count: ${e.count})
`;
                    }
                }
                ctx.reply(`Amount to distribute: ${status.data.rain.amount} TMAC.
Duration of the rain: ${status.data.rain.duration} hours.
Start date: ${status.data.rain.start_date}
End date: ${status.data.rain.end_date}

${ranking_str}`);
            }
            
        })
        
    }else{
        ctx.reply(`You need admin permissions to use this tool.`);
    }
}); 
bot.command('new',async (ctx) => {
    
    let username = ctx.message.chat.username;
    let text     = ctx.message.text;
    console.log(text);
    if (admin.indexOf(username) != -1) {
        let params = text.split(' ');
        if (params.length == 1) {
            ctx.reply(`You can create a new rain with a single message, use the following format:
        
/new amount hours

Example:

/new 500 10

which means 500 TMAC and 10 hours.`);
        }else if (params.length < 3 && params.length > 1){
            ctx.reply(`Wrong format, use:
            
/new amount hours`);
        }else {
            if (request.amount == undefined) {
                let amount = parseFloat(params[1]);
                let hours  = parseFloat(params[2]);
                if (amount>0 && hours>0) { 
                    request = {
                        amount:amount,
                        hours:hours,
                        chatid:ctx.chat.id
                    }
                    ctx.replyWithPoll(`You will distribute ${amount} TMAC in ${hours} hours. Do you want to start it?`, ["yes","no"], {
                        is_anonymous: false,
                    })
                }else {
                    ctx.reply(`Only positive values.`)
                }
            }else {
                ctx.reply(`A request already exists, please reject the current one to create other`);
            } 
        }
        
    }else{
        ctx.reply(`You need admin permissions to use this tool.`);
    }
}); 
bot.on("poll_answer", async (ctx) => {
    let aswer = ctx.pollAnswer.option_ids[0] 
    if (aswer == 0) {
       console.log(request); 
       try {
            let connection = mysql.createConnection(db.dbConnection);
            connection.connect(async (err) => {
                if (err) throw err;
                let rains = await db.getRains(connection);
                console.log(rains);
                if (rains.length > 0) {
                    bot.telegram.sendMessage(request.chatid, `A rain is being handle, wait until the end to start another one.`);
                    request = {} 
                }else {
                    res = await db.createRain(connection, request.amount, request.hours, request.chatid);
                    if (res) { bot.telegram.sendMessage(request.chatid, `Rain started!`); request = {};}
                
                }
                setTimeout(() => {
                    connection.end();
                }, refreshTime - 500);
            });
        } catch (error) {
            console.log("Error: " + error); 
        }
    }else {
        request = {}
    }
});  
bot.launch();
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

function bring() {
    try {
        let connection = mysql.createConnection(db.dbConnection);
        connection.connect(async (err) => {
            if (err) throw err;
            admin = await db.getAdmin(connection);
            setTimeout(() => {
                connection.end();
            }, refreshTime - 500);
        });
    } catch (error) {
        console.log("Error: " + error);
        bring();
    }
}