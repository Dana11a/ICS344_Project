#  ICS344 Project – DVSA Vulnerability Discovery & Remediation

##  Overview

This project demonstrates **security vulnerabilities in a serverless AWS application (DVSA)** and how they were **exploited and fixed**.

The system uses:

* AWS Lambda
* API Gateway
* Amazon S3
* CloudWatch
* IAM Roles

Each lesson focuses on a **real-world security issue**, including:

* Exploitation (attack)
* Root cause analysis
* Fix implementation
* Verification after fix

---

##  Live Application

 http://dvsa-website-test-433289389471-us-east-1.s3-website.us-east-1.amazonaws.com/

---

##  Demo Video

 https://drive.google.com/drive/folders/10ci3lfKIyDykMrbUelBpy-nM2ejbzhNG

---

##  Lessons Covered

### 🔹 Lesson 1: Event Injection

* Vulnerability: Remote Code Execution (RCE)
* Cause: Insecure deserialization (`node-serialize`)
* Fix: Replace with `JSON.parse` + input validation

---

### 🔹 Lesson 2: Broken Authentication

* Vulnerability: JWT token manipulation
* Cause: No signature verification
* Fix: Verify JWT using Cognito JWKS

---

### 🔹 Lesson 3: Sensitive Information Disclosure

* Vulnerability: Code injection → data leak
* Impact: Access to S3 receipts
* Fix: Input validation + whitelist + safe parsing

---

### 🔹 Lesson 4: Insecure Cloud Configuration

* Vulnerability: Public S3 write access
* Cause: Misconfigured bucket policy
* Fix: Restrict access to authorized IAM roles

---

### 🔹 Lesson 5: Broken Access Control

* Vulnerability: Privilege escalation
* Cause: Missing authorization checks
* Fix: Enforce admin validation + least privilege

---

### 🔹 Lesson 6: Denial of Service (DoS)

* Vulnerability: API flooding
* Cause: No rate limiting
* Fix: API Gateway throttling

---

### 🔹 Lesson 7: Over-Privileged Function

* Vulnerability: Excessive IAM permissions
* Impact: Access to Cognito, S3, DynamoDB
* Fix: Apply Principle of Least Privilege

---

### 🔹 Lesson 8: Logic Vulnerabilities

* Vulnerability: Business logic flaws
* Fix: Validate workflows and enforce rules

---

### 🔹 Lesson 9: Vulnerable Dependencies

* Vulnerability: Unsafe libraries
* Fix: Update/remove insecure dependencies

---

### 🔹 Lesson 10: Unhandled Exceptions

* Vulnerability: System crashes & info leaks
* Fix: Proper error handling

---

## Project Structure

```
ICS344_PROJECT/
│
├── Lessons/
│   ├── Lesson1/
│   │   ├── exploit/
│   │   ├── vulnerable-code/
│   │   ├── fixed-code/
│   │   ├── screenshots/
│   │   ├── slides/
│   │   └── Lesson1.md
│   │
│   ├── Lesson2/
│   ├── Lesson3/
│   ├── Lesson4/
│   ├── Lesson5/
│   ├── Lesson6/
│   ├── Lesson7/
│   ├── Lesson8/
│   ├── Lesson9/
│   └── Lesson10/
│
├── Presentation-Slides/
│   └──DVSA-Presentation.pdf
│
├── DemoVideoRecording/
│   └── drive-link.txt
│
├── Report/
│   └── ICS344-Project-Report.pdf
│
└── README.md
```

---

##  Key Security Concepts

* Input Validation
* Secure Deserialization
* JWT Verification
* Least Privilege Principle
* Rate Limiting
* Secure Cloud Configuration
* Defense in Depth

---

## Key Takeaways

* Never trust user input
* Always validate and sanitize data
* Apply least privilege in IAM
* Secure serverless architectures require **multiple layers of defense**
* Misconfigurations can be as dangerous as code vulnerabilities

---

## Authors

* Danh Alsawad
* Jana Alkahlan

---

## Course

ICS 344 – Information Security
 – Spring 2026

---
