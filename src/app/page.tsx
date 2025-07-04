import { FloatConverter } from '@/components/float-converter';
import { Github, Snowflake } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background font-sans antialiased">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
          <div className="mr-4 flex items-center">
            <Snowflake className="mr-2 h-6 w-6 text-primary" />
            <span className="font-bold">Floacon</span>
          </div>
          <a
            href="https://yohanchatelain.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on GitHub"
          >
            <Github className="h-6 w-6 text-foreground/80 hover:text-foreground" />
          </a>
        </div>
      </header>
      <main className="flex-1">
        <FloatConverter />
      </main>
    </div>
  );
}
