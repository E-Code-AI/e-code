import Groq from 'groq-sdk';

async function testGroqLlama() {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GROQ_API_KEY not found in environment');
    process.exit(1);
  }
  
  console.log('🔑 API Key found (length:', apiKey.length, ')');
  console.log('🔑 Key prefix:', apiKey.substring(0, 20) + '...');
  
  const groq = new Groq({ apiKey });
  
  try {
    console.log('\n📡 Testing Groq Llama API connection...');
    
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: 'Say "API key works!"' }],
      max_tokens: 20,
      temperature: 0.5
    });
    
    console.log('✅ SUCCESS! Groq Llama API key is valid');
    console.log('✅ Response:', response.choices[0].message.content);
    console.log('✅ Model used:', response.model);
    console.log('✅ Request ID:', response.id);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ FAILED! Groq Llama API key validation failed');
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

testGroqLlama();
