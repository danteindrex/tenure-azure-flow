#!/bin/bash

echo "📧 Testing SMTP email to trevorsdanny@gmail.com..."
echo ""

# Test the email API endpoint
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "trevorsdanny@gmail.com"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "🎯 Test completed! Check trevorsdanny@gmail.com for the test email."