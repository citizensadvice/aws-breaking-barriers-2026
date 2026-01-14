import { type ClientSchema, a, defineData } from '@aws-amplify/backend'

const schema = a.schema({
  // User table - links to Cognito
  User: a.model({
    id: a.string().required(),
    sessions: a.hasMany('ChatSession', 'userId'),
    feedback: a.hasMany('Feedback', 'userId'),
    profiles: a.hasMany('UserProfile', 'userId'),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  })
  .authorization((allow: any) => [allow.owner()]),

  // Chat Session model
  ChatSession: a.model({
    id: a.id().required(),
    userId: a.id().required(),
    user: a.belongsTo('User', 'userId'),
    title: a.string(),
    messages: a.hasMany('ChatMessage', 'sessionId'),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  })
  .authorization((allow: any) => [
    allow.owner(),
    allow.authenticated().to(['read']),
  ]),

  // Chat Message model
  ChatMessage: a.model({
    id: a.id().required(),
    sessionId: a.id().required(),
    session: a.belongsTo('ChatSession', 'sessionId'),
    role: a.enum(['user', 'assistant']),
    content: a.string().required(),
    timestamp: a.datetime(),
    feedback: a.hasMany('Feedback', 'messageId'),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  })
  .authorization((allow: any) => [
    allow.owner(),
    allow.authenticated().to(['read']),
  ]),

  // Feedback model
  Feedback: a.model({
    id: a.id().required(),
    messageId: a.id().required(),
    message: a.belongsTo('ChatMessage', 'messageId'),
    userId: a.id().required(),
    user: a.belongsTo('User', 'userId'),
    feedback: a.enum(['up', 'down']),
    comment: a.string(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  })
  .authorization((allow: any) => [
    allow.owner(),
    allow.authenticated().to(['read']),
  ]),

  // UserProfile model - includes location for local advice routing
  UserProfile: a.model({
    id: a.id().required(),
    userId: a.id().required(),
    user: a.belongsTo('User', 'userId'),
    name: a.string(),
    email: a.string(),
    postcode: a.string(),            // UK postcode for local bureau routing
    region: a.string(),              // Region (e.g., "London", "Scotland", "Wales")
    localBureauId: a.string(),       // Local Citizens Advice bureau ID
    notes: a.string(),
    onboardingCompleted: a.boolean().default(false),
    preferences: a.json(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  })
  .authorization((allow: any) => [
    allow.owner(),
    allow.authenticated().to(['read']),
  ]),

  // Notes model - for saving advice case notes
  Notes: a.model({
    id: a.id().required(),
    user_id: a.string().required(),
    content: a.string().required(),
    category: a.string(),            // benefits, housing, employment, consumer, debt, immigration
    actionRequired: a.boolean().default(false),
    deadline: a.string(),            // Important deadline date
    resolved: a.boolean().default(false),
  })
  .authorization((allow) => [allow.authenticated()])
  .secondaryIndexes((index) => [
    index('user_id')
  ]),

  // LocalBureau model - Citizens Advice bureau locations
  LocalBureau: a.model({
    id: a.id().required(),
    name: a.string().required(),     // Bureau name
    region: a.string().required(),   // Region coverage
    postcodes: a.string(),           // Comma-separated postcode prefixes covered
    address: a.string(),
    phone: a.string(),
    email: a.string(),
    openingHours: a.string(),
    specialisms: a.string(),         // Comma-separated specialisms
    knowledgeBaseId: a.string(),     // Bedrock KB ID for local content
  })
  .authorization((allow) => [allow.authenticated().to(['read'])]),

})

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
})
