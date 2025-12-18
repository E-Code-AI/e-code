
#!/bin/bash

# Test du webhook SendGrid
curl -X POST https://votre-domaine.replit.app/api/webhooks/sendgrid \
  -H "Content-Type: application/json" \
  -d '[
    {
      "email": "test@example.com",
      "timestamp": 1234567890,
      "event": "delivered",
      "sg_event_id": "test-event-123",
      "sg_message_id": "test-msg-456"
    }
  ]'
