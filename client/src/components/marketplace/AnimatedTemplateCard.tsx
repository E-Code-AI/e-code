import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LazyImage } from '@/components/ui/lazy-image';
import { AnimatedValue } from '@/components/ui/animated-chart';
import { 
  Star, Download, Eye, Heart, GitBranch, Clock, 
  Code2, Users, Sparkles, ChevronRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedTemplateCardProps {
  template: any;
  index?: number;
  viewMode?: 'grid' | 'list';
  onSelect?: (template: any) => void;
  onUse?: (template: any) => void;
  className?: string;
}

export function AnimatedTemplateCard({
  template,
  index = 0,
  viewMode = 'grid',
  onSelect,
  onUse,
  className
}: AnimatedTemplateCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.9,
      y: 20,
      rotateX: -15
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      rotateX: 0,
      transition: {
        delay: index * 0.05,
        duration: 0.5,
        type: 'spring',
        stiffness: 100
      }
    },
    hover: {
      scale: 1.02,
      y: -4,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 10
      }
    }
  };

  const flipCardVariants = {
    front: {
      rotateY: 0,
      transition: {
        duration: 0.6,
        type: 'spring',
        stiffness: 200
      }
    },
    back: {
      rotateY: 180,
      transition: {
        duration: 0.6,
        type: 'spring',
        stiffness: 200
      }
    }
  };

  const handleCardClick = () => {
    if (viewMode === 'grid') {
      setIsFlipped(!isFlipped);
    }
    onSelect?.(template);
  };

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.div
            key={star}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ 
              scale: 1, 
              rotate: 0,
              fill: star <= rating ? '#F59E0B' : 'transparent'
            }}
            transition={{
              delay: index * 0.05 + star * 0.05,
              type: 'spring',
              stiffness: 200
            }}
          >
            <Star 
              className={cn(
                'h-4 w-4',
                star <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'
              )} 
            />
          </motion.div>
        ))}
        <span className="ml-1 text-sm text-muted-foreground">
          ({template.reviewCount || 0})
        </span>
      </div>
    );
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        className={cn('w-full', className)}
      >
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer">
          <CardContent className="p-0">
            <div className="flex">
              <div className="relative w-48 h-32">
                <LazyImage
                  src={template.thumbnail || '/placeholder.png'}
                  alt={template.name}
                  className="w-full h-full"
                />
                {template.featured && (
                  <Badge className="absolute top-2 left-2 bg-gradient-to-r from-orange-500 to-yellow-500">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Featured
                  </Badge>
                )}
              </div>
              
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{template.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                  <div className="text-right">
                    {template.price > 0 ? (
                      <div className="font-bold text-lg text-[#F26207]">
                        $<AnimatedValue value={template.price} decimals={2} />
                      </div>
                    ) : (
                      <Badge variant="secondary">Free</Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    <AnimatedValue value={template.downloads || 0} />
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <AnimatedValue value={template.users || 0} />
                  </span>
                  {renderStarRating(template.rating || 0)}
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <div className="flex gap-2">
                    {template.tags?.slice(0, 3).map((tag: string, i: number) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onUse?.(template);
                    }}
                    className="bg-[#F26207] hover:bg-[#F26207]/90"
                  >
                    Use Template
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Grid view with flip animation
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn('relative perspective-1000', className)}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <motion.div
        animate={isFlipped ? 'back' : 'front'}
        variants={flipCardVariants}
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        onClick={handleCardClick}
      >
        {/* Front of card */}
        <Card className="absolute inset-0 overflow-hidden border-0 shadow-lg cursor-pointer backface-hidden">
          <div className="relative aspect-video">
            <LazyImage
              src={template.thumbnail || '/placeholder.png'}
              alt={template.name}
              className="w-full h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {template.featured && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: index * 0.1, type: 'spring' }}
              >
                <Badge className="absolute top-2 left-2 bg-gradient-to-r from-orange-500 to-yellow-500">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              </motion.div>
            )}
            
            <div className="absolute bottom-2 left-2 right-2">
              <h3 className="font-semibold text-white mb-1">{template.name}</h3>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs bg-white/20 text-white">
                  {template.category}
                </Badge>
                {template.price > 0 ? (
                  <Badge className="text-xs bg-[#F26207]">
                    ${template.price}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs bg-green-500 text-white">
                    Free
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {template.description}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  {template.downloads || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {template.views || 0}
                </span>
              </div>
              {renderStarRating(template.rating || 0)}
            </div>
          </CardContent>
        </Card>

        {/* Back of card */}
        <Card 
          className="absolute inset-0 overflow-hidden border-0 shadow-lg cursor-pointer backface-hidden"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <CardContent className="p-4 h-full flex flex-col">
            <h3 className="font-semibold text-lg mb-2">{template.name}</h3>
            
            <div className="space-y-3 flex-1">
              <div>
                <h4 className="text-sm font-medium mb-1">Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {template.features?.slice(0, 4).map((feature: string) => (
                    <li key={feature} className="flex items-center gap-1">
                      <ChevronRight className="h-3 w-3 text-[#F26207]" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-1">Technologies</h4>
                <div className="flex flex-wrap gap-1">
                  {template.technologies?.map((tech: string) => (
                    <Badge key={tech} variant="outline" className="text-xs">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Author:</span>
                  <p className="font-medium">{template.author}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Updated:</span>
                  <p className="font-medium">{template.lastUpdated}</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button 
                size="sm" 
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(template);
                }}
                className="flex-1"
              >
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </Button>
              <Button 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onUse?.(template);
                }}
                className="flex-1 bg-[#F26207] hover:bg-[#F26207]/90"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Use Template
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}