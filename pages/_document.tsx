import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Preconnect to Google Fonts for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/*
          Professional Font Pairing:
          - Merriweather: Classic serif for main headings (authoritative, readable)
          - IBM Plex Sans: Professional sans-serif for body text (corporate, modern)
          - IBM Plex Mono: Monospace for numbers and data (financial precision)
        */}
        <link
          href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />

        {/* Favicon and App Icons */}
        <meta name="theme-color" content="#00b3d6" />
        <meta name="description" content="Home Solutions - Your trusted partner for home ownership rewards" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
