import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your Next.js config here
  webpack: (webpackConfig, { isServer }) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    webpackConfig.module.rules.push({
      test: /\.css$/,
      use: isServer ? 'null-loader' : ['style-loader', 'css-loader'],
      include: /node_modules/,
    })

    webpackConfig.module.rules.push({
      test: /\.(scss|sass)$/,
      include: /node_modules/,
      use: isServer
        ? 'null-loader'
        : [
            'style-loader',
            'css-loader',
            {
              loader: 'sass-loader',
              options: { sourceMap: true },
            },
          ],
    })

    return webpackConfig
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
