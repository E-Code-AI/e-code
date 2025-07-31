import { ECodeAIService } from './aiService';
import { CodeAnalyzer } from './codeAnalyzer';

interface CodeExplanation {
    explanation: string;
    keyPoints: string[];
    complexity: 'low' | 'medium' | 'high';
    suggestions?: string[];
}

interface CodeOptimization {
    code: string;
    explanation: string;
    improvements: string[];
    performanceGain?: string;
}

interface Bug {
    line: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    suggestion?: string;
}

interface Refactoring {
    code: string;
    explanation: string;
    patterns: string[];
    benefits: string[];
}

interface Translation {
    code: string;
    explanation: string;
    notes: string[];
}

export class ECodeCopilotProvider {
    constructor(
        private aiService: ECodeAIService,
        private codeAnalyzer: CodeAnalyzer
    ) {}

    async explainCode(code: string, language: string, context: any): Promise<string> {
        const analysis = this.codeAnalyzer.analyzeCode(code, language);
        
        const prompt = `
Explain this ${language} code in detail:

\`\`\`${language}
${code}
\`\`\`

Context:
- File: ${context.fileName}
- Line: ${context.lineNumber}
- Complexity: ${analysis.complexity}

Provide a clear, beginner-friendly explanation that covers:
1. What the code does
2. How it works
3. Key concepts used
4. Any potential issues or improvements
        `;

        return await this.aiService.generateResponse(prompt);
    }

    async generateTests(code: string, language: string, context: any): Promise<string> {
        const analysis = this.codeAnalyzer.analyzeCode(code, language);
        const testFramework = this.getTestFramework(language);
        
        const prompt = `
Generate comprehensive unit tests for this ${language} code using ${testFramework}:

\`\`\`${language}
${code}
\`\`\`

Context:
- Functions found: ${analysis.functions.join(', ')}
- Classes found: ${analysis.classes.join(', ')}

Generate tests that cover:
1. Normal operation
2. Edge cases
3. Error conditions
4. Boundary values

Include proper test setup, teardown, and assertions.
        `;

        return await this.aiService.generateResponse(prompt);
    }

    async optimizeCode(code: string, language: string, context: any): Promise<CodeOptimization> {
        const analysis = this.codeAnalyzer.analyzeCode(code, language);
        
        const prompt = `
Optimize this ${language} code for better performance and readability:

\`\`\`${language}
${code}
\`\`\`

Current analysis:
- Complexity: ${analysis.complexity}
- Issues: ${analysis.issues.join(', ')}

Provide optimized code and explain:
1. What improvements were made
2. Performance benefits
3. Readability enhancements
4. Best practices applied

Return as JSON with structure: { "code": "optimized code", "explanation": "detailed explanation", "improvements": ["list of improvements"], "performanceGain": "estimated gain" }
        `;

        const response = await this.aiService.generateResponse(prompt);
        try {
            return JSON.parse(response);
        } catch {
            return {
                code,
                explanation: response,
                improvements: ['Unable to parse optimization response'],
                performanceGain: 'Unknown'
            };
        }
    }

    async generateDocumentation(code: string, language: string, context: any): Promise<string> {
        const analysis = this.codeAnalyzer.analyzeCode(code, language);
        const docStyle = this.getDocumentationStyle(language);
        
        const prompt = `
Generate ${docStyle} documentation for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Functions: ${analysis.functions.join(', ')}
Classes: ${analysis.classes.join(', ')}

Generate comprehensive documentation including:
1. Purpose and functionality
2. Parameters and return values
3. Usage examples
4. Notes about behavior
5. Any warnings or considerations

Use the appropriate documentation format for ${language}.
        `;

        return await this.aiService.generateResponse(prompt);
    }

    async findBugs(code: string, language: string, context: any): Promise<Bug[]> {
        const analysis = this.codeAnalyzer.analyzeCode(code, language);
        
        const prompt = `
Analyze this ${language} code for potential bugs and issues:

\`\`\`${language}
${code}
\`\`\`

Current issues detected: ${analysis.issues.join(', ')}

Look for:
1. Logic errors
2. Runtime exceptions
3. Memory leaks
4. Security vulnerabilities
5. Performance issues
6. Code smells

Return as JSON array with structure: [{ "line": number, "severity": "low|medium|high|critical", "title": "brief title", "description": "detailed description", "suggestion": "how to fix" }]
        `;

        const response = await this.aiService.generateResponse(prompt);
        try {
            return JSON.parse(response);
        } catch {
            return analysis.issues.map((issue, index) => ({
                line: 1,
                severity: 'medium' as const,
                title: `Issue ${index + 1}`,
                description: issue,
                suggestion: 'Review and fix this issue'
            }));
        }
    }

    async suggestRefactoring(code: string, language: string, context: any): Promise<Refactoring> {
        const analysis = this.codeAnalyzer.analyzeCode(code, language);
        
        const prompt = `
Suggest refactoring improvements for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Current complexity: ${analysis.complexity}
Issues: ${analysis.issues.join(', ')}

Focus on:
1. Code organization
2. Design patterns
3. SOLID principles
4. DRY principle
5. Readability
6. Maintainability

Return as JSON with structure: { "code": "refactored code", "explanation": "why these changes", "patterns": ["design patterns used"], "benefits": ["benefits of refactoring"] }
        `;

        const response = await this.aiService.generateResponse(prompt);
        try {
            return JSON.parse(response);
        } catch {
            return {
                code,
                explanation: response,
                patterns: [],
                benefits: ['Unable to parse refactoring response']
            };
        }
    }

    async translateCode(code: string, fromLanguage: string, toLanguage: string, context: any): Promise<Translation> {
        const prompt = `
Translate this ${fromLanguage} code to ${toLanguage}:

\`\`\`${fromLanguage}
${code}
\`\`\`

Ensure:
1. Functional equivalence
2. Idiomatic ${toLanguage} code
3. Proper syntax and conventions
4. Similar performance characteristics
5. Maintain code structure where possible

Return as JSON with structure: { "code": "translated code", "explanation": "translation notes", "notes": ["important considerations"] }
        `;

        const response = await this.aiService.generateResponse(prompt);
        try {
            return JSON.parse(response);
        } catch {
            return {
                code: `// Translation from ${fromLanguage} to ${toLanguage}\n// ${response}`,
                explanation: 'Translation could not be parsed properly',
                notes: ['Manual review recommended']
            };
        }
    }

    async addComments(code: string, language: string, context: any): Promise<string> {
        const analysis = this.codeAnalyzer.analyzeCode(code, language);
        
        const prompt = `
Add helpful comments to this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Add comments that:
1. Explain complex logic
2. Describe function purposes
3. Clarify variable meanings
4. Note important assumptions
5. Highlight potential gotchas

Use appropriate comment style for ${language}. Keep comments concise but informative.
        `;

        return await this.aiService.generateResponse(prompt);
    }

    private getTestFramework(language: string): string {
        const frameworks: Record<string, string> = {
            'javascript': 'Jest',
            'typescript': 'Jest with TypeScript',
            'python': 'pytest',
            'java': 'JUnit 5',
            'cpp': 'Google Test',
            'go': 'built-in testing package',
            'rust': 'built-in test framework',
            'php': 'PHPUnit',
            'ruby': 'RSpec',
            'swift': 'XCTest',
            'kotlin': 'JUnit 5'
        };
        
        return frameworks[language] || 'appropriate testing framework';
    }

    private getDocumentationStyle(language: string): string {
        const styles: Record<string, string> = {
            'javascript': 'JSDoc',
            'typescript': 'TSDoc',
            'python': 'Sphinx/docstring',
            'java': 'JavaDoc',
            'cpp': 'Doxygen',
            'go': 'Go doc comments',
            'rust': 'Rust doc comments',
            'php': 'PHPDoc',
            'ruby': 'YARD',
            'swift': 'Swift documentation comments',
            'kotlin': 'KDoc'
        };
        
        return styles[language] || 'inline documentation';
    }
}