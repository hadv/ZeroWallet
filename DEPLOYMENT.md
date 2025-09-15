# ZeroWallet Deployment Guide

This guide covers deploying ZeroWallet to various platforms and environments.

## 🚀 Quick Deploy to Vercel

### Prerequisites
- GitHub account
- Vercel account
- ZeroDev project setup
- Magic.link application setup

### Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial ZeroWallet implementation"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure environment variables (see below)
   - Deploy

3. **Environment Variables**
   Add these in Vercel dashboard under Settings > Environment Variables:
   ```
   NEXT_PUBLIC_ZERODEV_PROJECT_ID=your_project_id
   NEXT_PUBLIC_ZERODEV_BUNDLER_RPC=your_bundler_rpc_url
   NEXT_PUBLIC_ZERODEV_PAYMASTER_RPC=your_paymaster_rpc_url
   NEXT_PUBLIC_CHAIN_ID=11155111
   NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/your_infura_key
   NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY=your_magic_publishable_key
   NEXT_PUBLIC_APP_NAME=ZeroWallet
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```

## 🔧 Environment Configuration

### Development Environment
```env
# .env.local
NEXT_PUBLIC_ZERODEV_PROJECT_ID=your_dev_project_id
NEXT_PUBLIC_ZERODEV_BUNDLER_RPC=https://rpc.zerodev.app/api/v2/bundler/your_project_id
NEXT_PUBLIC_ZERODEV_PAYMASTER_RPC=https://rpc.zerodev.app/api/v2/paymaster/your_project_id
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/your_infura_key
NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY=pk_live_your_magic_key
NEXT_PUBLIC_APP_NAME=ZeroWallet
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production Environment
```env
# Production environment variables
NEXT_PUBLIC_ZERODEV_PROJECT_ID=your_prod_project_id
NEXT_PUBLIC_ZERODEV_BUNDLER_RPC=https://rpc.zerodev.app/api/v2/bundler/your_prod_project_id
NEXT_PUBLIC_ZERODEV_PAYMASTER_RPC=https://rpc.zerodev.app/api/v2/paymaster/your_prod_project_id
NEXT_PUBLIC_CHAIN_ID=1
NEXT_PUBLIC_RPC_URL=https://mainnet.infura.io/v3/your_infura_key
NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY=pk_live_your_production_magic_key
NEXT_PUBLIC_APP_NAME=ZeroWallet
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

## 🏗️ Build Configuration

### Next.js Configuration
The project includes optimized build settings in `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    return config
  },
}

module.exports = nextConfig
```

### Build Commands
```bash
# Development build
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Type check
npm run type-check
```

## 🌐 Platform-Specific Deployments

### Vercel (Recommended)
- **Automatic deployments** from GitHub
- **Edge functions** support
- **Built-in analytics**
- **Custom domains**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=.next
```

### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

```bash
# Build Docker image
docker build -t zerowallet .

# Run container
docker run -p 3000:3000 zerowallet
```

## 🔐 Security Considerations

### Environment Variables
- **Never commit** `.env.local` to version control
- Use **different keys** for development and production
- **Rotate keys** regularly
- Use **secret management** services for production

### HTTPS Requirements
- **Always use HTTPS** in production
- **WebAuthn requires** secure contexts
- **Magic.link requires** HTTPS for production

### Content Security Policy
Add CSP headers for enhanced security:

```javascript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://auth.magic.link; connect-src 'self' https://rpc.zerodev.app https://sepolia.infura.io https://auth.magic.link; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';"
          }
        ]
      }
    ]
  }
}
```

## 📊 Monitoring and Analytics

### Error Tracking
Consider integrating error tracking services:
- **Sentry** for error monitoring
- **LogRocket** for session replay
- **Datadog** for performance monitoring

### Analytics
- **Vercel Analytics** (if using Vercel)
- **Google Analytics** for user tracking
- **Mixpanel** for event tracking

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build application
        run: npm run build
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 🚨 Troubleshooting

### Common Deployment Issues

1. **Build Failures**
   - Check TypeScript errors
   - Verify all dependencies are installed
   - Ensure environment variables are set

2. **Runtime Errors**
   - Check browser console for errors
   - Verify API endpoints are accessible
   - Confirm WebAuthn support in target browsers

3. **Authentication Issues**
   - Verify Magic.link domain configuration
   - Check ZeroDev project settings
   - Ensure HTTPS is enabled

### Performance Optimization
- Enable **static generation** where possible
- Use **image optimization**
- Implement **code splitting**
- Configure **caching headers**

## 📋 Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] HTTPS enabled
- [ ] Domain configured in Magic.link dashboard
- [ ] ZeroDev project configured for production
- [ ] Error tracking setup
- [ ] Analytics configured
- [ ] Security headers implemented
- [ ] Performance optimizations applied
- [ ] Backup and recovery plan in place

## 🆘 Support

For deployment issues:
1. Check the [Next.js deployment documentation](https://nextjs.org/docs/deployment)
2. Review [Vercel documentation](https://vercel.com/docs)
3. Consult [ZeroDev documentation](https://docs.zerodev.app/)
4. Check [Magic.link documentation](https://magic.link/docs)

---

Happy deploying! 🚀
