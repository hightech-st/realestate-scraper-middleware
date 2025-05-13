import AWS from 'aws-sdk';
import { FastifyInstance } from 'fastify';

export const ensureTableExists = async (
  dynamoDb: AWS.DynamoDB,
  fastify: FastifyInstance
) => {
  const tableName = 'realestate_table';

  try {
    await dynamoDb.describeTable({ TableName: tableName }).promise();
    fastify.log.info(`Table "${tableName}" already exists`);
  } catch (err: any) {
    if (err.code === 'ResourceNotFoundException') {
      fastify.log.warn(`Table "${tableName}" does not exist. Creating...`);

      const params = {
        TableName: tableName,
        KeySchema: [
          { AttributeName: 'id', KeyType: 'HASH' },
          { AttributeName: 'postedAt', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'id', AttributeType: 'S' },
          { AttributeName: 'postedAt', AttributeType: 'S' } // or 'N' if it's a timestamp number
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      };

      try {
        await dynamoDb.createTable(params).promise();
        fastify.log.info(`Table "${tableName}" created`);
      } catch (createErr) {
        fastify.log.error(createErr);
        throw new Error('Failed to create table');
      }
    } else {
      console.error(err);
      throw new Error('Failed to describe table');
    }
  }
};
