import { AnimatePresence, motion } from 'framer-motion';
import { Search, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  Skeleton,
} from '../../../../packages/ui/src';
import { CreateFlowApi } from '../create/api';
import type { TemplateSummary } from '../create/types';

const categories = ['all', 'web', 'fullstack', 'mobile', 'ai-ml', 'bots', 'creative', 'services'];
const difficulties = ['all', 'beginner', 'intermediate', 'advanced'];

export interface TemplateGalleryProps {
  api?: CreateFlowApi;
  onSelect(template: TemplateSummary): void;
}

export function TemplateGallery({ api = new CreateFlowApi(), onSelect }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [sort, setSort] = useState('recommended');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .listTemplates()
      .then((items) => {
        if (active) setTemplates(items);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Templates unavailable');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const ranked = templates.filter((template) => {
      const matchesQuery =
        normalized.length === 0 ||
        `${template.name} ${template.description} ${template.tags.join(' ')}`.toLowerCase().includes(normalized);
      const matchesCategory = category === 'all' || template.category === category;
      const matchesDifficulty = difficulty === 'all' || template.difficulty === difficulty;
      return matchesQuery && matchesCategory && matchesDifficulty;
    });

    return ranked.sort((a, b) => {
      if (sort === 'recent') return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      if (sort === 'popular') return b.popularity - a.popularity;
      return b.popularity + b.recommendedExtensions.length - (a.popularity + a.recommendedExtensions.length);
    });
  }, [category, difficulty, query, sort, templates]);

  if (loading) {
    return (
      <div className="ecode-template-grid" aria-busy="true">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-56 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Templates indisponibles" description={error} action={<Button onClick={() => location.reload()}>Recharger</Button>} />;
  }

  return (
    <section className="ecode-template-gallery" aria-label="Galerie de templates">
      <div className="ecode-template-toolbar">
        <label className="ecode-search-field">
          <Search aria-hidden />
          <Input
            aria-label="Rechercher un template"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search framework, language, stack"
          />
        </label>
        <Select value={category} onValueChange={setCategory} items={categories.map((value) => ({ value, label: value }))} />
        <Select value={difficulty} onValueChange={setDifficulty} items={difficulties.map((value) => ({ value, label: value }))} />
        <Select
          value={sort}
          onValueChange={setSort}
          items={[
            { value: 'recommended', label: 'Recommended' },
            { value: 'popular', label: 'Popular' },
            { value: 'recent', label: 'Recent' },
          ]}
        />
      </div>

      <AnimatePresence mode="popLayout">
        {filtered.length === 0 ? (
          <EmptyState title="Aucun template" description="Modifiez les filtres pour afficher les stacks disponibles." />
        ) : (
          <motion.div className="ecode-template-grid" layout>
            {filtered.map((template) => (
              <motion.article key={template.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <Card className="ecode-template-card">
                  <img src={template.previewImageUrl} alt="" className="ecode-template-preview" loading="lazy" />
                  <div className="ecode-template-card-body">
                    <div className="ecode-template-card-title">
                      <h3>{template.name}</h3>
                      <Badge>{template.language}</Badge>
                    </div>
                    <p>{template.description}</p>
                    <div className="ecode-template-tags">
                      {template.tags.slice(0, 4).map((tag) => (
                        <Badge key={tag}>{tag}</Badge>
                      ))}
                    </div>
                    <div className="ecode-template-actions">
                      <span aria-label={`${template.popularity} utilisations`}>
                        <Star size={14} aria-hidden /> {template.popularity}
                      </span>
                      <Button size="sm" onClick={() => onSelect(template)}>Use template</Button>
                    </div>
                  </div>
                </Card>
              </motion.article>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
