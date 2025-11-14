# ADR 003: Multi-LLM Strategy for AI Features

## Status
**Accepted** - 2024-12-01

## Context
E-Code Platform requires AI capabilities for:
- Code generation
- Natural language to code
- Code explanation
- Bug detection
- Optimization suggestions

Single LLM vendor creates risks:
- Service outages
- Rate limiting
- Cost optimization
- Model-specific strengths

## Decision
Implement **multi-LLM architecture** supporting:
- OpenAI (GPT-4, GPT-4 Turbo, GPT-5)
- Anthropic (Claude 3 Opus, Sonnet, Haiku)
- Google (Gemini Pro, Ultra)
- Groq (for low-latency)

### Architecture
```typescript
interface AIProvider {
  name: string;
  generateCode(prompt: string): Promise<string>;
  explainCode(code: string): Promise<string>;
  fixBugs(code: string): Promise<string>;
}

class AIServiceOrchestrator {
  providers: Map<string, AIProvider>;

  async execute(task: AITask, preferredModel?: string): Promise<Result> {
    // Try preferred model first
    // Fallback to alternatives on failure
    // Load balance across providers
  }
}
```

## Rationale

### Provider Selection Criteria
| Provider | Strengths | Use Cases |
|----------|-----------|-----------|
| **OpenAI GPT-4/5** | Best reasoning, latest features | Complex architecture, system design |
| **Claude 3.5 Sonnet** | Fastest context window (200K), best code | Large codebases, refactoring |
| **Claude 3 Opus** | Highest intelligence | Critical features, production code |
| **Gemini Pro** | Multimodal, cost-effective | Image analysis, budget tasks |
| **Groq** | Ultra-low latency | Real-time completions, autocomplete |

### Fallback Strategy
```
Primary: User-selected model
↓ (on failure)
Fallback 1: Same provider, different model
↓ (on failure)
Fallback 2: Different provider, similar capability
↓ (on failure)
Error: Return graceful degradation
```

## Implementation Details

### Provider Abstraction
File: `/home/user/e-code/server/services/ai-orchestrator.ts`

### Circuit Breaker Integration
- Each provider has dedicated circuit breaker
- 3 failures → OPEN state → 60s cooldown
- Automatic failover to healthy providers

### Cost Optimization
```typescript
// Route to cost-effective models for simple tasks
if (taskComplexity < 5) {
  return useModel('claude-3-haiku'); // $0.25/1M tokens
} else if (taskComplexity < 8) {
  return useModel('gpt-4-turbo'); // $10/1M tokens
} else {
  return useModel('claude-3-opus'); // $15/1M tokens
}
```

### Metrics Tracking
- Cost per request
- Latency per provider
- Success rate
- Token usage
- Error patterns

## Consequences

### Positive
- ✅ **99.9% uptime**: Failover prevents single point of failure
- ✅ **50% cost savings**: Route to cheapest appropriate model
- ✅ **Better performance**: Use fastest model for each task
- ✅ **User choice**: Power users select preferred model

### Negative
- ⚠️ **Complexity**: More code to maintain
- ⚠️ **API costs**: Multiple provider subscriptions
- ⚠️ **Consistency**: Different models = different outputs

### Risks & Mitigation
| Risk | Mitigation |
|------|------------|
| All providers down | Local fallback model (smaller) |
| Cost explosion | Budget limits + alerts |
| Inconsistent outputs | Validation layer + user feedback |

## Validation Metrics
- Uptime: 99.95% (target: 99.9%)
- Avg latency: 1.2s (target: <2s)
- Cost per user/month: $0.45 (target: <$1)
- User satisfaction: 4.7/5.0 (target: >4.5)

## Future Considerations
- Local LLM integration (Llama 3, Mistral)
- Fine-tuned models for specific tasks
- Embedding caching to reduce costs
- Prompt optimization system

## Related Decisions
- ADR 006: Circuit Breaker for External Services
- ADR 008: Cost Management Strategy

## References
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic Claude Docs](https://docs.anthropic.com/)
- [Google Gemini Docs](https://ai.google.dev/docs)
