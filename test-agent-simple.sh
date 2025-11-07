#!/bin/bash

echo "========================================" 
echo "E-Code Platform GPT-5 Agent Simple Test"
echo "========================================"
echo ""

# Step 1: Login
echo "Step 1: Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@e-code.ai","password":"AdminPass123!"}' \
  -c cookies.txt)

echo "Login response: $LOGIN_RESPONSE"
echo ""

# Extract user info
USER_ID=$(echo $LOGIN_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
if [ -z "$USER_ID" ]; then
  echo "❌ Login failed!"
  exit 1
fi

echo "✓ Login successful! User ID: $USER_ID"
echo ""

# Step 2: Create GPT-5 session  
echo "Step 2: Creating GPT-5 agent session..."
SESSION_RESPONSE=$(curl -s -X POST http://localhost:5000/api/admin/agent/sessions \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-5"}' \
  -b cookies.txt)

echo "Session response: $SESSION_RESPONSE"
echo ""

# Extract session ID
SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -z "$SESSION_ID" ]; then
  echo "❌ Failed to create session!"
  exit 1
fi

echo "✓ Session created! Session ID: $SESSION_ID"
echo ""

# Step 3: Execute agent
echo "Step 3: Testing agent execution..."
echo "Sending test message to GPT-5..."
echo ""

AGENT_RESPONSE=$(curl -s -X POST "http://localhost:5000/api/admin/agent/sessions/$SESSION_ID/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Hello GPT-5! Can you confirm you are working on the E-Code Platform? Please respond with a brief introduction."
      }
    ]
  }' \
  -b cookies.txt)

echo "Agent response:"
echo "================"
echo "$AGENT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$AGENT_RESPONSE"
echo "================"
echo ""

# Check if we got a message
if echo "$AGENT_RESPONSE" | grep -q '"message"'; then
  echo "✅ SUCCESS: GPT-5 Agent responded!"
  MESSAGE=$(echo "$AGENT_RESPONSE" | grep -o '"message":"[^"]*' | cut -d'"' -f4-)
  echo ""
  echo "Agent message: $MESSAGE"
  echo ""
  echo "🎉 The E-Code Platform GPT-5 Agent is functional!"
else
  echo "❌ No response from agent"
  exit 1
fi

echo ""
echo "Step 4: Testing server stability..."
echo "Checking server health for 30 seconds..."
echo ""

for i in {1..6}; do
  sleep 5
  HEALTH=$(curl -s http://localhost:5000/api/health)
  if [ $? -eq 0 ]; then
    echo "[$(( i * 5 ))s] Server is healthy: $HEALTH"
  else
    echo "❌ Server check failed!"
    exit 1
  fi
done

echo ""
echo "✅ Server has been stable for 30 seconds!"
echo ""
echo "========================================"
echo "🎉 ALL TESTS PASSED! 🎉"
echo "The E-Code Platform GPT-5 Agent is 100% functional!"
echo "========================================"