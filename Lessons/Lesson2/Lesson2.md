# ICS344_Project
# DVSA Lesson 2 — Broken Authentication (JWT Manipulation)

## Overview

This lesson demonstrates a Broken Authentication vulnerability in the Damn Vulnerable Serverless Application (DVSA), where JWT tokens are trusted without signature verification.

## Vulnerability

The backend decodes the JWT payload and directly trusts user-controlled fields (username, sub) without verifying the token signature. This allows attackers to modify the token payload and impersonate another user (account takeover).

## Exploitation Steps

1. Capture a valid JWT token from browser DevTools (User B)
2. Decode the token to extract payload
3. Modify payload:
   - Replace username and sub with victim user (User C)
4. Re-encode the token (keeping original signature)
5. Use forged token:

curl -s "$API" \
-H "content-type: application/json" \
-H "authorization: $FAKE_AS_C" \
--data-raw '{"action":"orders"}' | jq

6. Result:
   - User C’s orders are returned (unauthorized access)

7. Fetch full order details:

curl -s "$API" \
-H "content-type: application/json" \
-H "authorization: $FAKE_AS_C" \
--data-raw '{"action":"get","order-id":"<ORDER_ID>"}' | jq

## Fix Applied

- Added JWT signature verification using Cognito JWKS
- Implemented verifyCognitoJwt() function
- Validated token claims (issuer, expiration, token_use)
- Removed manual JWT decoding
- Replaced with secure verification flow

## Verification

After applying the fix:

- Forged token returns:
  { "status": "err", "msg": "invalid token" }

- Attack no longer works
- Only valid signed tokens are accepted
- Legitimate users can still access their own data

## Folder Structure

- fixed-code/ → patched Lambda code (order-manager.js)
- screenshots/ → evidence (attack + fix validation)
  - Normal behavior
  - Token decoding
  - Forged token creation
  - Exploit result
  - Full order details
  - DevTools token capture
  - After fix result
- Lesson2.md → readme file

## How to Reproduce

1. Deploy DVSA on AWS
2. Open application in browser
3. Capture JWT from DevTools
4. Decode and modify payload
5. Re-encode and send request using curl
6. Observe unauthorized access
7. Apply fix (JWT verification)
8. Repeat attack → should fail

## Security Lesson

Never trust JWT payload data without verifying the signature. Always validate tokens using trusted identity providers (e.g., AWS Cognito JWKS).