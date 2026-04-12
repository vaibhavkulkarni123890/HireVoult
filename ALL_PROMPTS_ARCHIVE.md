# VouchHire AI - Complete Prompts Archive
*Generated: April 8, 2026*
*This file contains ALL prompts extracted from the VouchHire AI project*

---

## TABLE OF CONTENTS
1. [Question Generation Prompts](#question-generation-prompts)
2. [Toast Messages (User Feedback)](#toast-messages-user-feedback)
3. [Proctoring Messages](#proctoring-messages)
4. [System Messages](#system-messages)
5. [Theory Question Generation Prompt](#theory-question-generation-prompt)
6. [Rate Limiting Messages](#rate-limiting-messages)
7. [Error Messages](#error-messages)
8. [Confirmation & Status Messages](#confirmation--status-messages)

---

## QUESTION GENERATION PROMPTS

### Main Question Generation Prompt (MCQ & Coding)

```
You are an expert technical interviewer. Generate a complete technical assessment for the following role.

Job Role:
Title: ${title}
Experience: ${experienceYears} years
Company/Project Context: ${about}
JD: ${jd}
Required Skills: ${(skills || []).join(', ')}
Languages: ${languages.join(', ')}
MCQ Difficulty: ${mcqConfig.difficulty}
Coding Difficulty: ${codingConfig.difficulty}

Generate EXACTLY:
- ${mcqCount} MCQ questions
- ${codingCount} Coding Problems

••••••••••••••MCQ RULES – CRITICAL:
- Questions MUST test genuine technical knowledge – NOT company culture or JD rephrasing
- NEVER ask questions whose answers can be found by reading the JD
- NEVER ask about years of experience, team behavior, or soft skills
- ALWAYS ask about concrete technical concepts relevant to the role

DEDUPLICATION RULES:
- Never ask two questions about the same concept
- Load balancing and load balancer are the same topic – ask only once
- Message queue and message broker are the same topic – ask only once
- Each MCQ must test a completely different technical concept
- Before finalizing, verify all questions test distinct concepts

TECHNICAL FOCUS AREAS (Prioritize based on role):
- Backend/Systems: CAP theorem, ACID, Concurrency (race conditions, deadlocks), Indexing, Sharding, Load balancing, Message queues, REST/GraphQL trade-offs.
- Frontend: Rendering lifecycle, Shadow DOM, State management, Performance (LCP/FID), CSS Grid/Flexbox internals, Web Security (XSS/CSRF).
- Role Context: If the role is for "${about}", pick concepts vital for THAT specific type of product.

MCQ FORMAT:
- 4 technically plausible options (A/B/C/D). Wrong options must be common misconceptions.
- correctOption is 0-indexed integer.
- timeLimit: 120 seconds, points: 5.

MCQ REASONING – MUST follow this specific format (DO NOT include "Why this question" prefix):
"Tests understanding of [specific technical concept] which is directly relevant to [specific aspect of THIS role/company type] because [concrete technical reason why it matters for their actual work]"
•••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
CODING RULES – CRITICAL:
1. Each problem MUST be purely ALGORITHMIC (Arrays, Strings, Trees, DP, Math). No frameworks.
2. MUST have EXACTLY 2 visible test cases (isVisible: true) and EXACTLY 2 hidden test cases (isVisible: false).
3. Starter code function MUST be named "solution".
4. timeLimit: Hard = 2700s, Medium = 1200s, Easy = 900s.
5. points: 20 per problem.

MULTI-INPUT PROBLEMS:
- Problems with multiple inputs MUST show ALL inputs in examples
- Longest Common Subsequence: input must show BOTH strings (e.g. s1 = "...", s2 = "...")
- Minimum Window Substring: input must show BOTH string and pattern (s = "...", t = "...")
- Two Sum: input must show BOTH array and target (nums = [...], target = X)
- Never show partial inputs – always show the complete input set required for the problem.

CODING REASONING – MUST follow this specific format (DO NOT include "Why this question" prefix):
"[Problem name] tests [specific algorithm/DS] which mirrors [specific real-world engineering challenge] that engineers at ${about} face when [concrete scenario]"
•••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
CRITICAL JSON FORMATTING – FAILURES HERE ARE UNACCEPTABLE:
- Arrays MUST use comma separation: [1, 4, 5] NOT [145]
- Nested arrays MUST be properly formatted: [[1,4,5],[1,3,4]] NOT [[145][134]]
- Every array element must be separated by a comma and space.
- Test case inputs and outputs are native JSON – NEVER stringify arrays into numbers.
- Ensure all JSON is perfectly parsable by JSON.parse().
•••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••

Return ONLY valid JSON. No markdown.
```

---

## TOAST MESSAGES (USER FEEDBACK)

### Registration & Login
```
"Please fill all required fields"
"Welcome to HireVault, ${data.company.name}! 🎉"
"Registration failed"
```

### Assessment/Test Page
```
"Time is up!" (icon: ⏰, duration: 2000ms)
"Proctoring Alert: ${details}" (icon: ⚠️, duration: 4000ms)
"No code to run"
"Running code..." (loading state, id: 'run')
"Execution finished" (success state, id: 'run')
"Run failed" (error state, id: 'run')
"Failed to generate follow-up questions. Skipping to final submission."
"Submit failed. Please try again."
"Code saved" (success, green styling)
"Could not restore fullscreen. Please click the page first or check browser permissions."
```

### Role Management
```
"Questions approved!"
"Approval failed"
"Free assessment activated!"
"Assessment activated in ${currency}!"
"Payment activation failed"
"Results refreshed" (duration: 1000ms)
"Please provide at least one candidate"
"Links generated! Ready to share."
"Failed to generate link(s)"
"No dynamic links to export"
"Running AI Grading Agent..." (loading state, id: 'grade')
"Grading failed" (error state, id: 'grade')
"Copied!"
```

---

## PROCTORING MESSAGES

### Fullscreen & Tab Switching
```
"Fullscreen exit attempt detected. System blocking progression."
"User switched tabs or minimized window."
"Window lost focus."
"Screenshot/meta key blocked"
"Keyboard shortcuts are prohibited"
"Copy-paste is disabled"
"Cut is disabled"
"Paste is disabled"
"Right clicking is disabled"
```

### System Warnings
```
"Are you sure you want to leave? Your assessment will be terminated."
"Are you SURE you want to exit? Your session will be permanently terminated."
```

### Confirmation Dialogs
```
"Are you sure you want to leave? Your assessment will be terminated."
```

---

## SYSTEM MESSAGES

### Rate Limiting
```
"AI generation limit reached. You can create up to 5 roles per hour. Please wait before generating more questions."
"Daily AI generation limit reached. You can create up to 10 roles every 24 hours."
"Too many authentication attempts, please try again after 15 minutes"
"Daily generation limit reached. You can create up to 5 roles every 24 hours to ensure system stability."
```

### Error Responses
```
"Internal server error"
"[Groq API Attempt ${attempts + 1} Error]"
"Empty Groq response"
"Question generation failed after all attempts"
"[QuestionGenerator] Groq Exception (Falling back to default questions)"
"[Hidden TC Exec Error]"
"[AI Grading Error]"
"GROQ_API_KEY missing"
```

### Termination Reasons
```
"Terminated: System detected unauthorized tab switching (User left the assessment)"
"Assessment terminated: User left the assessment / No submission recorded within the expected timeframe"
"Assessment terminated by candidate after exiting fullscreen."
"Camera appears blocked or disconnected"
"Camera disconnected - terminating test"
```

### Session Messages
```
"Session was terminated"
"Assessment submitted. Grading in progress."
"Thank you for your feedback!"
```

---

## THEORY QUESTION GENERATION PROMPT

```
Code submitted:\n\n${code}\n\nGenerate 2 technical follow-up questions about this code. JSON: { "questions": [{ "type": "theory", "question": "...", "rubric": "...", "points": 10, "timeLimit": 180 }] }
```

---

## RATE LIMITING MESSAGES

### Agent Routes
```
"AI generation limit reached. You can create up to 5 roles per hour. Please wait before generating more questions."
"Daily AI generation limit reached. You can create up to 10 roles every 24 hours."
```

### Assessment Routes
Error messages with HTTP status codes returned when rate limits exceeded.

---

## ERROR MESSAGES

### Database & API Errors
```
"MongoDB connection error: ${err.message}"
"Internal server error"
"${err.message}" (generic error message passthrough)
```

### Proctoring Event Errors
```
"Face detection: Camera appears blocked or disconnected"
```

---

## CONFIRMATION & STATUS MESSAGES

### Assessment Submission
```
Response: { "message": "Assessment approved", "assessment": {...} }
Response: { "message": "Assessment submitted. Grading in progress.", "submittedAt": ..., "status": "submitted" }
Response: { "message": "Payment confirmed", "assessment": {...} }
Response: { "message": "Free assessment activated", "assessment": {...} }
```

### Approval & Management
```
"Approved"
"Rejected"
```

---

## SECTION INSTRUCTIONS (Displayed on Screen)

### Section 1: Multiple Choice Questions
```
- Each question has a individual time limit shown on screen
- Once time runs out the question auto-submits and moves forward
- You cannot return to previous questions
- Each question carries equal weightage
- Read carefully before selecting your answer
```

### Section 2: Coding Problems
```
- Each problem has an individual time limit shown on screen
- Use the Run Code button to test your solution before submitting
- When time runs out your current code is automatically saved
- You cannot return to previous problems
- Write clean, efficient code — your approach matters as much as correctness
- Supported languages: JavaScript and Python
```

### Section 3: Logic Verification
```
- This section tests whether you genuinely understand the code you wrote
- You will be asked questions specifically about YOUR solutions from Section 2
- Each question carries equal weightage to your coding score
- Questions are based on your specific approach, data structures, and logic choices
- Answer in your own words — explain your thinking clearly
- Each question has an individual time limit
- You cannot return to previous questions
```

### Fullscreen Warning Overlay
```
Title: "Action Required"
Message: "You have exited the secure assessment environment. If you exit this page, you will NOT be able to continue again."
Buttons: "Exit Assessment" | "Resume Assessment"
```

### Grading Progress Screen
```
Title: "Evaluating your submission"
Message: "Running test cases and scoring your answers. This takes a few seconds — please don't close this tab."
```

### Test Termination Screen
```
Title: "Test Terminated"
Message: "${proctorError}" (dynamic based on termination reason)
Button: "Return Home"
```

---

## MISC VALIDATION MESSAGES

### Proctoring Event Types (Logged)
```
- tab_switch
- fullscreen_exit
- screen_share_detected
- camera_snapshot
- copy_attempt
- right_click
- devtools
- device_change
```

### Test Case Visibility Labels
```
"VISIBLE TEST CASES (${count})"
"🔒 ${hiddenCount} hidden case(s) — evaluated on final submit"
"Click ▶ RUN CODE to see results for visible test cases."
```

---

*End of All Prompts Archive*
*No files were modified in the creation of this archive*
