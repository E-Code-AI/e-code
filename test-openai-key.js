import OpenAI from 'openai';

async function testOpenAIKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    process.exit(1);
  }
  
  console.log('🔑 API Key found (length:', apiKey.length, ')');
  console.log('🔑 Key prefix:', apiKey.substring(0, 20) + '...');
  
  const client = new OpenAI({ apiKey });
  
  try {
    console.log('\n📡 Testing OpenAI API connection...');
    
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say "API key works!"' }],
      max_tokens: 10
    });
    
    console.log('✅ SUCCESS! OpenAI API key is valid');
    console.log('✅ Response:', response.choices[0].message.content);
    console.log('✅ Model used:', response.model);
    console.log('✅ Request ID:', response.id);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ FAILED! OpenAI API key validation failed');
    console.error('❌ Error type:', error.constructor.name);
    console.error('❌ Error status:', error.status);
    console.error('❌ Error message:', error.message);
    
    if (error.status === 401) {
      console.error('\n🔴 INVALID API KEY - The key is incorrect or revoked');
      console.error('🔴 Please generate a new key at: https://platform.openai.com/api-keys');
    } else if (error.status === 429) {
      console.error('\n⚠️  RATE LIMIT - Too many requests, but key is valid');
    } else if (error.status === 500) {
      console.error('\n⚠️  SERVER ERROR - OpenAI service issue, but key might be valid');
    }
    
    process.exit(1);
  }
}

testOpenAIKey();
