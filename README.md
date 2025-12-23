# Digital Signature

A TypeScript library for creating and verifying digitally signed URLs using ECDSA (ES256) signatures. Keys are securely stored and retrieved from AWS Systems Manager Parameter Store.

## Features

- Sign plaintext strings with ECDSA ES256
- Verify signatures against public keys
- Generate signed URLs with expiration, nonces, and custom parameters
- Verify signed URLs
- Automatic key caching for improved performance
- AWS SSM Parameter Store integration

## Installation

```bash
npm install @360mediadirect/digital-signature
```

## Prerequisites

- AWS credentials configured with access to SSM Parameter Store
- EC private and public keys stored in AWS SSM at `/periodical/dig-sig/keys/{public|private}/{keyId}`

## Usage

### Basic Setup

```typescript
import { DigitalSignature } from '@360mediadirect/digital-signature'

// Initialize with a key ID
const digSig = new DigitalSignature('20230524')

// Or use environment variable DIGITAL_SIGNATURE_KEY_ID
const digSig = new DigitalSignature()
```

### Signing Plaintext

```typescript
const plainText = 'https://example.com/resource'
const signature = await digSig.sign(plainText)
console.log(signature) // Base64 signature string
```

### Verifying Signatures

```typescript
const isValid = await digSig.verify(
  'https://example.com/resource',
  'signature-string',
  '20230524' // optional: keyId, defaults to constructor keyId
)
console.log(isValid) // true or false
```

### Building Signed URLs

```typescript
const signedUrl = await digSig.buildSignedUrl({
  unsignedUrlStr: 'https://example.com/resource/page.html',
  userId: '94a637e3-2c58-4f78-8466-d96667adfe1d',
  entitlementId: '94a637e3-2c58-4f78-9999-d96667adfe1d',
  clientId: 'client-123',
  expiresAt: Date.now() + 3600000 // optional: 1 hour from now
})
// Returns: https://example.com/resource/page.html?expiresAt=...&keyId=...&userId=...&entitlementId=...&nonce=...&signature=...&clientId=...
```

### Verifying Signed URLs

```typescript
const isValid = await digSig.verifySignedUrl(
  'https://example.com/resource/page.html?expiresAt=...&keyId=...&signature=...'
)
console.log(isValid) // true or false
```

### Building URL Parameters

```typescript
const params = await digSig.buildUrlParams(
  'https://example.com/resource',
  {
    userId: '94a637e3-2c58-4f78-8466-d96667adfe1d',
    expiresAt: Date.now() + 300000 // optional: 5 minutes from now
  }
)
console.log(params)
// {
//   expiresAt: 1685459800270,
//   keyId: '20230524',
//   userId: '94a637e3-2c58-4f78-8466-d96667adfe1d',
//   nonce: '2109c464893b',
//   signature: 'hIfHFioY_QRSCw1F8gtVlI...'
// }
```

## API Reference

### `constructor(keyId?: string)`

Creates a new DigitalSignature instance.

- `keyId` (optional): The key ID to use. Defaults to `process.env.DIGITAL_SIGNATURE_KEY_ID`

### `sign(plainText: string): Promise<string>`

Signs a plaintext string using the private key.

- Returns: Base64-encoded signature string

### `verify(encryptedText: string, signature: string, pubKeyId?: string): Promise<boolean>`

Verifies a signature against plaintext.

- `encryptedText`: The original plaintext
- `signature`: The signature to verify
- `pubKeyId` (optional): Public key ID to use for verification. Defaults to constructor keyId
- Returns: `true` if valid, `false` otherwise

### `buildUrlParams(urlStr: string, urlParams?: Partial<SignedUrlParameters>): Promise<SignedUrlParameters>`

Generates signed URL parameters.

- `urlStr`: The URL to sign
- `urlParams` (optional): Additional parameters to include
- Returns: Object containing all signed URL parameters

### `buildSignedUrl(options): Promise<string>`

Builds a complete signed URL.

Options:
- `unsignedUrlStr`: The URL to sign (required)
- `userId` (optional): User identifier
- `entitlementId` (optional): Entitlement identifier
- `clientId` (optional): Client identifier
- `expiresAt` (optional): Expiration timestamp in milliseconds. Defaults to 5 minutes from now

Returns: Complete signed URL string

### `verifySignedUrl(signedUrlStr: string): Promise<boolean>`

Verifies a signed URL's signature.

- Returns: `true` if valid, `false` otherwise

## Environment Variables

- `DIGITAL_SIGNATURE_KEY_ID`: Default key ID to use if not specified in constructor

## AWS SSM Key Storage

Keys must be stored in AWS Systems Manager Parameter Store at:

- Private keys: `/periodical/dig-sig/keys/private/{keyId}` (encrypted)
- Public keys: `/periodical/dig-sig/keys/public/{keyId}`

Keys should be in PEM format (EC256).

## Development

### Run Tests

```bash
npm test
```

### Build

```bash
npm run build
```

### Clean

```bash
npm run clean
```

## License

ISC

## Author

Steve Yardumian <steve@360mediadirect.com>
