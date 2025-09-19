# ZeroWallet Deployment Guide

This guide covers deploying ZeroWallet to various platforms and environments.

## ⚠️ **CRITICAL: Required Services Setup**

**Before deployment, you MUST set up these mandatory services. The wallet will NOT function without them:**

### 🔧 **ZeroDev Setup (MANDATORY)**
ZeroDev provides the ERC-4337 infrastructure that powers ZeroWallet's smart contract functionality.

1. **Create ZeroDev Account:**
   - Visit [https://dashboard.zerodev.app/](https://dashboard.zerodev.app/)
   - Sign up for a free account
   - Create a new project

2. **Configure for Sepolia Testnet:**
   - Select "Sepolia Testnet" as your network
   - Copy your Project ID
   - Your URLs will be automatically generated

3. **Get Required URLs:**
   ```
   Project ID: your_project_id_here
   Bundler URL: https://rpc.zerodev.app/api/v2/bundler/your_project_id_here
   Paymaster URL: https://rpc.zerodev.app/api/v2/paymaster/your_project_id_here
   ```

### 🔐 **Web3Auth Setup (MANDATORY)**
Web3Auth provides the social login functionality.

1. **Create Web3Auth Account:**
   - Visit [https://dashboard.web3auth.io/](https://dashboard.web3auth.io/)
   - Sign up for a free account
   - Create a new project

2. **Configure Project:**
   - Select "Ethereum" as blockchain
   - Add your domain(s) to whitelist
   - Copy your Client ID

## 🚀 Quick Deploy to Vercel

### Prerequisites
- GitHub account
- Vercel account
- **ZeroDev project setup (MANDATORY)**
- **Web3Auth project setup (MANDATORY)**

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

   **🚨 MANDATORY Variables (Wallet will NOT work without these):**
   ```
   # ZeroDev Configuration (MANDATORY)
   NEXT_PUBLIC_ZERODEV_PROJECT_ID=your_project_id_here
   NEXT_PUBLIC_BUNDLER_URL=https://rpc.zerodev.app/api/v2/bundler/your_project_id_here
   NEXT_PUBLIC_PAYMASTER_URL=https://rpc.zerodev.app/api/v2/paymaster/your_project_id_here

   # Web3Auth Configuration (MANDATORY)
   NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=your_web3auth_client_id_here
   ```

   **📋 Network Configuration (Pre-configured for Sepolia):**
   ```
   # Network Configuration
   NEXT_PUBLIC_CHAIN_ID=11155111
   NEXT_PUBLIC_CHAIN_NAME=sepolia
   NEXT_PUBLIC_RPC_URL=https://rpc.ankr.com/eth_sepolia
   NEXT_PUBLIC_WEB3AUTH_NETWORK=sapphire_devnet
   ```

   **⚙️ Optional Configuration:**
   ```
   # App Configuration
   NEXT_PUBLIC_APP_NAME=ZeroWallet
   NEXT_PUBLIC_APP_DESCRIPTION=A user-friendly Web3 wallet with social login and passkey support
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

   # Social Login (Optional)
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
   NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id_here
   ```

## 🔧 Environment Configuration

### Development Environment (Sepolia Testnet)
```env
# .env.local - Copy from .env.example and fill in your values

# ZeroDev Configuration (MANDATORY)
NEXT_PUBLIC_ZERODEV_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_BUNDLER_URL=https://rpc.zerodev.app/api/v2/bundler/your_project_id_here
NEXT_PUBLIC_PAYMASTER_URL=https://rpc.zerodev.app/api/v2/paymaster/your_project_id_here

# Passkey Server Configuration
NEXT_PUBLIC_PASSKEY_SERVER_URL=https://passkeys.zerodev.app/api/v3

# Network Configuration (Sepolia Testnet)
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_CHAIN_NAME=sepolia
NEXT_PUBLIC_RPC_URL=https://rpc.ankr.com/eth_sepolia

# Web3Auth Configuration (MANDATORY)
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=your_web3auth_client_id_here
NEXT_PUBLIC_WEB3AUTH_NETWORK=sapphire_devnet

# Social Login Configuration (Optional)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id_here

# App Configuration
NEXT_PUBLIC_APP_NAME=ZeroWallet
NEXT_PUBLIC_APP_DESCRIPTION=A user-friendly Web3 wallet with social login and passkey support
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production Environment (Ethereum Mainnet)
```env
# Production environment variables

# ZeroDev Configuration (MANDATORY) - Use separate production project
NEXT_PUBLIC_ZERODEV_PROJECT_ID=your_prod_project_id_here
NEXT_PUBLIC_BUNDLER_URL=https://rpc.zerodev.app/api/v2/bundler/your_prod_project_id_here
NEXT_PUBLIC_PAYMASTER_URL=https://rpc.zerodev.app/api/v2/paymaster/your_prod_project_id_here

# Passkey Server Configuration
NEXT_PUBLIC_PASSKEY_SERVER_URL=https://passkeys.zerodev.app/api/v3

# Network Configuration (Ethereum Mainnet)
NEXT_PUBLIC_CHAIN_ID=1
NEXT_PUBLIC_CHAIN_NAME=mainnet
NEXT_PUBLIC_RPC_URL=https://rpc.ankr.com/eth

# Web3Auth Configuration (MANDATORY) - Use production settings
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=your_production_web3auth_client_id_here
NEXT_PUBLIC_WEB3AUTH_NETWORK=sapphire_mainnet

# App Configuration
NEXT_PUBLIC_APP_NAME=ZeroWallet
NEXT_PUBLIC_APP_DESCRIPTION=A user-friendly Web3 wallet with social login and passkey support
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

### ⚠️ **Important Notes:**
- **Never commit** `.env.local` to version control
- Use **separate ZeroDev projects** for development and production
- Use **separate Web3Auth projects** for development and production
- **Test thoroughly** on Sepolia before deploying to mainnet
- The **bundler and paymaster URLs are absolutely mandatory** - the wallet will not function without them

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

### Critical Environment Variable Issues

1. **"Failed to create account client" Error**
   - **Cause**: Missing or invalid `NEXT_PUBLIC_BUNDLER_URL` or `NEXT_PUBLIC_PAYMASTER_URL`
   - **Solution**:
     - Verify your ZeroDev project ID is correct
     - Ensure URLs follow exact format: `https://rpc.zerodev.app/api/v2/bundler/YOUR_PROJECT_ID`
     - Check ZeroDev dashboard for correct project ID

2. **"Kernel client not initialized" Error**
   - **Cause**: ZeroDev configuration is incomplete
   - **Solution**:
     - Verify all three ZeroDev variables are set: `NEXT_PUBLIC_ZERODEV_PROJECT_ID`, `NEXT_PUBLIC_BUNDLER_URL`, `NEXT_PUBLIC_PAYMASTER_URL`
     - Check browser console for specific error messages

3. **"Web3Auth Client ID not found" Warning**
   - **Cause**: Missing `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID`
   - **Solution**:
     - Create Web3Auth project at https://dashboard.web3auth.io/
     - Copy Client ID to environment variables
     - Ensure domain is whitelisted in Web3Auth dashboard

### Common Deployment Issues

4. **Build Failures**
   - Check TypeScript errors
   - Verify all dependencies are installed
   - **Ensure all mandatory environment variables are set**
   - Run `npm run build` locally to test

5. **Runtime Errors**
   - Check browser console for errors
   - Verify API endpoints are accessible
   - Confirm WebAuthn support in target browsers
   - **Verify environment variables are loaded correctly**

6. **Wallet Connection Issues**
   - **First check**: Are all mandatory environment variables set?
   - Verify ZeroDev project is configured for correct network (Sepolia/Mainnet)
   - Check Web3Auth domain configuration
   - Ensure HTTPS is enabled (required for WebAuthn)

### Performance Optimization
- Enable **static generation** where possible
- Use **image optimization**
- Implement **code splitting**
- Configure **caching headers**

## 📋 Pre-Deployment Checklist

### 🚨 **MANDATORY Requirements (Wallet will NOT work without these)**
- [ ] **ZeroDev project created and configured**
  - [ ] `NEXT_PUBLIC_ZERODEV_PROJECT_ID` set
  - [ ] `NEXT_PUBLIC_BUNDLER_URL` set
  - [ ] `NEXT_PUBLIC_PAYMASTER_URL` set
- [ ] **Web3Auth project created and configured**
  - [ ] `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID` set
  - [ ] Domain whitelisted in Web3Auth dashboard
- [ ] **Test wallet functionality locally first**
  - [ ] Can create wallet
  - [ ] Can send transactions
  - [ ] Multi-sig features work (if using)

### 📋 **Standard Deployment Requirements**
- [ ] All environment variables configured
- [ ] HTTPS enabled (required for WebAuthn)
- [ ] Error tracking setup
- [ ] Analytics configured (optional)
- [ ] Security headers implemented
- [ ] Performance optimizations applied
- [ ] Backup and recovery plan in place

### 🧪 **Testing Checklist**
- [ ] Test on Sepolia testnet first
- [ ] Verify social login works
- [ ] Verify passkey registration/login works
- [ ] Test transaction sending
- [ ] Test multi-signature flows (if applicable)
- [ ] Test on target browsers (Chrome, Safari, Firefox)

## 🆘 Support

For deployment issues:
1. Check the [Next.js deployment documentation](https://nextjs.org/docs/deployment)
2. Review [Vercel documentation](https://vercel.com/docs)
3. Consult [ZeroDev documentation](https://docs.zerodev.app/)
4. Check [Magic.link documentation](https://magic.link/docs)

---

Happy deploying! 🚀
