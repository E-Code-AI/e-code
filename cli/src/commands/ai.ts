import chalk from 'chalk';
import ora from 'ora';
import { api } from '../lib/api';

export class AICommand {
  static async chat(projectId: string, message: string, options: any) {
    const spinner = ora('Chatting with AI assistant...').start();
    
    try {
      const response = await api.post(`/projects/${projectId}/ai/chat`, {
        message,
        model: options.model,
        mode: 'assistant'
      });
      
      spinner.succeed(chalk.green('AI response received'));
      
      console.log('');
      console.log(chalk.blue.bold('AI Assistant:'));
      console.log('');
      console.log(response.response);
      
      if (response.actions && response.actions.length > 0) {
        console.log('');
        console.log(chalk.yellow.bold('Suggested Actions:'));
        response.actions.forEach((action: any) => {
          console.log(`• ${action.description}`);
        });
      }
      
    } catch (error: any) {
      spinner.fail(chalk.red('AI chat failed'));
      console.error(error.response?.data?.message || error.message);
    }
  }

  static async review(projectId: string, options: any) {
    const spinner = ora('Running AI code review...').start();
    
    try {
      const requestData: any = {};
      
      if (options.files) {
        requestData.files = options.files.split(',');
      }
      
      const review = await api.post(`/projects/${projectId}/ai/review`, requestData);
      
      spinner.succeed(chalk.green('Code review completed'));
      
      console.log('');
      console.log(chalk.blue.bold('AI Code Review Results:'));
      console.log('');
      
      console.log(chalk.gray(`Overall Score: ${review.overallScore}/100`));
      console.log(chalk.gray(`Files Reviewed: ${review.filesReviewed}`));
      console.log('');
      
      if (review.issues && review.issues.length > 0) {
        console.log(chalk.yellow.bold('Issues Found:'));
        review.issues.forEach((issue: any, index: number) => {
          const severityColor = issue.severity === 'high' ? chalk.red :
                               issue.severity === 'medium' ? chalk.yellow :
                               chalk.blue;
          
          console.log(`${index + 1}. ${severityColor(issue.severity.toUpperCase())} - ${issue.title}`);
          console.log(`   ${chalk.gray('File:')} ${issue.file}:${issue.line}`);
          console.log(`   ${chalk.gray('Description:')} ${issue.description}`);
          
          if (issue.suggestion) {
            console.log(`   ${chalk.green('Suggestion:')} ${issue.suggestion}`);
          }
          
          console.log('');
        });
      } else {
        console.log(chalk.green('No issues found! Great job!'));
      }
      
      if (review.suggestions && review.suggestions.length > 0) {
        console.log(chalk.blue.bold('General Suggestions:'));
        review.suggestions.forEach((suggestion: string) => {
          console.log(`• ${suggestion}`);
        });
      }
      
    } catch (error: any) {
      spinner.fail(chalk.red('AI code review failed'));
      console.error(error.response?.data?.message || error.message);
    }
  }

  static async explain(projectId: string, file: string, options: any) {
    const spinner = ora(`Explaining code in ${file}...`).start();
    
    try {
      const requestData: any = { file };
      
      if (options.lines) {
        const [start, end] = options.lines.split(':').map(Number);
        requestData.lineRange = { start, end };
      }
      
      const explanation = await api.post(`/projects/${projectId}/ai/explain`, requestData);
      
      spinner.succeed(chalk.green('Code explanation generated'));
      
      console.log('');
      console.log(chalk.blue.bold(`Code Explanation: ${file}`));
      
      if (options.lines) {
        console.log(chalk.gray(`Lines ${options.lines}`));
      }
      
      console.log('');
      console.log(explanation.explanation);
      
      if (explanation.keyPoints && explanation.keyPoints.length > 0) {
        console.log('');
        console.log(chalk.yellow.bold('Key Points:'));
        explanation.keyPoints.forEach((point: string) => {
          console.log(`• ${point}`);
        });
      }
      
      if (explanation.relatedConcepts && explanation.relatedConcepts.length > 0) {
        console.log('');
        console.log(chalk.blue.bold('Related Concepts:'));
        explanation.relatedConcepts.forEach((concept: string) => {
          console.log(`• ${concept}`);
        });
      }
      
    } catch (error: any) {
      spinner.fail(chalk.red('Code explanation failed'));
      console.error(error.response?.data?.message || error.message);
    }
  }
}