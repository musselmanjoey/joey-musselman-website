# Troubleshooting Log

Document common issues and solutions for easy reference.

## Template for New Issues
### Issue: [Brief description]
**Date**: [When encountered]
**Symptoms**: [What was happening]
**Root Cause**: [What was actually wrong]
**Solution**: [How it was fixed]
**Prevention**: [How to avoid in future]
**Related**: [Links to issues, commits, or docs]

---

## Common Issues

### Vercel Build Failure - ESLint Errors
**Date**: 2025-10-07
**Symptoms**: Build failed with errors about using `<a>` tags instead of `<Link>` components
**Root Cause**: Next.js ESLint rules enforce using Next.js Link component for internal navigation
**Solution**:
- Replace all `<a href="/">` with `<Link href="/">`
- Import Link from 'next/link'
- For images, either use `<Image>` or add `eslint-disable-next-line` comments
**Prevention**: Use Next.js components from the start, run `npm run build` locally before pushing
**Related**: Commits 86b0366, c714ca9

### Git Author Wrong Account
**Date**: 2025-10-07
**Symptoms**: Commits showing as "Dockside Analytics" instead of "Joey Musselman"
**Root Cause**: Git config was set globally to different account
**Solution**:
```bash
git config user.name "Joey Musselman"
git config user.email "musselmanjoey@gmail.com"
git rebase -i HEAD~3 --exec "git commit --amend --author='Joey Musselman <musselmanjoey@gmail.com>' --no-edit"
git push --force-with-lease
```
**Prevention**: Set user per-repo, or check `git config --list` before first commit
**Related**: Commit 742c5a0

### DNS Not Propagating After GoDaddy Update
**Date**: 2025-10-07
**Symptoms**: Domain still showing old WordPress site after updating DNS
**Root Cause**: DNS propagation takes time (5-30 minutes typical)
**Solution**:
- Verify DNS records are saved in GoDaddy
- Use `nslookup joeymusselman.com` to check current DNS
- Wait for propagation
- Try incognito/mobile data to bypass cache
**Prevention**: Be patient, DNS changes always take time
**Related**: Initial deployment

---

## Development Issues

### Dev Server Port Conflicts
**Date**: 2025-10-07
**Symptoms**: `npm run dev` starts on port 3001 instead of 3000
**Root Cause**: Port 3000 already in use by another process
**Solution**:
- Either stop the other process
- Or just use the new port Next.js assigns
**Prevention**: Kill old dev servers before starting new ones
**Related**: Normal Next.js behavior

---

## Build and Deployment

### Python Scraper in Git
**Date**: 2025-10-07
**Symptoms**: Downloaded videos and scraper script tracked in git
**Root Cause**: Files not in .gitignore initially
**Solution**: Add to .gitignore:
```
download_youtube_videos.py
scrapedVideos/
*.mp4
*.webp
*.info.json
```
**Prevention**: Update .gitignore before adding files
**Related**: Initial setup

---

## Performance Issues

[None yet]

---

## Integration Issues

[None yet]
