import jwa from 'jwa'
import AWS from 'aws-sdk'
import { v4 as uuidv4 } from 'uuid'
import { parse as parseQuery } from 'querystring'

const ecdsa = jwa('ES256')

interface KeyStore {
  public: Record<string, string>
  private: Record<string, string>
}

export interface SignedUrlParameters {
  expiresAt: number
  nonce: string
  userId: string
  entitlementId?: string
  clientId: string
  signature: string
  keyId: string
}

export class DigitalSignature {
  public ssm: AWS.SSM

  private keyId: string

  private keys: KeyStore = {
    public: {},
    private: {},
  }

  /**
   *
   * @param keyId
   */
  constructor(keyId: string = process.env.DIGITAL_SIGNATURE_KEY_ID || null) {
    this.ssm = new AWS.SSM()
    this.keyId = keyId
  }

  /**
   * Retrieves a key from Parameter Store. Keys are cached for the lifetime of
   * this DigitalSignature instance.
   * @param type Either 'public' or 'private'
   * @param id The ID of the key to be retrieved
   * @returns The specified key as it's stored in Parameter Store
   */
  private async getKey(
    type: 'public' | 'private',
    id: string,
  ): Promise<string> {
    if (!this.keys[type][id]) {
      const ssmResponse = await this.ssm
        .getParameter({
          Name: `/periodical/dig-sig/keys/${type}/${id}`,
          ...(type === 'private' && { WithDecryption: true }),
        })
        .promise()
      this.keys[type][id] = ssmResponse.Parameter.Value
    }
    return this.keys[type][id]
  }

  /**
   *
   * @param plainText
   * @returns digital signature string
   */
  public async sign(plainText: string) {
    const privKey = await this.getKey('private', this.keyId)
    return ecdsa.sign(plainText, privKey)
  }

  /**
   *
   * @param encryptedText
   * @param signature
   * @param pubKeyId the ID of the public key to use for verification. If not
   * specified, the keyId given to the constructor will be used.
   * @returns true or false
   */
  public async verify(
    encryptedText: string,
    signature: string,
    pubKeyId = this.keyId,
  ) {
    const pubKey = await this.getKey('public', pubKeyId)
    return ecdsa.verify(encryptedText, signature, pubKey)
  }

  /**
   * Gets a cleaned version of the provided URL, appropriate for concatenation
   * into the signature input.
   * @param urlStr The url to be cleaned
   * @returns A signable URL fragment
   */
  private getBaseUrl(urlStr: string): string {
    const url = new URL(urlStr)
    const cleanPath = (
      url.pathname.match(/\.\w{2,5}$/g)
        ? url.pathname.split('/').slice(0, -1).join('/')
        : url.pathname
    ).replace(/\/+$/g, '')
    return `${url.protocol}//${url.hostname}${cleanPath}`
  }

  /**
   * Generates an object containing all the parameters expected in a signed
   * URL. For URLs that are not yet signed, parameters such as the nonce,
   * expiration date, and signature will be generated. For already-signed
   * URLs, a parsed version of the URL parameters will be provided.
   * @param urlStr The URL to be signed, or a signed URL
   * @param urlParams The params to add to, or override from, the URL
   * @returns All the parameters expected in a signed URL
   */
  public async buildUrlParams(
    urlStr: string,
    urlParams: Partial<SignedUrlParameters> = {},
  ): Promise<SignedUrlParameters> {
    const params = {
      ...parseQuery(urlStr.split('?').slice(-1)[0]),
      ...urlParams,
    }
    if (!params.userId) throw new Error('No userId found in params')
    if (!params.expiresAt) params.expiresAt = Date.now() + 300e3
    if (!params.nonce) params.nonce = uuidv4().split('-').slice(-1)
    if (!params.keyId) params.keyId = this.keyId
    if (!params.signature) {
      const signable = this.buildSignable(urlStr, params as SignedUrlParameters)
      params.signature = await this.sign(signable)
    }
    return params as SignedUrlParameters
  }

  /**
   * Builds a concatenated string appropriate for signing or verification
   * @param url The URL to be signed or verified
   * @param params The parameters to be included {@link #buildUrlParams}
   * @returns A string with the correct elements concatenated in the correct order
   */
  private buildSignable(url: string, params: SignedUrlParameters): string {
    const baseUrl = this.getBaseUrl(url)
    return `${baseUrl}${params.expiresAt}${params.userId}${params.nonce}`
  }

  /**
   *
   * @param unsignedUrlStr
   * @param userId
   * @param entitlementId
   * @param clientId (optional)
   * @returns signed url
   */
  public async buildSignedUrl(
    unsignedUrlStr: string,
    userId: string,
    entitlementId?: string,
    clientId?: string,
  ) {
    const params = await this.buildUrlParams(unsignedUrlStr, {
      userId,
      entitlementId,
    })
    const unsignedUrl = new URL(unsignedUrlStr)

    return `${unsignedUrlStr}${unsignedUrl.search ? '&' : '?'}expiresAt=${
      params.expiresAt
    }&keyId=${this.keyId}&userId=${params.userId}${
      params.entitlementId ? `&entitlementId=${params.entitlementId}` : ''
    }&nonce=${params.nonce}&signature=${params.signature}${
      clientId ? `&clientId=${clientId}` : ''
    }`
  }

  /**
   * Verifies the signature on a URL signed by the same process as this library.
   * @param signedUrl The signed URL with all parameters intact
   * @returns true if the signature is valid; false otherwise
   */
  public async verifySignedUrl(signedUrlStr: string): Promise<boolean> {
    const params = await this.buildUrlParams(signedUrlStr)
    const signable = this.buildSignable(signedUrlStr, params)
    return this.verify(signable, params.signature, params.keyId)
  }
}
