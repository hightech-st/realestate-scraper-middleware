import dotenv from 'dotenv';
dotenv.config();

interface DynamoDBConfig {
  region: string;
  endpoint?: string;
}

interface Config {
  dynamoDB: DynamoDBConfig;
  port: number;
}

const isLocal = process.env.NODE_ENV !== 'production';

const config: Config = {
  dynamoDB: {
    region: process.env.AWS_REGION || '',
    ...(isLocal && {
      endpoint: 'http://localhost:8000',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    })
  },
  port: parseInt(process.env.PORT || '3000', 10)
};

export default config;
