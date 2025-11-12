import Anthropic from '@anthropic-ai/sdk';

async function testAnthropicKey() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY not found in environment');
    process.exit(1);
  }
  
  console.log('🔑 API Key found (length:', apiKey.length, ')');
  console.log('🔑 Key prefix:', apiKey.substring(0, 20) + '...');
  
  const client = new Anthropic({ apiKey });
  
  try {
    console.log('\n📡 Testing Anthropic API connection...');
    
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 20,
      messages: [{ role: 'user', content: 'Say "API key works!"' }]
    });
    
    console.log('✅ SUCCESS! Anthropic API key is valid');
    console.log('✅ Response:', response.content[0].text);
    console.log('✅ Model used:', response.model);
    console.log('✅ Request ID:', response.id);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ FAILED! Anthropic API key validation failed');
    console.error('❌ Error type:', error.constructor.name);
    console.error('❌ Error status:', error.status);
    console.error('❌ Error message:', error.message);
    
    if (error.status === 401) {
      console.error('\n🔴 INVALID API KEY - The key is incorrect or revoked');
    } else if (error.status === 429) {
      console.error('\n⚠️  RATE LIMIT - Too many requests, but key is valid');
    }
    
    process.exit(1);
  }
}

testAnthropicKey();
