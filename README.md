# ZeroWallet - User-Friendly Web3 Wallet

A modern, secure Ethereum wallet built with ZeroDev's smart account infrastructure, featuring passkey authentication and social login capabilities.

## 🌟 Features

### Authentication Methods
- **Social Login First**: Start with easy email/social authentication using Magic.link
- **Progressive Security**: Add passkeys for enhanced multi-signature security
- **Passkey Authentication**: Secure biometric authentication using WebAuthn (Face ID, Touch ID, Windows Hello)
- **No Seed Phrases**: Eliminate the complexity of traditional wallet management

### Multi-Signature Security
- **Progressive Enhancement**: Start with social login, upgrade to multi-sig by adding passkeys
- **Flexible Policies**: Configure signature thresholds and high-value transaction requirements
- **Multiple Signers**: Support for both social login and passkey validators
- **Secure Recovery**: Multiple authentication methods prevent account lockout

### Smart Account Benefits
- **Gas Sponsorship**: Transactions sponsored by ZeroDev (no ETH needed for gas)
- **Account Abstraction**: ERC-4337 compliant smart accounts
- **Multi-Signature Support**: Enhanced security with configurable signature requirements
- **Batch Transactions**: Execute multiple operations in a single transaction

### User Experience
- **Intuitive Interface**: Clean, modern design built with Tailwind CSS
- **Real-time Balance**: Live ETH balance updates
- **Transaction History**: Complete transaction tracking with status updates
- **Demo Features**: NFT minting and token sending capabilities

## 🔐 Multi-Signature Workflow

### Getting Started with Multi-Sig
1. **Initial Setup**: Login with social authentication (Google, GitHub, or email)
2. **Add Security**: Navigate to Security Settings and add a passkey signer
3. **Configure Policy**: Set signature thresholds and high-value transaction limits
4. **Enhanced Security**: Transactions now require multiple signatures based on your policy

### Multi-Sig Transaction Flow
1. **Transaction Creation**: User initiates a transaction
2. **Policy Check**: System determines if multi-sig is required based on:
   - Transaction value vs. high-value threshold
   - Current security policy settings
3. **Signature Collection**: Required signers approve the transaction
4. **Execution**: Transaction executes once threshold is met

### Security Settings
- **Signer Management**: Add/remove passkeys and view active signers
- **Signature Policies**: Configure when multi-sig is required
- **Threshold Settings**: Set how many signatures are needed
- **High-Value Limits**: Automatic multi-sig for large transactions

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
- **AuthContext**: Manages authentication state and multi-signer operations
- **PasskeyService**: Handles WebAuthn passkey operations
- **SocialLoginService**: Manages Magic.link social authentication
- **MultiValidatorService**: Coordinates multiple authentication methods

#### Wallet Layer
- **WalletContext**: Manages wallet state, transactions, and multi-sig operations
- **WalletService**: Core wallet operations and smart account management

#### Multi-Signature Components
- **SignerManagement**: Interface for adding/removing signers
- **SecuritySettings**: Comprehensive security configuration page
- **MultiSigTransactionModal**: Transaction signing interface
- **SignerCard**: Individual signer display component

#### UI Components
- **LoginForm/RegisterForm**: Authentication interfaces
- **WalletDashboard**: Main wallet interface with security status
- **SendTransaction**: Transaction sending modal
- **MintNFT**: Demo NFT minting functionality

### Technology Stack
- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Heroicons
- **Blockchain**: Viem, ZeroDev SDK
- **Authentication**: WebAuthn, Magic.link
- **Smart Accounts**: ERC-4337, Kernel accounts
- **Multi-Signature**: ZeroDev Weighted Validator, Custom Multi-Validator Service

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
