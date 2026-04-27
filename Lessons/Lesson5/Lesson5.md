

# Lesson #5: Broken Access Control

### Code Injection → Unauthorized Order Payment

---

## Overview

This project demonstrates a **Broken Access Control vulnerability** in a serverless AWS application.
By exploiting **unsafe deserialization**, a non-admin user can execute arbitrary code inside a Lambda function and invoke internal **admin-only functionality**.

The attack results in **unauthorized modification of order status** (e.g., marking an order as *paid* without completing payment).

---

## Vulnerability Summary

* **Type:** Broken Access Control + Remote Code Execution (RCE)
* **Cause:** Insecure deserialization (`node-serialize`)
* **Component:** `DVSA-ORDER-MANAGER` (AWS Lambda)
* **Impact:** Privilege escalation and unauthorized order manipulation

---

## Root Cause

The application processes user input using:

```js
serialize.unserialize(event.body)
```

This is unsafe because:

* Executes attacker-controlled input
* Supports function injection via `_$$ND_FUNC$$_`
* Lacks input validation and sanitization

Additionally:

* No authorization checks on sensitive actions
* Over-privileged IAM role allows invoking admin Lambda

---

## Target Endpoint

```
https://82gs6ao5w2.execute-api.us-east-1.amazonaws.com/Stage/order
```

---

## Exploit Overview

The attacker injects a malicious function into the request body:

* Uses `_$$ND_FUNC$$_` pattern
* Executes inside Lambda during deserialization
* Invokes `DVSA-ADMIN-UPDATE-ORDERS`
* Changes order status to **paid**

---

## Exploit Example

```bash
curl -X POST "https://82gs6ao5w2.execute-api.us-east-1.amazonaws.com/Stage/order" \
-H "Content-Type: application/json" \
-H "authorization: <JWT_TOKEN>" \
-d '{"action":"_$$ND_FUNC$$_function(){/* invoke admin lambda */}()"}'
```

---

## Proof of Exploit

| Step   | Result                     |
| ------ | -------------------------- |
| Before | Order status = `processed` |
| After  | Order status = `paid`      |

- Confirms code execution
- Confirms admin function invocation
- Confirms broken access control

---

## Fix Implementation

### 1. Replace Unsafe Deserialization

```js
//  Vulnerable
serialize.unserialize(event.body)

//  Secure
JSON.parse(event.body)
```

---

### 2. Add Authorization Control

```js
const adminOnly = ["complete", "admin-orders"];

if (adminOnly.includes(req.action) && isAdmin !== "true") {
    return { status: "err", msg: "Forbidden" };
}
```

---

### 3. Optional Input Validation

```js
if (event.body.includes("_$$ND_FUNC$$_")) {
    return { status: "err", msg: "Malicious input detected" };
}
```

---

## Verification After Fix

* Exploit no longer executes
* Response:

  ```json
  {"status":"err","msg":"Invalid JSON"}
  ```
* Order status remains unchanged

- Vulnerability successfully mitigated
- Application functionality preserved

---

## Security Analysis

### Intended Behavior

* Only admins can update order status
* Input treated strictly as data

### Exploit Behavior

* Input executed as code
* Admin Lambda invoked by non-admin
* Unauthorized state change

### Fix Outcome

* Input safely parsed
* Code execution prevented
* Access control enforced

---

## Lessons Learned

* Never trust user input
* Avoid unsafe deserialization libraries
* Enforce authorization at entry points
* Apply least privilege (IAM)
* Use defense in depth

---

## Tools Used

* AWS API Gateway
* AWS Lambda
* AWS DynamoDB
* CloudWatch Logs
* curl

---

## Project Structure

```
vulnerable-code/
fixed-code/
exploit/
screenshots/
```

---

## ▶Reproduction Steps

1. Deploy DVSA environment
2. Create a normal order
3. Capture JWT token
4. Run exploit request
5. Observe status change to **paid**
6. Apply fix
7. Re-test → exploit fails

---

## Conclusion

This vulnerability demonstrates how **unsafe deserialization + missing authorization + excessive permissions** can combine into a critical security flaw.
Proper input handling and strict access control are essential in serverless architectures.

---

## License

For educational purposes only.

---
