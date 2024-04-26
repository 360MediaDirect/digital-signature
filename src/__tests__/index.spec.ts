/* eslint-disable @typescript-eslint/no-explicit-any */
import { DigitalSignature } from '../index'

jest.setTimeout(30e3)

let digSig

describe(`Digital Signature`, () => {
  beforeEach(() => {
    digSig = new DigitalSignature()
    digSig.ssm.getParameter = jest.fn().mockImplementation((opts) => {
      return {
        promise: () => {
          return new Promise((resolve, _reject) => {
            if (opts.WithDecryption) {
              resolve({
                Parameter: {
                  Value:
                    '-----BEGIN EC PRIVATE KEY-----|MHQCAQEEIOlhAv8I1Z5luoMbI6nhsyfBRA/i5YWtE0WrrXUYuab9oAcGBSuBBAAK|oUQDQgAEL8h4gT11geJS9H23KQAiWc0FRccEJJ8lt0oJ2e30A7FA5IV6508SnxBC|27L9JV5mSe84aLnY6lVUZsSNyDtnWg==|-----END EC PRIVATE KEY-----'.replace(
                      /\|/g,
                      '\n'
                    )
                }
              })
            } else {
              resolve({
                Parameter: {
                  Value:
                    '-----BEGIN PUBLIC KEY-----|MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEL8h4gT11geJS9H23KQAiWc0FRccEJJ8l|t0oJ2e30A7FA5IV6508SnxBC27L9JV5mSe84aLnY6lVUZsSNyDtnWg==|-----END PUBLIC KEY-----'.replace(
                      /\|/g,
                      '\n'
                    )
                }
              })
            }
          })
        }
      }
    })
  })

  afterAll(() => {})

  it('sign(plainText)', async () => {
    const signature = await digSig.sign(
      'https://pageraftstaging.nxtbook.com/360mediadirect/us_weekly/demo_full168546242993594a637e3-2c58-4f78-8466-d96667adfe1d950115a2a1b0'
    )
    expect(signature).toBeDefined()
  })

  it('verify(encryptedText, signature, pubKeyId?)', async () => {
    const verification = await digSig.verify(
      'https://pageraftstaging.nxtbook.com/360mediadirect/us_weekly/demo_full168546242993594a637e3-2c58-4f78-8466-d96667adfe1d950115a2a1b0',
      'ynL_6eDmLO68PdxmkJsOs2OHn28tl_DGnQe9L84a9MesiNM51Oq9QJJnauLLFoZn0xiYlxHiz3iDR9J3su8orQ'
    )
    expect(verification).toEqual(true)
  })

  it('buildUrlParams(urlStr, urlParams?)', async () => {
    const urlParams = await digSig.buildUrlParams(
      'https://pageraftstaging.nxtbook.com/360mediadirect/us_weekly/demo_full/cover.html?expiresAt=1685459800270&keyId=20230524&userId=94a637e3-2c58-4f78-8466-d96667adfe1d&nonce=2109c464893b&signature=hIfHFioY_QRSCw1F8gtVlI9Tlvu-76xAO8f1_G5Y0spWy7_DhbSDMMPsSz2bsxzL38oBgbaUyioGX9JSfhv7aA&clientId=steve-postman'
    )
    expect(urlParams).toEqual({
      expiresAt: '1685459800270',
      keyId: '20230524',
      userId: '94a637e3-2c58-4f78-8466-d96667adfe1d',
      nonce: '2109c464893b',
      signature:
        'hIfHFioY_QRSCw1F8gtVlI9Tlvu-76xAO8f1_G5Y0spWy7_DhbSDMMPsSz2bsxzL38oBgbaUyioGX9JSfhv7aA',
      clientId: 'steve-postman'
    })
  })

  it('buildSignedUrl(unsignedUrlStr, userId, entitlementId, clientId?)', async () => {
    const signedUrl = await digSig.buildSignedUrl(
      'https://pageraftstaging.nxtbook.com/360mediadirect/us_weekly/demo_full/cover.html',
      '94a637e3-2c58-4f78-8466-d96667adfe1d',
      '94a637e3-2c58-4f78-9999-d96667adfe1d',
      'steve-postman'
    )
    expect(signedUrl).toBeDefined()
  })

  it('verifySignedUrl(signedUrl)', async () => {
    const verification = await digSig.verifySignedUrl(
      'https://pageraftstaging.nxtbook.com/360mediadirect/us_weekly/demo_full/cover.html?expiresAt=1685462429935&keyId=20230524&userId=94a637e3-2c58-4f78-8466-d96667adfe1d&nonce=950115a2a1b0&signature=ynL_6eDmLO68PdxmkJsOs2OHn28tl_DGnQe9L84a9MesiNM51Oq9QJJnauLLFoZn0xiYlxHiz3iDR9J3su8orQ&clientId=steve-postman'
    )
    expect(verification).toEqual(true)
  })
})
