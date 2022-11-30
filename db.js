require('dotenv').config()

class Db {
    constructor() {
        this.data = {
            host : process.env.DB_HOST,
            database : process.env.DB_NAME,
            user : process.env.DB_USER,
            password : process.env.DB_PASSWORD
        }
        this.dbConnection = this.getDataConnection();
    }
    getDataConnection(){
        return this.data;
    }
    getRains(connection){
        return new Promise((resolve,reject) =>{
            connection.query('SELECT * FROM rain WHERE status=1', function(err, results){
                if (err)  reject(err);
                else{
                    let rain = [];
                    results.forEach((r) => { 
                        rain.push({
                            id:r.id,
                            amount:r.amount,
                            hours:r.hours, 
                            chatid:r.chatid, 
                            status:r.status
                        });
                    });
                    resolve(rain);
                }
            })
        }).then(r => { return r; })
          .catch(e => {console.log('Fail to get info. ' + e); return false;});
    }
    getAdmin(connection){
        return new Promise((resolve,reject) =>{
            connection.query('SELECT * FROM admin', function(err, results){
                if (err)  reject(err);
                else{
                    let list = [];
                    results.forEach((r) => { 
                        list.push(r.username);
                    });
                    resolve(list);
                }
            })
        }).then(r => { return r; })
          .catch(e => {console.log('Fail to get info. ' + e); return false;});
    }
    updateRain(connection, id){
        return new Promise((resolve,reject) =>{
            connection.query(`UPDATE rain SET status=0 WHERE id=${id}`, function(err, results){
                if (err)  reject(err);
                else{
                    resolve(true)
                }
            })
        }).then(r => { return r; })
          .catch(e => {console.log('Fail to update info. ' + e); return false;});
    }
    createRain(connection, amount, hours, chatid){
        return new Promise((resolve,reject) =>{
            connection.query(`INSERT INTO rain (amount, hours, chatid) VALUES (${amount}, ${hours}, '${chatid}')`, function(err, results){
                if (err)  reject(err);
                else{
                    resolve(true)
                }
            })
        }).then(r => { return r; })
          .catch(e => {console.log('Fail to add info. ' + e); return false;});
    }
}
module.exports = Db;