import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// DynamoDB Configuration - Region forced to eu-north-1

const client = new DynamoDBClient({
  region: "eu-north-1", // Force region to eu-north-1
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
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

