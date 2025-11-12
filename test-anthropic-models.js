import Anthropic from '@anthropic-ai/sdk';

async function testModels() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const client = new Anthropic({ apiKey });
  
  const modelsToTry = [
    'claude-3-haiku-20240307',
    'claude-3-5-haiku-20241022',
    'claude-3-sonnet-20240229',
    'claude-3-5-sonnet-20240620',
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229'
  ];
  
  console.log('Testing Anthropic models...\n');
  
  for (const model of modelsToTry) {
    try {
      const response = await client.messages.create({
        model: model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      });
      console.log(`✅ ${model} - WORKS`);
    } catch (error) {
      if (error.status === 404) {
        console.log(`❌ ${model} - NOT FOUND`);
      } else {
        console.log(`⚠️  ${model} - ERROR: ${error.message}`);
      }
    }
  }
}

testModels();
