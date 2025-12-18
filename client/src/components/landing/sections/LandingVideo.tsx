import { useState, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const modernSoftwareImg = '/attached_assets/stock_images/modern_software_deve_ff7f5fd4.jpg';

export default function LandingVideo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <section id="video-demo" className="py-20 bg-[var(--ecode-surface-tertiary)]" data-testid="section-video-demo">
      <div className="container-responsive max-w-7xl">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-[var(--ecode-text)]">
            See E-Code Platform in Action
          </h2>
          <p className="text-xl text-[var(--ecode-text-muted)] max-w-3xl mx-auto">
            Watch a real demo: Build and deploy a full-stack application in under 2 minutes using AI agents
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto animate-scale-in">
          <div className="relative rounded-2xl overflow-hidden shadow-[0_8px_32px_-8px_rgba(242,98,7,0.3)] bg-gray-900 border border-[var(--ecode-border)] transition-all duration-300 hover:shadow-[0_12px_40px_-8px_rgba(242,98,7,0.4)]">
            <div className="relative aspect-video bg-gradient-to-br from-ecode-accent/20 to-ecode-secondary-accent/20">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                poster={modernSoftwareImg}
                controls={false}
                muted={isMuted}
                loop
                playsInline
              >
                <source src="/assets/platform-demo.mp4" type="video/mp4" />
              </video>
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              
              <button
                className="absolute inset-0 flex items-center justify-center group"
                onClick={() => {
                  if (videoRef.current) {
                    if (isPlaying) {
                      videoRef.current.pause();
                    } else {
                      videoRef.current.play();
                    }
                    setIsPlaying(!isPlaying);
                  }
                }}
              >
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  {isPlaying ? (
                    <Pause className="h-8 w-8 text-white" />
                  ) : (
                    <Play className="h-8 w-8 text-white ml-1" />
                  )}
                </div>
              </button>

              <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center gap-4">
                <button
                  className="text-white hover:text-gray-300 transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                    if (videoRef.current) {
                      videoRef.current.muted = !isMuted;
                    }
                  }}
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                <div className="flex-1" />
                <button
                  className="text-white hover:text-gray-300 transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    videoRef.current?.requestFullscreen();
                  }}
                >
                  <Maximize className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <h3 className="text-lg font-semibold mb-2">Live Platform Demo</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Watch how E-Code Platform's AI agent builds a complete full-stack application
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              <Badge variant="secondary">AI Code Generation</Badge>
              <Badge variant="secondary">Real-time Preview</Badge>
              <Badge variant="secondary">Instant Deployment</Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
