import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Debug environment variables
console.log('=== DYNAMODB DEBUG ===');
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('DYNAMODB_TABLE:', process.env.DYNAMODB_TABLE);
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
console.log('Final config:', {
  region: process.env.AWS_REGION || "eu-north-1",
  table: process.env.DYNAMODB_TABLE || "seo_ranker",
  hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
  hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
});
console.log('=====================');

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "eu-north-1",
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export const TABLE_NAME = process.env.DYNAMODB_TABLE || "seo_ranker";

// Helper functions for key generation
export const KEYS = {
  pair: (pairId: string) => ({
    PK: `PAIR#${pairId}`,
    SK: "META",
  }),
  history: (pairId: string, checkedAt: string) => ({
    PK: `PAIR#${pairId}`,
    SK: `HISTO#${checkedAt}`,
  }),
  settings: () => ({
    PK: "APP#SETTINGS",
    SK: "META",
  }),
  gsi1Pair: (createdAt: string) => ({
    GSI1PK: "ENTITY#PAIR",
    GSI1SK: createdAt,
  }),
};

