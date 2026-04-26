import {
  AGENT_SYSTEM_PROMPT,
  E_CODE_AGENT_SYSTEM_PROMPT,
  getSystemPromptForContext,
} from '../../server/ai/prompts/agent-system-prompt';

describe('E-code agent system prompt', () => {
  it('exports the E-code prompt as the default agent system prompt', () => {
    expect(AGENT_SYSTEM_PROMPT).toBe(E_CODE_AGENT_SYSTEM_PROMPT);
    expect(E_CODE_AGENT_SYSTEM_PROMPT).toContain('# Identity');
    expect(E_CODE_AGENT_SYSTEM_PROMPT).toContain('You are E-code Agent');
    expect(E_CODE_AGENT_SYSTEM_PROMPT).toContain('## Working updates (Replit-style)');
    expect(E_CODE_AGENT_SYSTEM_PROMPT).toContain('## Task list (for any request with 3+ steps)');
  });

  it('adds context-specific focus instructions without losing the shared base prompt', () => {
    const codingPrompt = getSystemPromptForContext('coding');
    const reviewPrompt = getSystemPromptForContext('review');
    const explanationPrompt = getSystemPromptForContext('explanation');

    expect(codingPrompt).toContain(E_CODE_AGENT_SYSTEM_PROMPT);
    expect(codingPrompt).toContain('FOCUS: You are in coding mode.');

    expect(reviewPrompt).toContain(E_CODE_AGENT_SYSTEM_PROMPT);
    expect(reviewPrompt).toContain('FOCUS: You are in code review mode.');

    expect(explanationPrompt).toContain(E_CODE_AGENT_SYSTEM_PROMPT);
    expect(explanationPrompt).toContain('FOCUS: You are in teaching mode.');
  });
});
