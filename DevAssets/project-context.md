# Project Context for Claude Code

## Project Overview
- **Name**: Joey Musselman Circus Portfolio
- **Purpose**: Showcase Joey Musselman's circus performance career with the FSU Flying High Circus
- **Target Users**: Family, friends, recruiters, circus community
- **Key Goals**:
  - Preserve and display circus performance history
  - Modern, visually impressive showcase
  - Easy to update with new performances
  - Mobile-friendly and fast loading

## Tech Stack
- **Frontend**: Next.js 15.5.4 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Domain**: joeymusselman.com (GoDaddy)
- **Key Libraries**:
  - React 19
  - Next.js Image & Link optimization
  - YouTube embed integration

## Project Structure
```
joey-musselman-site/
├── app/
│   ├── page.tsx              # Home page with hero, stats, performance grid
│   ├── [slug]/page.tsx       # Dynamic blog post pages
│   ├── layout.tsx
│   └── globals.css           # Tailwind + custom CSS (glassmorphism, animations)
├── components/
│   ├── Hero.tsx              # Parallax hero with stats
│   ├── Navigation.tsx        # Sticky nav with mobile menu
│   ├── PerformanceGrid.tsx   # Bento grid of performances with filters
│   ├── VideoGallery.tsx      # Lightbox video player
│   ├── About.tsx
│   └── Footer.tsx
├── data/
│   └── posts.ts              # All blog post data (6 posts, ~28 videos)
├── public/
│   └── images/
└── DevAssets/
    ├── project-context.md    # This file
    └── site-analysis.md      # Original WordPress content analysis
```

## Design System
- **Color Scheme**: Dark theme with red accent (#ef4444 "circus red")
- **Effects**: Glassmorphism, parallax scrolling, gradient text
- **Layout**: Bento grid for modern aesthetic
- **Animations**: Fade-in, hover effects, mouse tracking parallax
- **Typography**: Bold headings with gradient effects

## Project Constraints
- **Performance**: Must load fast, lazy-load YouTube videos
- **Compatibility**: Mobile-friendly, cross-browser compatible
- **SEO**: Next.js static generation for all performance pages
- **Accessibility**: Semantic HTML, proper alt tags

## Current Status
- **Phase**: Deployed ✅
- **Live URL**: https://joeymusselman.com
- **Vercel**: Auto-deploys from main branch
- **Next Priorities**:
  - Add more content/performances as they happen
  - Potential features: contact form, search, categories
  - Performance optimizations if needed

## Architecture Decisions

### Why Next.js App Router?
- Modern React patterns
- Built-in optimization (Image, Link components)
- Static site generation for performance pages
- Easy Vercel deployment

### Why Glassmorphism Design?
- Modern, trendy aesthetic (2025 design trends)
- Emphasizes performance imagery
- Creates depth and visual interest
- Works well with dark theme

### Video Strategy
- YouTube embeds (not self-hosted) to save bandwidth
- Lazy loading with click-to-play thumbnails
- Lightbox gallery for immersive viewing
- Thumbnail API for preview images

### Data Structure
- Static TypeScript data file (posts.ts)
- Easy to add new performances
- Type-safe with BlogPost interface
- Could migrate to CMS later if needed

## Development Notes

### Original Migration
- Migrated from WordPress site (expired SSL)
- Scraped content from saved HTML file
- Downloaded 27/28 YouTube videos locally (not used in production)
- Videos kept on YouTube for embedding

### Build Issues Resolved
- ESLint errors: Replaced all `<a>` tags with Next.js `<Link>` components
- Added eslint-disable for `<img>` tags (kept for simplicity, could migrate to `<Image>` later)
- Git author corrected to musselmanjoey@gmail.com

### Performance Considerations
- Lazy-load YouTube embeds (click to play)
- Next.js automatic code splitting
- Tailwind CSS purged in production
- Images optimized (using YouTube thumbnails)

## Common Tasks

### Adding a New Performance Post
1. Edit `data/posts.ts`
2. Add new BlogPost object with:
   - Unique ID
   - Title, slug, date
   - Content description
   - YouTube video IDs array
   - Optional images array
3. Commit and push - auto-deploys to Vercel

### Updating Stats
- Edit `components/Hero.tsx`
- Update the stats array (Years, Acts, Shows, Passion)

### Design Changes
- Global styles: `app/globals.css`
- Component-specific: Inline Tailwind classes
- Colors: Search for "circus-red" or update Tailwind config

### Testing Locally
```bash
npm run dev
# Opens on http://localhost:3000 (or 3001 if 3000 is busy)
```

### Deployment
- Push to main branch on GitHub
- Vercel auto-deploys
- Check https://vercel.com/dashboard for build status

## Lessons Learned
- Always use Next.js Link/Image components for internal navigation and images (ESLint enforces this)
- Vercel deployment fails on ESLint errors by default
- DNS propagation can take 5-30 minutes after updating GoDaddy
- Force push with `--force-with-lease` is safer than `--force`
- Git author can be set per-repo with `git config user.name/email`
