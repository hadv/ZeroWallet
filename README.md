# ZeroWallet - User-Friendly Web3 Wallet

A modern, secure Ethereum wallet built with ZeroDev's smart account infrastructure, featuring passkey authentication and social login capabilities.

## 🌟 Features

### Authentication Methods
- **Passkey Authentication**: Secure biometric authentication using WebAuthn (Face ID, Touch ID, Windows Hello)
- **Social Login**: Email-based authentication with Magic.link
- **No Seed Phrases**: Eliminate the complexity of traditional wallet management

### Smart Account Benefits
- **Gas Sponsorship**: Transactions sponsored by ZeroDev (no ETH needed for gas)
- **Account Abstraction**: ERC-4337 compliant smart accounts
- **Enhanced Security**: Multi-signature capabilities and recovery mechanisms
- **Batch Transactions**: Execute multiple operations in a single transaction

### User Experience
- **Intuitive Interface**: Clean, modern design built with Tailwind CSS
- **Real-time Balance**: Live ETH balance updates
- **Transaction History**: Complete transaction tracking with status updates
- **Demo Features**: NFT minting and token sending capabilities

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Modern browser with WebAuthn support

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd zerowallet
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file with the following variables:
   ```env
   # ZeroDev Configuration
   NEXT_PUBLIC_ZERODEV_PROJECT_ID=your_project_id
   NEXT_PUBLIC_ZERODEV_BUNDLER_RPC=your_bundler_rpc_url
   NEXT_PUBLIC_ZERODEV_PAYMASTER_RPC=your_paymaster_rpc_url

   # Network Configuration
   NEXT_PUBLIC_CHAIN_ID=11155111
   NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/your_infura_key

   # Magic.link Configuration
   NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY=your_magic_publishable_key

   # Application Settings
   NEXT_PUBLIC_APP_NAME=ZeroWallet
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔧 Configuration

### ZeroDev Setup
1. Visit [ZeroDev Dashboard](https://dashboard.zerodev.app/)
2. Create a new project
3. Copy your Project ID, Bundler RPC, and Paymaster RPC URLs
4. Add them to your `.env.local` file

### Magic.link Setup
1. Visit [Magic.link Dashboard](https://dashboard.magic.link/)
2. Create a new application
3. Copy your publishable key
4. Add it to your `.env.local` file

## 🏗️ Architecture

### Core Components

#### Authentication Layer
- **AuthContext**: Manages authentication state and methods
- **PasskeyService**: Handles WebAuthn passkey operations
- **SocialLoginService**: Manages Magic.link social authentication

#### Wallet Layer
- **WalletContext**: Manages wallet state and transactions
- **WalletService**: Core wallet operations and smart account management

#### UI Components
- **LoginForm/RegisterForm**: Authentication interfaces
- **WalletDashboard**: Main wallet interface
- **SendTransaction**: Transaction sending modal
- **MintNFT**: Demo NFT minting functionality

### Technology Stack
- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Heroicons
- **Blockchain**: Viem, ZeroDev SDK
- **Authentication**: WebAuthn, Magic.link
- **Smart Accounts**: ERC-4337, Kernel accounts

## 🔐 Security Features

### Passkey Authentication
- Hardware-backed security keys
- Biometric authentication
- No password storage
- Phishing-resistant

### Smart Account Security
- Multi-signature capabilities
- Session key management
- Account recovery mechanisms
- Gas sponsorship without compromising security

## 🧪 Testing

### Manual Testing
1. **Registration**: Test passkey and social login registration
2. **Authentication**: Verify login with both methods
3. **Wallet Operations**: Test balance display and transaction history
4. **Transactions**: Send test transactions and mint demo NFTs

### Network Testing
- **Testnet**: Currently configured for Sepolia testnet
- **Gas Sponsorship**: Verify sponsored transactions work correctly
- **Error Handling**: Test network failures and recovery

## 📱 Browser Compatibility

### Supported Browsers
- **Chrome/Edge**: Full WebAuthn support
- **Safari**: Touch ID and Face ID support
- **Firefox**: Platform authenticator support

### Mobile Support
- **iOS Safari**: Face ID and Touch ID
- **Android Chrome**: Fingerprint and face unlock
- **Progressive Web App**: Installable on mobile devices

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables
Ensure all production environment variables are set:
- Use production RPC URLs
- Configure production Magic.link keys
- Set appropriate CORS origins

### Deployment Platforms
- **Vercel**: Recommended for Next.js applications
- **Netlify**: Alternative deployment option
- **Custom Server**: Docker containerization available

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Common Issues
- **Passkey not working**: Ensure browser supports WebAuthn
- **Transaction failures**: Check network connection and gas sponsorship
- **Login issues**: Verify environment variables are set correctly

### Getting Help
- Check the [ZeroDev Documentation](https://docs.zerodev.app/)
- Review [Magic.link Documentation](https://magic.link/docs)
- Open an issue in this repository

## 🔮 Roadmap

- [ ] Multi-chain support (Polygon, Arbitrum, Optimism)
- [ ] NFT gallery and management
- [ ] DeFi integrations (swaps, lending)
- [ ] Mobile app development
- [ ] Advanced recovery mechanisms
- [ ] Social recovery features

---

Built with ❤️ using [ZeroDev](https://zerodev.app/) and [Magic.link](https://magic.link/)
