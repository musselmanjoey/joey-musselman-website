# Joey Musselman Website

A modern recreation of joeymusselman.com showcasing FSU Flying High Circus performances.

## Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Google Fonts** - Noto Sans & Noto Serif

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
joey-musselman-site/
├── app/
│   ├── layout.tsx          # Main layout with Header, Sidebar, Footer
│   ├── page.tsx            # Homepage (blog list)
│   ├── [slug]/page.tsx     # Individual blog post pages
│   └── globals.css         # Global styles
├── components/
│   ├── Header.tsx          # Site header with title
│   ├── Sidebar.tsx         # Sidebar with widgets (search, recent posts, archives)
│   ├── Footer.tsx          # Site footer
│   └── BlogPost.tsx        # Blog post component
├── data/
│   └── posts.ts            # Blog post data
└── public/
    └── images/             # Place header and post images here
```

## Adding Images

The site references these images that need to be added to `/public/images/`:

1. **header-bg.jpg** - Header background image (from cropped-IMG_0140.jpg)
2. **fh2.jpg** - Callaway Gardens 2018
3. **IMG_8833.jpg** - Family photo 2018

## Content

The site includes 6 blog posts with ~24 embedded YouTube videos:
- 2018 FSU Flying High Circus at Callaway Gardens
- 2018 FSU Flying High Circus Home Show
- Summer 2017 Flying High at Callaway Gardens
- FSU Flying High Circus Spring Show 2017
- My juggling–the early years
- My touchdown

## Build & Deploy

```bash
npm run build
npm run start
```

## Design Notes

- Color scheme: #dd3333 (circus red)
- Responsive design with fixed sidebar on desktop
- Mobile-friendly with collapsible sidebar
- WordPress Twenty Fifteen inspired layout
