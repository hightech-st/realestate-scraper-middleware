- run dynamo db local, in bash run

DYNAMO_ENDPOINT=http://localhost:8000 dynamodb-admin

then access http://localhost:8001

- PM2 Command to start the app
  pm2 start dist/index.js --name realestate-api
  pm2 save
  pm2 startup
