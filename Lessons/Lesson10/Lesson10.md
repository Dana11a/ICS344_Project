
---

# ICS344_Project

# DVSA Lesson 10 — Unhandled Exceptions (Information Leakage)

## Overview

This lesson demonstrates an **Unhandled Exceptions** vulnerability in the Damn Vulnerable Serverless Application (DVSA), where backend errors are returned directly to the client without proper sanitization.

## Vulnerability

The Lambda function (`DVSA-ORDER-MANAGER`) does not properly handle exceptions and directly returns error responses from invoked services.

This results in exposure of sensitive internal information such as:

```
stackTrace
internal file paths (/var/task/...)
error types (KeyError, ClientError)
code references
```

This information leakage can help attackers understand the backend structure and craft more advanced attacks.

---

## Exploitation Steps

### Phase 1 — Trigger Unhandled Exception

1. Send a malformed request (missing required fields):

```bash
curl -s -X POST "https://<API_ID>.execute-api.us-east-1.amazonaws.com/dvsa/order" \
-H "Authorization: $TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "action":"shipping"
}'
```

---

### Phase 2 — Observe Information Leakage

2. Result:

```json
{
  "errorMessage": "'orderId'",
  "errorType": "KeyError",
  "stackTrace": [
    "File \"/var/task/order_shipping.py\", line 18 ..."
  ]
}
```

---

### Impact

* Internal Lambda file paths exposed
* Backend logic revealed
* Debugging information leaked to attacker
* Enables further exploitation

---

## Fix Applied

* Added centralized error handling in Lambda
* Wrapped response processing inside `try-catch`
* Blocked sensitive fields:

```
errorMessage
errorType
stackTrace
```

* Returned only generic error messages to clients:

```json
{"status":"error","message":"Something went wrong"}
```

* Kept full error details only in CloudWatch logs

---

## Verification

After applying the fix, the same malformed request was executed again:

```bash
curl -s -X POST "https://<API_ID>.execute-api.us-east-1.amazonaws.com/dvsa/order" \
-H "Authorization: $TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "action":"shipping"
}'
```

---

### Result:

```json
{"status":"error","message":"Something went wrong"}
```

---

### Verification Outcome:

* No stack traces returned

* No internal file paths exposed

* No backend error details leaked

* Errors are safely handled

* Legitimate requests still function correctly

---

## Folder Structure

* fixed-code/ → updated Lambda code with error handling

* vulnerable-code/ → original Lambda code (no sanitization)

* screenshots/ → evidence (attack + fix validation)

  * Lesson10-Exploit-UnhandledException-StackTraceLeak.png
  * Lesson10-PostFix-NoStackTrace-SanitizedError.png

* Lesson10.md → readme file

---

## How to Reproduce

1. Obtain valid JWT token
2. Send malformed request (missing required fields)
3. Observe stack trace and internal error leak
4. Apply fix (add try-catch + sanitize response)
5. Repeat request
6. Observe generic error response
7. Confirm no sensitive data is exposed

---

## Security Lesson

Serverless applications must implement **secure error handling**.

Returning raw backend errors exposes sensitive internal details that can assist attackers in understanding and exploiting the system.

Applying **error sanitization and centralized exception handling** ensures that only safe, generic responses are returned while preserving detailed logs internally for debugging.

---
