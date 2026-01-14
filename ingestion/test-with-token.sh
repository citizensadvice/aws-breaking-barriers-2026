#!/bin/bash
# Get the ID token from the first argument
TOKEN="$1"

echo "Testing API with provided token..."
echo ""

# Test API call
curl -v -X POST https://y4ddrug6ih.execute-api.us-west-2.amazonaws.com/prod/documents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.txt",
    "fileContent": "SGVsbG8gV29ybGQ=",
    "metadata": {
      "location": "croydon"
    }
  }' 2>&1 | grep -A 20 "< HTTP"
