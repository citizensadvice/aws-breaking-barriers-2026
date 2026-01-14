/**
 * Custom Resource Lambda to create OpenSearch Serverless vector index
 * This must run after the collection is active but before the Knowledge Base is created
 */

import { 
  CloudFormationCustomResourceEvent, 
  CloudFormationCustomResourceResponse,
  Context 
} from 'aws-lambda';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';

const INDEX_NAME = process.env.INDEX_NAME || 'bedrock-knowledge-base-index';
const COLLECTION_ENDPOINT = process.env.COLLECTION_ENDPOINT || '';
const REGION = process.env.AWS_REGION || 'us-east-1';

// Retry configuration
const MAX_RETRIES = 30;
const RETRY_DELAY_MS = 10000; // 10 seconds between retries

export async function handler(
  event: CloudFormationCustomResourceEvent,
  context: Context
): Promise<CloudFormationCustomResourceResponse> {
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('Collection Endpoint:', COLLECTION_ENDPOINT);
  console.log('Index Name:', INDEX_NAME);

  const response: CloudFormationCustomResourceResponse = {
    Status: 'SUCCESS',
    PhysicalResourceId: `opensearch-index-${INDEX_NAME}`,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
  };

  try {
    if (event.RequestType === 'Delete') {
      console.log('Delete request - skipping index deletion to preserve data');
      return response;
    }

    if (event.RequestType === 'Create' || event.RequestType === 'Update') {
      await createVectorIndexWithRetry();
    }

    return response;
  } catch (error) {
    console.error('Error:', error);
    return {
      ...response,
      Status: 'FAILED',
      Reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createVectorIndexWithRetry(): Promise<void> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${MAX_RETRIES} to create index...`);
      await createVectorIndex();
      console.log('Index created successfully!');
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`Attempt ${attempt} failed: ${lastError.message}`);
      
      // Check if it's a "collection not ready" error
      if (lastError.message.includes('index_not_found') || 
          lastError.message.includes('no such index') ||
          lastError.message.includes('Connection') ||
          lastError.message.includes('ENOTFOUND') ||
          lastError.message.includes('getaddrinfo')) {
        console.log(`Collection may not be ready yet, waiting ${RETRY_DELAY_MS/1000}s before retry...`);
        await sleep(RETRY_DELAY_MS);
      } else if (lastError.message.includes('already exists') || 
                 lastError.message.includes('resource_already_exists')) {
        console.log('Index already exists, treating as success');
        return;
      } else {
        // For other errors, still retry but log differently
        console.log(`Unexpected error, waiting ${RETRY_DELAY_MS/1000}s before retry...`);
        await sleep(RETRY_DELAY_MS);
      }
    }
  }
  
  throw new Error(`Failed to create index after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`);
}

async function createVectorIndex(): Promise<void> {
  if (!COLLECTION_ENDPOINT) {
    throw new Error('COLLECTION_ENDPOINT environment variable is required');
  }

  // Remove https:// prefix if present for the client
  const endpoint = COLLECTION_ENDPOINT.replace('https://', '');
  console.log(`Connecting to OpenSearch at: ${endpoint}`);

  const client = new Client({
    ...AwsSigv4Signer({
      region: REGION,
      service: 'aoss',
      getCredentials: () => defaultProvider()(),
    }),
    node: `https://${endpoint}`,
  });

  // Check if index already exists
  try {
    const exists = await client.indices.exists({ index: INDEX_NAME });
    if (exists.body) {
      console.log(`Index ${INDEX_NAME} already exists`);
      return;
    }
  } catch (error) {
    console.log('Error checking if index exists (this is expected if collection is new):', error);
  }

  // Create the vector index with the required mapping for Bedrock KB
  const indexBody = {
    settings: {
      index: {
        knn: true,
        'knn.algo_param.ef_search': 512,
      },
    },
    mappings: {
      properties: {
        'bedrock-knowledge-base-vector': {
          type: 'knn_vector' as const,
          dimension: 1024, // Titan Embeddings V2 dimension
          method: {
            name: 'hnsw',
            engine: 'faiss',
            parameters: {
              ef_construction: 512,
              m: 16,
            },
            space_type: 'l2',
          },
        },
        'AMAZON_BEDROCK_TEXT_CHUNK': {
          type: 'text' as const,
          index: true,
        },
        'AMAZON_BEDROCK_METADATA': {
          type: 'text' as const,
          index: false,
        },
      },
    },
  };

  console.log(`Creating index ${INDEX_NAME}...`);
  const createResponse = await client.indices.create({
    index: INDEX_NAME,
    body: indexBody as any,
  });

  console.log('Index created:', JSON.stringify(createResponse.body, null, 2));
}
