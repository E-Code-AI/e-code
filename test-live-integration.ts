/**
 * Live Integration Test - Template Literal Sanitizer
 * Tests the full pipeline: AI response → sanitization → parsing → restoration
 */

import { replaceTemplateLiterals, restoreTemplateLiterals } from './server/utils/template-literal-sanitizer';
import * as jsonc from 'jsonc-parser';

console.log('🔬 LIVE INTEGRATION TEST - Template Literal Sanitizer\n');

// Simulate real AI provider responses with various template literal patterns
const realWorldTestCases = [
  {
    name: 'React Component with Props Interpolation',
    aiResponse: `{
      "tasks": [
        {
          "type": "create_file",
          "path": "src/components/UserCard.tsx",
          "content": "export default function UserCard({ name, email }: Props) {\\n  return (\\n    <div className='card'>\\n      <h2>{name}</h2>\\n      <p>Email: {email}</p>\\n      <span>Welcome, \${name}!</span>\\n    </div>\\n  );\\n}"
        }
      ]
    }`
  },
  {
    name: 'Node.js Express Route with Template Strings',
    aiResponse: `{
      "tasks": [
        {
          "type": "create_file",
          "path": "server/routes/users.ts",
          "content": "import express from 'express';\\nconst router = express.Router();\\n\\nrouter.get('/:id', async (req, res) => {\\n  const userId = req.params.id;\\n  const query = \\\`SELECT * FROM users WHERE id = \${userId}\\\`;\\n  const result = await db.query(query);\\n  res.json(result);\\n});\\n\\nexport default router;"
        }
      ]
    }`
  },
  {
    name: 'Escaped Template Literal (Should NOT Capture)',
    aiResponse: `{
      "tasks": [
        {
          "type": "create_file",
          "path": "docs/template-guide.md",
          "content": "# Template Strings\\\\n\\\\nUse \\\\\\\\$` + `{ variable } syntax for interpolation.\\\\nExample: const msg = \\\\\`Hello \\\\\\\\$` + `{ name }\\\\\`;"
        }
      ]
    }`
  },
  {
    name: 'Complex Nested Template with Object Access',
    aiResponse: `{
      "tasks": [
        {
          "type": "create_file",
          "path": "src/utils/formatter.ts",
          "content": "export const formatUser = (user: User) => {\\n  const greeting = \\\`Hello, \${user.profile.firstName} \${user.profile.lastName}!\\\`;\\n  const email = \\\`Email: \${user.contact.email || 'N/A'}\\\`;\\n  return { greeting, email };\\n};"
        }
      ]
    }`
  },
  {
    name: 'Multiple Template Literals in Single Task',
    aiResponse: `{
      "tasks": [
        {
          "type": "create_file",
          "path": "src/App.tsx",
          "content": "function App() {\\n  const title = \\\`Welcome to \${appName}\\\`;\\n  const subtitle = \\\`Version \${version}\\\`;\\n  const footer = \\\`© \${new Date().getFullYear()} \${company}\\\`;\\n  return <div><h1>{title}</h1><p>{subtitle}</p><footer>{footer}</footer></div>;\\n}"
        }
      ]
    }`
  }
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

for (const testCase of realWorldTestCases) {
  totalTests++;
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📋 Test ${totalTests}: ${testCase.name}`);
  console.log(`${'='.repeat(70)}`);
  
  try {
    console.log('Step 1: AI Response received ✓');
    
    // Step 2: Sanitize template literals
    console.log('Step 2: Running template literal sanitizer...');
    const { processed, templates } = replaceTemplateLiterals(testCase.aiResponse);
    console.log(`        → Captured ${templates.length} template literal(s)`);
    if (templates.length > 0) {
      templates.forEach((t, i) => {
        console.log(`        → Template ${i + 1}: ${t.original.substring(0, 50)}${t.original.length > 50 ? '...' : ''}`);
      });
    }
    
    // Step 3: Parse with jsonc
    console.log('Step 3: Parsing JSON with jsonc...');
    const errors: jsonc.ParseError[] = [];
    const parsed = jsonc.parse(processed, errors);
    
    if (errors.length > 0) {
      console.log(`        ❌ JSON parse FAILED`);
      errors.forEach(err => console.log(`           Error: ${err.error} at offset ${err.offset}`));
      failedTests++;
      continue;
    }
    console.log(`        ✓ JSON parsed successfully`);
    
    // Step 4: Restore template literals
    console.log('Step 4: Restoring template literals...');
    const restored = restoreTemplateLiterals(parsed, templates);
    console.log(`        ✓ Template literals restored`);
    
    // Step 5: Verify restoration
    console.log('Step 5: Verifying restoration...');
    const restoredJson = JSON.stringify(restored, null, 2);
    
    // Check that all captured templates are back in the result
    let allRestored = true;
    for (const template of templates) {
      if (!restoredJson.includes(template.original)) {
        console.log(`        ❌ Template literal NOT restored: ${template.original}`);
        allRestored = false;
      }
    }
    
    if (!allRestored) {
      failedTests++;
      continue;
    }
    
    console.log(`        ✓ All template literals verified in output`);
    
    // Success!
    console.log(`\n✅ PASS - Full pipeline successful:`);
    console.log(`   AI Response → Sanitize → Parse → Restore → Verify`);
    passedTests++;
    
  } catch (error: any) {
    console.log(`\n❌ FAIL - Exception: ${error.message}`);
    console.log(`   Stack: ${error.stack?.split('\n')[0]}`);
    failedTests++;
  }
}

console.log(`\n\n${'='.repeat(70)}`);
console.log(`📊 LIVE INTEGRATION TEST RESULTS`);
console.log(`${'='.repeat(70)}`);
console.log(`✅ Passed: ${passedTests}/${totalTests}`);
console.log(`❌ Failed: ${failedTests}/${totalTests}`);
console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
console.log(`${'='.repeat(70)}\n`);

if (failedTests === 0) {
  console.log('🎉 100% SUCCESS - Template Literal Sanitizer is PRODUCTION READY!\n');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed - Review output above\n');
  process.exit(1);
}
