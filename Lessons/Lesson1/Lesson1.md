# ICS344_Project
# DVSA Lesson 1 — Event Injection (RCE)

## Overview

This project demonstrates a Remote Code Execution (RCE) vulnerability in the Damn Vulnerable Serverless Application (DVSA) caused by insecure deserialization.

## Vulnerability

The application uses `node-serialize` to unserialize user input, allowing attackers to inject and execute malicious JavaScript using the `$$ND_FUNC$$` pattern.

## Exploitation Steps

1. Send a crafted request using curl:

```
curl -X POST "<API_URL>" \
-H "Content-Type: application/json" \
-d '{"action":"_$$ND_FUNC$$_function(){...}()","cart-id":""}'
```

2. Check CloudWatch logs:

```
/aws/lambda/DVSA-ORDER-MANAGER
```

3. Confirm code execution from logs.

## Fix Applied

* Removed `node-serialize`
* Replaced with `JSON.parse`
* Added input validation and allowlisting
* Blocked malicious patterns

## Verification

After applying the fix:

* Attack request is rejected
* No malicious logs appear
* Code execution is prevented

## Folder Structure

* `vulnerable-code/`: original vulnerable code
* `fixed-code/`: patched code
* `exploit/`: attack commands
* `screenshots/`: proof of attack and fix
* `report/`: final report

## How to Reproduce

1. Deploy DVSA on AWS
2. Locate API Gateway endpoint
3. Run exploit command
4. Check CloudWatch logs
5. Apply fix and test again
