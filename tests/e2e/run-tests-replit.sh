
#!/bin/bash

echo "🧪 Running Playwright tests on Replit infrastructure"

# Attendre que le serveur soit prêt
echo "⏳ Waiting for dev server..."
sleep 5

# Vérifier que le serveur répond
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 | grep -q "200\|304"; then
    echo "✅ Server is ready"
    break
  fi
  
  attempt=$((attempt + 1))
  echo "⏳ Attempt $attempt/$max_attempts..."
  sleep 2
done

if [ $attempt -eq $max_attempts ]; then
  echo "❌ Server failed to start"
  exit 1
fi

# Exécuter les tests avec retry
max_test_attempts=2
test_attempt=0

while [ $test_attempt -lt $max_test_attempts ]; do
  echo "🎭 Running Playwright tests (attempt $((test_attempt + 1))/$max_test_attempts)..."
  
  if npx playwright test --workers=1 --retries=2; then
    echo "✅ All tests passed"
    exit 0
  fi
  
  test_attempt=$((test_attempt + 1))
  
  if [ $test_attempt -lt $max_test_attempts ]; then
    echo "⚠️  Some tests failed, waiting before retry..."
    sleep 10
  fi
done

echo "❌ Tests failed after $max_test_attempts attempts"
exit 1
