## Requeriments

- NPM v6.14.8 or above.
- NodeJS v16.0.0 or above.

## Installation

1- Create a new MySql database and import ```breeze_rain.sql``` file.

2- In <b>admin</b> table you can add as much telegram users as you want, they will can create rains.

3- Create a ```.env``` file with the following format:

```
TOKEN = telegram_bot_token
DB_USER=root 
DB_PASSWORD=
DB_NAME=breeze_rain
DB_HOST=localhost 
PAYING_ACCOUNT=breeze_account
KEY=breeze_key
SERVER=http://steemseven.xyz:3000
```

Server is your nodeJS server using port 3000.

4- Install dependencies doing ```npm i```

5- Start index.js and telegram.js (we suggest use pm2)

```
pm2 start index.js --name "rain_main_bot"

pm2 start telegram.js --name "telegram_rain_bot"
```

Done.
