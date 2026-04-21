# ICS344_Project

# DVSA Lesson 4 — Insecure Cloud Configuration (S3 Public Access)

## Overview

This lesson demonstrates an Insecure Cloud Configuration vulnerability in the Damn Vulnerable Serverless Application (DVSA), where an S3 bucket is misconfigured to allow public write access.

## Vulnerability

The S3 bucket policy allows `"Principal": "*"` with `s3:PutObject`, meaning **any user (even unauthenticated)** can upload files.
This allows attackers to store malicious or unauthorized content that may later be processed by backend services (e.g., Lambda).

## Exploitation Steps

1. Identify DVSA S3 bucket in AWS Console (e.g., `dvsa-feedback-bucket-<id>`)

2. Check bucket policy:

   * Public access (`"Principal": "*"`)
   * `s3:PutObject` allowed

3. Create a malicious file:

```bash
echo "malicious" > exploit.raw
```

4. Upload file without authentication:

```bash
aws s3 cp exploit.raw s3://dvsa-feedback-bucket-<id>/ --no-sign-request
```

5. Result:

   * Upload succeeds without credentials (unauthorized access)

6. Trigger system behavior:

   * Place an order in DVSA application

7. Check CloudWatch logs:

   * S3 event `ObjectCreated:Put` detected
   * Confirms system processes attacker-controlled file

---

## Fix Applied

* Removed public access (`"Principal": "*"`)
* Restricted access to AWS account only
* Removed unnecessary permissions (e.g., `PutObjectAcl`)
* Applied least privilege principle in S3 bucket policy

---

## Verification

After applying the fix:

```bash
aws s3 cp exploit.raw s3://dvsa-feedback-bucket-<id>/ --no-sign-request
```

* Result:

  ```
  AccessDenied
  ```

* Unauthorized upload is blocked

* Legitimate AWS account access still works

---

## Folder Structure

* fixed-config/ → updated S3 bucket policy
* screenshots/ → evidence (attack + fix validation)

  * Bucket policy (vulnerable)
  * Unauthorized upload success
  * CloudWatch log event
  * After fix (AccessDenied)
* Lesson4.md → readme file

---

## How to Reproduce

1. Open AWS Console → S3
2. Locate DVSA bucket
3. Verify public write access in bucket policy
4. Create test file locally
5. Upload using AWS CLI with `--no-sign-request`
6. Observe successful unauthorized upload
7. Apply fixed bucket policy
8. Repeat upload → should fail

---

## Security Lesson

Never allow public write access to cloud storage.
Always enforce **least privilege** and restrict access to trusted identities only.
Misconfigured cloud resources can lead to severe security risks, especially in serverless systems where uploaded data is automatically processed.
