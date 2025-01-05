require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

// Validate environment variables
if (!process.env.COSMOS_URI || !process.env.COSMOS_KEY) {
  throw new Error('COSMOS_URI or COSMOS_KEY is not defined in environment variables');
}

// Configuration
const cosmosConfig = {
  endpoint: process.env.COSMOS_URI,
  key: process.env.COSMOS_KEY,
  databaseId: process.env.COSMOS_DB_NAME,
  containerId: process.env.COSMOS_CONTAINER_NAME,
};

const client = new CosmosClient({ endpoint: cosmosConfig.endpoint, key: cosmosConfig.key });

// Get Cosmos DB Container
const getCosmosContainer = async () => {
  try {
    const database = client.database(cosmosConfig.databaseId);
    const container = database.container(cosmosConfig.containerId);
    return container;
  } catch (err) {
    console.error('Error connecting to Cosmos DB:', err.message, err.stack);
    throw err;
  }
};

module.exports = { getCosmosContainer };
