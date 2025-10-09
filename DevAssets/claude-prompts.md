# Standard Claude Prompts for This Project

## Context Setting Template
```
I'm working on Joey Musselman's circus portfolio website - a Next.js site showcasing his FSU Flying High Circus performances.

Current issue: [specific problem you're facing]
Error message: [full error if applicable]
What I've tried: [previous attempts]
Goal: [desired outcome]

Here's the relevant code/file: [paste code if needed]
```

## Common Request Patterns

### Architecture & Planning
```
Help me design the architecture for [FEATURE_NAME].
Requirements: [list requirements]
Constraints: Next.js 15 App Router, TypeScript, Tailwind CSS
Current tech stack: See DevAssets/project-context.md
```

### Code Review
```
Review this [component/function/module] for improvements.
Focus areas: [performance/maintainability/Next.js best practices]
Specific concerns: [any particular issues you're worried about]
```

### Debugging
```
I'm getting this error: [full error message]
Context: [when it happens, what triggers it]
Code: [relevant code snippet from components/ or app/]
Expected: [what should happen]
Actual: [what's happening instead]
```

### Adding New Performance
```
I need to add a new circus performance to the site.
Details:
- Title: [performance title]
- Date: [YYYY-MM-DD]
- Description: [content]
- YouTube IDs: [comma-separated video IDs]
- Any special requirements: [e.g., featured image, special layout]
```

### Design Changes
```
I want to update the [component/section] design.
Current state: [describe current design]
Desired state: [describe new design]
Design system constraints: Dark theme, glassmorphism, circus-red accent
Reference: See app/globals.css for current styles
```

### Testing & Quality
```
Help me test [FEATURE/COMPONENT].
Testing approach: [manual/automated]
Coverage needed: [desktop/mobile/both]
Edge cases to consider: [specific scenarios]
Browsers: Chrome, Safari, Firefox, Mobile
```

### Documentation
```
Create/update documentation for [FEATURE/COMPONENT].
Audience: [future developers/myself]
Format: [DevAssets/project-context.md or inline comments]
Include: [usage examples/common pitfalls]
```

## Issue Creation Template
```
Create a GitHub issue documenting what we just accomplished:
- Summary of changes made
- Files modified
- Problems solved
- Testing completed
- Any follow-up needed
- Screenshots if applicable
```

## Deployment & Domain
```
I need help with [deployment/domain/DNS] for joeymusselman.com.
Platform: Vercel
DNS Provider: GoDaddy
Current issue: [describe problem]
What I've checked: [verification steps taken]
```

## Performance Optimization
```
The site feels slow on [page/component].
Symptoms: [describe performance issue]
Tools used: [Chrome DevTools/Lighthouse/etc]
Current metrics: [if available]
Target: [desired performance]
```

## Content Updates
```
I need to update the content for [section/page].
Current content: [describe what's there now]
New content: [what needs to change]
Location: Likely in data/posts.ts or components/[Component].tsx
```

## Quick Fixes
```
Quick question: How do I [specific task]?
Context: Working in [file/component]
Current approach: [what you're trying]
```

## Research Requests
```
Before we implement [feature/fix], let's research:
- How does [technology/pattern] work?
- What are the best practices for [scenario]?
- Are there existing Next.js patterns for [use case]?

This follows the "Research-After-Fail" methodology - let's understand before implementing.
```

## Session Wrap-Up
```
Summarize this session for DevAssets/session-summaries/:
- What we accomplished
- What we learned
- What's next
- Any issues to track
Format: Markdown with date in filename
```
