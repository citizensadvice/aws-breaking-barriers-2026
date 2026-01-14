#!/bin/bash

# Test authentication and API call
echo "Testing authentication..."

# Get ID token from Cognito
TOKEN=$(aws cognito-idp admin-initiate-auth \
  --user-pool-id us-west-2_9KCYSeeDQ \
  --client-id 5nltqoc258ne9girat9bo244tt \
  --auth-flow ADMIN_NO_SRP_AUTH \
  --auth-parameters USERNAME=alex@test.invalid,PASSWORD="$1" \
  --query 'AuthenticationResult.IdToken' \
  --output text 2>&1)

if [[ $TOKEN == *"error"* ]] || [[ $TOKEN == *"Exception"* ]]; then
  echo "❌ Authentication failed:"
  echo "$TOKEN"
  exit 1
fi

echo "✅ Got ID token"
echo ""

# Decode token to see claims
echo "Token claims:"
echo "$TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq . || echo "Could not decode token"
echo ""

# Test API call
echo "Testing API call..."
curl -v -X POST https://y4ddrug6ih.execute-api.us-west-2.amazonaws.com/prod/documents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.txt",
    "fileContent": "SGVsbG8gV29ybGQ=",
    "metadata": {
      "location": "croydon"
    }
  }'
