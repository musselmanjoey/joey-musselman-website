import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

const PODCAST_TITLE = 'Clown Cast';
const PODCAST_AUTHOR = 'Joey Musselman';
const PODCAST_DESCRIPTION =
  'Podcasts about whatever I find interesting — history, tech, weird rabbit holes. ' +
  'I was making these for myself anyway, so I figured I\'d share. ' +
  'Research by Claude, produced with NotebookLM, deployed by tools built using Claude Code. ' +
  'Orchestrated by a clown. Enjoy.';
const PODCAST_LANGUAGE = 'en';
const PODCAST_CATEGORY = 'Technology';
const PODCAST_SUBCATEGORY = 'Tech News';
const PODCAST_EMAIL = 'musselmanjoey@gmail.com';
const SITE_URL = 'https://joeymusselman.com';
const COVER_ART_URL = `${SITE_URL}/podcast/clown-cast-cover.jpg`;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Episode {
  id: string;
  title: string;
  description: string | null;
  audio_url: string;
  duration: number;
  file_size: number | null;
  episode_number: number | null;
  season: number;
  published_at: string;
  ai_generated: boolean;
  ai_disclosure: string | null;
  episode_type: string | null;
}

export async function GET() {
  try {
    const pool = getPool();

    const result = await pool.query(
      `SELECT id, title, description, audio_url, duration, file_size, episode_number, season, published_at, ai_generated, ai_disclosure, episode_type
       FROM podcast_episodes
       ORDER BY published_at DESC`
    );

    const episodes: Episode[] = result.rows;

    const lastBuildDate = episodes.length > 0
      ? new Date(episodes[0].published_at).toUTCString()
      : new Date().toUTCString();

    const items = episodes.map((ep) => {
      const pubDate = new Date(ep.published_at).toUTCString();
      const description = ep.description || ep.title;
      const aiNote = ep.ai_generated
        ? (ep.ai_disclosure || 'This episode was generated with AI assistance using NotebookLM.')
        : '';
      const fullDescription = aiNote ? `${description}\n\n${aiNote}` : description;

      return `
    <item>
      <title>${escapeXml(ep.title)}</title>
      <description><![CDATA[${fullDescription}]]></description>
      <enclosure url="${escapeXml(ep.audio_url)}" length="${ep.file_size || 0}" type="audio/mpeg" />
      <guid isPermaLink="false">${ep.id}</guid>
      <pubDate>${pubDate}</pubDate>
      <itunes:title>${escapeXml(ep.title)}</itunes:title>
      <itunes:summary><![CDATA[${fullDescription}]]></itunes:summary>
      <itunes:duration>${formatDuration(ep.duration)}</itunes:duration>
      <itunes:episodeType>${ep.episode_type || 'full'}</itunes:episodeType>
      <itunes:explicit>false</itunes:explicit>${ep.episode_number ? `
      <itunes:episode>${ep.episode_number}</itunes:episode>` : ''}${ep.season ? `
      <itunes:season>${ep.season}</itunes:season>` : ''}
    </item>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:podcast="https://podcastindex.org/namespace/1.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(PODCAST_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description><![CDATA[${PODCAST_DESCRIPTION}]]></description>
    <language>${PODCAST_LANGUAGE}</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/api/podcast/feed" rel="self" type="application/rss+xml" />
    <atom:link rel="hub" href="https://pubsubhubbub.appspot.com" />

    <itunes:author>${escapeXml(PODCAST_AUTHOR)}</itunes:author>
    <itunes:owner>
      <itunes:name>${escapeXml(PODCAST_AUTHOR)}</itunes:name>
      <itunes:email>${PODCAST_EMAIL}</itunes:email>
    </itunes:owner>
    <itunes:image href="${COVER_ART_URL}" />
    <itunes:category text="${PODCAST_CATEGORY}">
      <itunes:category text="${PODCAST_SUBCATEGORY}" />
    </itunes:category>
    <itunes:explicit>false</itunes:explicit>
    <itunes:type>episodic</itunes:type>

    <podcast:locked>no</podcast:locked>
${items}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate RSS feed', details: message },
      { status: 500 }
    );
  }
}
