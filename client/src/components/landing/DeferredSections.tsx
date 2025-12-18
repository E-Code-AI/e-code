import { lazy, Suspense } from 'react';
import { useDeferredRender } from '@/hooks/useDeferredRender';
import { SectionSkeleton, StatsSkeleton, FeaturesSkeleton } from './LandingSkeleton';

const LandingStats = lazy(() => import('./sections/LandingStats'));
const LandingVideo = lazy(() => import('./sections/LandingVideo'));
const LandingFeatures = lazy(() => import('./sections/LandingFeatures'));
const LandingProjects = lazy(() => import('./sections/LandingProjects'));
const LandingTemplates = lazy(() => import('./sections/LandingTemplates'));
const LandingTestimonials = lazy(() => import('./sections/LandingTestimonials'));
const LandingLanguages = lazy(() => import('./sections/LandingLanguages'));
const LandingWorkflow = lazy(() => import('./sections/LandingWorkflow'));
const LandingCTA = lazy(() => import('./sections/LandingCTA'));

interface DeferredSectionsProps {
  templates: any[];
  templatesLoading: boolean;
}

export function DeferredSections({ templates, templatesLoading }: DeferredSectionsProps) {
  const statsSection = useDeferredRender({ rootMargin: '200px' });
  const videoSection = useDeferredRender({ rootMargin: '200px' });
  const featuresSection = useDeferredRender({ rootMargin: '200px' });
  const projectsSection = useDeferredRender({ rootMargin: '200px' });
  const templatesSection = useDeferredRender({ rootMargin: '200px' });
  const testimonialsSection = useDeferredRender({ rootMargin: '200px' });
  const languagesSection = useDeferredRender({ rootMargin: '200px' });
  const workflowSection = useDeferredRender({ rootMargin: '200px' });
  const ctaSection = useDeferredRender({ rootMargin: '200px' });

  return (
    <>
      <div ref={statsSection.ref}>
        {statsSection.shouldRender ? (
          <Suspense fallback={<StatsSkeleton />}>
            <LandingStats />
          </Suspense>
        ) : (
          <StatsSkeleton />
        )}
      </div>

      <div ref={videoSection.ref}>
        {videoSection.shouldRender ? (
          <Suspense fallback={<SectionSkeleton height="h-[600px]" />}>
            <LandingVideo />
          </Suspense>
        ) : (
          <SectionSkeleton height="h-[600px]" />
        )}
      </div>

      <div ref={projectsSection.ref}>
        {projectsSection.shouldRender ? (
          <Suspense fallback={<SectionSkeleton />}>
            <LandingProjects />
          </Suspense>
        ) : (
          <SectionSkeleton />
        )}
      </div>

      <div ref={templatesSection.ref}>
        {templatesSection.shouldRender ? (
          <Suspense fallback={<SectionSkeleton />}>
            <LandingTemplates templates={templates} isLoading={templatesLoading} />
          </Suspense>
        ) : (
          <SectionSkeleton />
        )}
      </div>

      <div ref={featuresSection.ref}>
        {featuresSection.shouldRender ? (
          <Suspense fallback={<FeaturesSkeleton />}>
            <LandingFeatures />
          </Suspense>
        ) : (
          <FeaturesSkeleton />
        )}
      </div>

      <div ref={languagesSection.ref}>
        {languagesSection.shouldRender ? (
          <Suspense fallback={<SectionSkeleton />}>
            <LandingLanguages />
          </Suspense>
        ) : (
          <SectionSkeleton />
        )}
      </div>

      <div ref={workflowSection.ref}>
        {workflowSection.shouldRender ? (
          <Suspense fallback={<SectionSkeleton />}>
            <LandingWorkflow />
          </Suspense>
        ) : (
          <SectionSkeleton />
        )}
      </div>

      <div ref={testimonialsSection.ref}>
        {testimonialsSection.shouldRender ? (
          <Suspense fallback={<SectionSkeleton />}>
            <LandingTestimonials />
          </Suspense>
        ) : (
          <SectionSkeleton />
        )}
      </div>

      <div ref={ctaSection.ref}>
        {ctaSection.shouldRender ? (
          <Suspense fallback={<SectionSkeleton height="h-64" />}>
            <LandingCTA />
          </Suspense>
        ) : (
          <SectionSkeleton height="h-64" />
        )}
      </div>
    </>
  );
}
