interface CodeAnalysis {
    complexity: 'low' | 'medium' | 'high';
    functions: string[];
    classes: string[];
    variables: string[];
    imports: string[];
    issues: string[];
    lineCount: number;
    characterCount: number;
}

export class CodeAnalyzer {
    analyzeCode(code: string, language: string): CodeAnalysis {
        const lines = code.split('\n');
        const analysis: CodeAnalysis = {
            complexity: 'low',
            functions: [],
            classes: [],
            variables: [],
            imports: [],
            issues: [],
            lineCount: lines.length,
            characterCount: code.length
        };

        // Analyze based on language
        switch (language.toLowerCase()) {
            case 'javascript':
            case 'typescript':
                this.analyzeJavaScript(code, analysis);
                break;
            case 'python':
                this.analyzePython(code, analysis);
                break;
            case 'java':
                this.analyzeJava(code, analysis);
                break;
            case 'cpp':
            case 'c':
                this.analyzeCpp(code, analysis);
                break;
            case 'go':
                this.analyzeGo(code, analysis);
                break;
            case 'rust':
                this.analyzeRust(code, analysis);
                break;
            default:
                this.analyzeGeneric(code, analysis);
        }

        // Determine complexity
        analysis.complexity = this.calculateComplexity(code, analysis);

        return analysis;
    }

    private analyzeJavaScript(code: string, analysis: CodeAnalysis): void {
        // Functions
        const functionRegex = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?\(|(\w+)\s*:\s*(?:async\s+)?\()/g;
        let match;
        while ((match = functionRegex.exec(code)) !== null) {
            const functionName = match[1] || match[2] || match[3];
            if (functionName && !analysis.functions.includes(functionName)) {
                analysis.functions.push(functionName);
            }
        }

        // Classes
        const classRegex = /class\s+(\w+)/g;
        while ((match = classRegex.exec(code)) !== null) {
            analysis.classes.push(match[1]);
        }

        // Variables
        const variableRegex = /(?:const|let|var)\s+(\w+)/g;
        while ((match = variableRegex.exec(code)) !== null) {
            analysis.variables.push(match[1]);
        }

        // Imports
        const importRegex = /import\s+(?:\{[^}]*\}|\w+|\*\s+as\s+\w+)\s+from\s+['"]([^'"]+)['"]/g;
        while ((match = importRegex.exec(code)) !== null) {
            analysis.imports.push(match[1]);
        }

        // Common issues
        this.checkCommonJavaScriptIssues(code, analysis);
    }

    private analyzePython(code: string, analysis: CodeAnalysis): void {
        // Functions
        const functionRegex = /def\s+(\w+)\s*\(/g;
        let match;
        while ((match = functionRegex.exec(code)) !== null) {
            analysis.functions.push(match[1]);
        }

        // Classes
        const classRegex = /class\s+(\w+)/g;
        while ((match = classRegex.exec(code)) !== null) {
            analysis.classes.push(match[1]);
        }

        // Variables (basic detection)
        const variableRegex = /^(\w+)\s*=/gm;
        while ((match = variableRegex.exec(code)) !== null) {
            if (!analysis.variables.includes(match[1])) {
                analysis.variables.push(match[1]);
            }
        }

        // Imports
        const importRegex = /(?:from\s+(\w+)|import\s+(\w+))/g;
        while ((match = importRegex.exec(code)) !== null) {
            const importName = match[1] || match[2];
            if (!analysis.imports.includes(importName)) {
                analysis.imports.push(importName);
            }
        }

        this.checkCommonPythonIssues(code, analysis);
    }

    private analyzeJava(code: string, analysis: CodeAnalysis): void {
        // Classes
        const classRegex = /(?:public\s+|private\s+|protected\s+)?class\s+(\w+)/g;
        let match;
        while ((match = classRegex.exec(code)) !== null) {
            analysis.classes.push(match[1]);
        }

        // Methods
        const methodRegex = /(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:\w+\s+)?(\w+)\s*\([^)]*\)\s*\{/g;
        while ((match = methodRegex.exec(code)) !== null) {
            if (match[1] !== 'if' && match[1] !== 'for' && match[1] !== 'while') {
                analysis.functions.push(match[1]);
            }
        }

        // Imports
        const importRegex = /import\s+(?:static\s+)?([a-zA-Z0-9._]+)/g;
        while ((match = importRegex.exec(code)) !== null) {
            analysis.imports.push(match[1]);
        }

        this.checkCommonJavaIssues(code, analysis);
    }

    private analyzeCpp(code: string, analysis: CodeAnalysis): void {
        // Functions
        const functionRegex = /(?:\w+\s+)+(\w+)\s*\([^)]*\)\s*\{/g;
        let match;
        while ((match = functionRegex.exec(code)) !== null) {
            if (!['if', 'for', 'while', 'switch'].includes(match[1])) {
                analysis.functions.push(match[1]);
            }
        }

        // Classes
        const classRegex = /class\s+(\w+)/g;
        while ((match = classRegex.exec(code)) !== null) {
            analysis.classes.push(match[1]);
        }

        // Includes
        const includeRegex = /#include\s*[<"]([^>"]+)[>"]/g;
        while ((match = includeRegex.exec(code)) !== null) {
            analysis.imports.push(match[1]);
        }

        this.checkCommonCppIssues(code, analysis);
    }

    private analyzeGo(code: string, analysis: CodeAnalysis): void {
        // Functions
        const functionRegex = /func\s+(?:\([^)]*\)\s+)?(\w+)\s*\(/g;
        let match;
        while ((match = functionRegex.exec(code)) !== null) {
            analysis.functions.push(match[1]);
        }

        // Structs (similar to classes)
        const structRegex = /type\s+(\w+)\s+struct/g;
        while ((match = structRegex.exec(code)) !== null) {
            analysis.classes.push(match[1]);
        }

        // Imports
        const importRegex = /import\s+(?:\(\s*"([^"]+)"|"([^"]+)")/g;
        while ((match = importRegex.exec(code)) !== null) {
            analysis.imports.push(match[1] || match[2]);
        }

        this.checkCommonGoIssues(code, analysis);
    }

    private analyzeRust(code: string, analysis: CodeAnalysis): void {
        // Functions
        const functionRegex = /fn\s+(\w+)\s*\(/g;
        let match;
        while ((match = functionRegex.exec(code)) !== null) {
            analysis.functions.push(match[1]);
        }

        // Structs and enums
        const structRegex = /(?:struct|enum)\s+(\w+)/g;
        while ((match = structRegex.exec(code)) !== null) {
            analysis.classes.push(match[1]);
        }

        // Use statements
        const useRegex = /use\s+([a-zA-Z0-9_:]+)/g;
        while ((match = useRegex.exec(code)) !== null) {
            analysis.imports.push(match[1]);
        }

        this.checkCommonRustIssues(code, analysis);
    }

    private analyzeGeneric(code: string, analysis: CodeAnalysis): void {
        // Basic function detection
        const functionRegex = /function\s+(\w+)|def\s+(\w+)|fn\s+(\w+)/g;
        let match;
        while ((match = functionRegex.exec(code)) !== null) {
            const functionName = match[1] || match[2] || match[3];
            analysis.functions.push(functionName);
        }

        // Basic class detection
        const classRegex = /class\s+(\w+)|struct\s+(\w+)/g;
        while ((match = classRegex.exec(code)) !== null) {
            const className = match[1] || match[2];
            analysis.classes.push(className);
        }
    }

    private calculateComplexity(code: string, analysis: CodeAnalysis): 'low' | 'medium' | 'high' {
        let complexityScore = 0;

        // Line count contribution
        if (analysis.lineCount > 100) complexityScore += 2;
        else if (analysis.lineCount > 50) complexityScore += 1;

        // Function count contribution
        if (analysis.functions.length > 10) complexityScore += 2;
        else if (analysis.functions.length > 5) complexityScore += 1;

        // Nested structures
        const nestedPatterns = [
            /if\s*\([^)]*\)\s*\{[^}]*if\s*\([^)]*\)/g,
            /for\s*\([^)]*\)\s*\{[^}]*for\s*\([^)]*\)/g,
            /while\s*\([^)]*\)\s*\{[^}]*while\s*\([^)]*\)/g
        ];

        for (const pattern of nestedPatterns) {
            const matches = code.match(pattern);
            if (matches) {
                complexityScore += matches.length;
            }
        }

        // Control flow complexity
        const controlFlowPatterns = ['if', 'else', 'for', 'while', 'switch', 'case', 'try', 'catch'];
        for (const pattern of controlFlowPatterns) {
            const regex = new RegExp(`\\b${pattern}\\b`, 'g');
            const matches = code.match(regex);
            if (matches) {
                complexityScore += matches.length * 0.5;
            }
        }

        if (complexityScore > 15) return 'high';
        if (complexityScore > 8) return 'medium';
        return 'low';
    }

    private checkCommonJavaScriptIssues(code: string, analysis: CodeAnalysis): void {
        // Check for common issues
        if (code.includes('var ')) {
            analysis.issues.push('Use const/let instead of var');
        }
        if (code.includes('==') && !code.includes('===')) {
            analysis.issues.push('Consider using strict equality (===)');
        }
        if (code.includes('console.log') && code.split('console.log').length > 3) {
            analysis.issues.push('Multiple console.log statements - consider removing for production');
        }
        if (/function\s*\([^)]*\)\s*\{[^}]*\}/g.test(code)) {
            analysis.issues.push('Consider using arrow functions for consistency');
        }
    }

    private checkCommonPythonIssues(code: string, analysis: CodeAnalysis): void {
        if (code.includes('except:')) {
            analysis.issues.push('Avoid bare except clauses');
        }
        if (code.includes('import *')) {
            analysis.issues.push('Avoid wildcard imports');
        }
        if (/^\s{2,3}\w/m.test(code)) {
            analysis.issues.push('Inconsistent indentation detected');
        }
        if (code.includes('print(') && code.split('print(').length > 3) {
            analysis.issues.push('Multiple print statements - consider using logging');
        }
    }

    private checkCommonJavaIssues(code: string, analysis: CodeAnalysis): void {
        if (code.includes('System.out.println') && code.split('System.out.println').length > 3) {
            analysis.issues.push('Multiple System.out.println - consider using logging framework');
        }
        if (!code.includes('private') && code.includes('class')) {
            analysis.issues.push('Consider using private access modifiers');
        }
        if (code.includes('catch(Exception')) {
            analysis.issues.push('Avoid catching generic Exception');
        }
    }

    private checkCommonCppIssues(code: string, analysis: CodeAnalysis): void {
        if (code.includes('malloc') && !code.includes('free')) {
            analysis.issues.push('Memory allocated with malloc but no corresponding free');
        }
        if (code.includes('new') && !code.includes('delete')) {
            analysis.issues.push('Memory allocated with new but no corresponding delete');
        }
        if (code.includes('using namespace std')) {
            analysis.issues.push('Avoid "using namespace std" in headers');
        }
    }

    private checkCommonGoIssues(code: string, analysis: CodeAnalysis): void {
        if (code.includes('panic(')) {
            analysis.issues.push('Consider proper error handling instead of panic');
        }
        if (!code.includes('error') && code.includes('func')) {
            analysis.issues.push('Functions should return errors when appropriate');
        }
    }

    private checkCommonRustIssues(code: string, analysis: CodeAnalysis): void {
        if (code.includes('unwrap()')) {
            analysis.issues.push('Consider proper error handling instead of unwrap()');
        }
        if (code.includes('clone()') && code.split('clone()').length > 3) {
            analysis.issues.push('Excessive cloning - consider borrowing');
        }
        if (code.includes('unsafe')) {
            analysis.issues.push('Unsafe code requires careful review');
        }
    }
}