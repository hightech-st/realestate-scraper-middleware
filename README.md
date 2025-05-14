- prisma migrate dev --name add_new_field
  Creates new migration files
  Applies migrations to your development database
  Regenerates Prisma Client
  Can reset the database if needed

- PM2 Command to start the app
  pm2 start dist/index.js --name realestate-api
  pm2 save
  pm2 startup

- code change then restart pm2
  pm2 restart realestate-api
