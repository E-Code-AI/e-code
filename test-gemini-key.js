import { GoogleGenerativeAI } from '@google/generative-ai';

async function testGeminiKey() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GOOGLE_AI_API_KEY not found in environment');
    process.exit(1);
  }
  
  console.log('🔑 API Key found (length:', apiKey.length, ')');
  console.log('🔑 Key prefix:', apiKey.substring(0, 20) + '...');
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    console.log('\n📡 Testing Google Gemini API connection...');
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Say "API key works!"');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ SUCCESS! Google Gemini API key is valid');
    console.log('✅ Response:', text);
    console.log('✅ Model used: gemini-1.5-flash');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ FAILED! Google Gemini API key validation failed');
    console.error('❌ Error type:', error.constructor.name);
    console.error('❌ Error message:', error.message);
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.error('\n🔴 INVALID API KEY - The key is incorrect or revoked');
    } else if (error.message.includes('RATE_LIMIT')) {
      console.error('\n⚠️  RATE LIMIT - Too many requests, but key is valid');
    }
    
    process.exit(1);
  }
}

testGeminiKey();
