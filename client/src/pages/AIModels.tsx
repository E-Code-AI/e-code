import { AllModelsSelector } from "@/components/AllModelsSelector";
import { MarketingLayout } from "@/components/layout/MarketingLayout";

export default function AIModels() {
  return (
    <MarketingLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4" data-testid="heading-ai-models">AI Models</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore our comprehensive catalog of 24 production AI models across 6 leading providers.
            Test, compare, and select the perfect model for your needs.
          </p>
        </div>
        <AllModelsSelector />
      </div>
    </MarketingLayout>
  );
}
