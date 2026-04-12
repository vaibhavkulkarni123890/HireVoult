module.exports = {
  mcq: [
    {
      question: "Which of the following is true about closures in JavaScript?",
      options: ["They are created every time a function is created.", "They cannot access variables defined outside their scope.", "They only exist in strict mode.", "They automatically prevent memory leaks."],
      correctOption: 0,
      reasoning: "Essential for understanding JavaScript's scope and memory management in modern apps.",
      points: 5, timeLimit: 60, difficulty: "medium"
    },
    {
      question: "What is the primary purpose of indexing in a database?",
      options: ["To limit database size", "To encrypt user data", "To speed up data retrieval operations", "To automatically backup row data"],
      correctOption: 2,
      reasoning: "Crucial for optimizing application performance and ensuring fast query response times.",
      points: 5, timeLimit: 60, difficulty: "easy"
    },
    {
      question: "In React, what are higher-order components (HOCs) primarily used for?",
      options: ["Styling components purely via CSS-in-JS", "Reusing component logic", "Replacing Redux entirely", "Routing pages dynamically"],
      correctOption: 1,
      reasoning: "Tests the candidate's ability to abstract and reuse logic across components effectively.",
      points: 5, timeLimit: 90, difficulty: "medium"
    },
    {
      question: "What does the CAP theorem state about distributed data stores?",
      options: ["They cannot guarantee Consistency, Availability, and Partition tolerance simultaneously.", "They must always use eventual consistency.", "Consistency is always prioritized over Availability.", "Partition tolerance is optional in modern networks."],
      correctOption: 0,
      reasoning: "Fundamental concept for designing scalable and resilient distributed systems.",
      points: 10, timeLimit: 90, difficulty: "hard"
    },
    {
      question: "Which HTTP method is typically supposed to be idempotent?",
      options: ["POST", "PUT", "PATCH", "HEAD ONLY"],
      correctOption: 1,
      reasoning: "Verifies knowledge of standard API design principles and network reliability.",
      points: 5, timeLimit: 60, difficulty: "easy"
    },
    {
      question: "What is the time complexity of searching an element in a balanced binary search tree?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      correctOption: 1,
      reasoning: "Standard algorithmic knowledge for evaluating data structure performance.",
      points: 5, timeLimit: 60, difficulty: "medium"
    },
    {
      question: "In Node.js, how does the Event Loop handle asynchronous operations?",
      options: ["By creating a new OS thread for every request", "By executing callbacks on a single thread after async operations complete", "By blocking the main thread until the operation finishes", "By delegating all functions to the frontend"],
      correctOption: 1,
      reasoning: "Core architectural knowledge required for efficient server-side JavaScript development.",
      points: 10, timeLimit: 90, difficulty: "hard"
    },
    {
      question: "Which of the following sorting algorithms has the best average-case time complexity?",
      options: ["Bubble Sort", "Insertion Sort", "Merge Sort", "Selection Sort"],
      correctOption: 2,
      reasoning: "Tests understanding of algorithm optimization and computational complexity.",
      points: 5, timeLimit: 60, difficulty: "easy"
    },
    {
      question: "What is the difference between a SQL SELECT statement and a SQL INSERT statement?",
      options: ["SELECT retrieves data, INSERT adds new data", "SELECT modifies existing data, INSERT deletes data", "They are identical operations", "SELECT is used for indexing, INSERT is for querying"],
      correctOption: 0,
      reasoning: "Tests fundamental database manipulation knowledge.",
      points: 5, timeLimit: 60, difficulty: "easy"
    },
    {
      question: "What is the purpose of using Docker in a project?",
      options: ["To write application code", "To containerize applications and ensure consistency across environments", "To manage state in React components", "To compile TypeScript to JavaScript"],
      correctOption: 1,
      reasoning: "Modern DevOps and deployment knowledge is essential for full-stack roles.",
      points: 5, timeLimit: 60, difficulty: "medium"
    },
    {
      question: "What is the purpose of using Jest for testing in a JavaScript project?",
      options: ["To bundle assets for production", "To run unit and integration tests with assertions", "To transpile ES6+ code to ES5", "To manage npm dependencies"],
      correctOption: 1,
      reasoning: "Testing knowledge is critical for maintaining code quality in production applications.",
      points: 5, timeLimit: 60, difficulty: "medium"
    },
    {
      question: "What is the difference between a React functional component and a React class component?",
      options: ["Functional components cannot accept props", "Class components use a class syntax and have lifecycle methods; functional components use hooks", "They are identical in behavior", "Functional components must always be asynchronous"],
      correctOption: 1,
      reasoning: "Core React knowledge required for frontend development roles.",
      points: 5, timeLimit: 60, difficulty: "medium"
    },
    {
      question: "What is the purpose of using TypeScript in a project?",
      options: ["To write CSS styles", "To add static type checking on top of JavaScript", "To create HTML templates", "To manage database connections"],
      correctOption: 1,
      reasoning: "Type safety and maintainability are valued in professional JavaScript development.",
      points: 5, timeLimit: 60, difficulty: "easy"
    },
    {
      question: "What is the difference between a REST API and a GraphQL API?",
      options: ["REST uses multiple endpoints; GraphQL uses a single endpoint with flexible queries", "They are the same technology", "REST is for databases; GraphQL is for UI", "GraphQL does not support JSON"],
      correctOption: 0,
      reasoning: "Modern API design knowledge is essential for full-stack and backend roles.",
      points: 5, timeLimit: 60, difficulty: "medium"
    },
    {
      question: "What is the purpose of using Git in a project?",
      options: ["To run automated tests", "To track code changes and enable collaborative development", "To compile application code", "To host application databases"],
      correctOption: 1,
      reasoning: "Version control is the foundation of collaborative software development.",
      points: 5, timeLimit: 60, difficulty: "easy"
    }
  ],
  coding: [
    {
      difficulty: "medium",
      title: "Two Sum",
      question: `Problem Statement:
Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

Input Format:
The function receives two arguments:
- nums: an array of integers
- target: an integer

Output Format:
Return an array of two indices [i, j] such that nums[i] + nums[j] == target.
If no valid pair exists, return an empty array [].

Constraints:
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9
- Only one valid answer exists per input.

Examples:
Input: nums = [2, 7, 11, 15], target = 9
Output: [0, 1]
Explanation: nums[0] + nums[1] == 9, so we return [0, 1].

Input: nums = [3, 2, 4], target = 6
Output: [1, 2]
Explanation: nums[1] + nums[2] == 6, so we return [1, 2].

Input: nums = [3, 3], target = 6
Output: [0, 1]`,
      starterCode: {
        javascript: `function twoSum(nums, target) {\n  // Write your solution here\n  \n}`,
        python: `def twoSum(nums, target):\n    # Write your solution here\n    pass`
      },
      testCases: [
        { input: { nums: [2, 7, 11, 15], target: 9 }, expectedOutput: [0, 1], isVisible: true },
        { input: { nums: [3, 2, 4], target: 6 }, expectedOutput: [1, 2], isVisible: true },
        { input: { nums: [1, 5, 8, 3, 9, 2], target: 11 }, expectedOutput: [2, 3], isHidden: true },
        { input: { nums: [1, 2, 3, 4, 5], target: 9 }, expectedOutput: [], isHidden: true },
        { input: { nums: [-1, -2, -3, -4, -5], target: -8 }, expectedOutput: [2, 4], isHidden: true }
      ],
      reasoning: "Classic hash map problem — tests O(n) optimization skills over brute force O(n²). Essential for understanding space-time tradeoffs.",
      rubric: "Optimal solution uses a hash map for O(n) time. Brute force nested loop gets partial credit.",
      points: 20, timeLimit: 900
    },
    {
      difficulty: "hard",
      title: "Reverse Linked List",
      question: `Problem Statement:
Given the head of a singly linked list, reverse the list, and return the reversed list.

A singly linked list node has the following structure:
{ val: number, next: ListNode | null }

Input Format:
The function receives the head of a linked list as an array for convenience: [1, 2, 3, 4, 5]

Output Format:
Return the reversed list as an array.
For input [1, 2, 3, 4, 5], output should be [5, 4, 3, 2, 1].
For an empty list [], return [].

Constraints:
- The number of nodes ranges from 0 to 5000.
- -5000 <= Node.val <= 5000

Examples:
Input: [1, 2, 3, 4, 5]
Output: [5, 4, 3, 2, 1]

Input: [1, 2]
Output: [2, 1]

Input: []
Output: []`,
      starterCode: {
        javascript: `// Definition: function ListNode(val, next) { this.val = val; this.next = next || null; }\n\nfunction reverseList(head) {\n  // head is an array representation of linked list\n  // Return an array representing the reversed list\n  \n}`,
        python: `# Definition: class ListNode: def __init__(self, val=0, next=None): self.val = val; self.next = next\n\ndef reverseList(head):\n    # head is a list representing the linked list\n    # Return a list representing the reversed list\n    pass`
      },
      testCases: [
        { input: [1, 2, 3, 4, 5], expectedOutput: [5, 4, 3, 2, 1], isVisible: true },
        { input: [1, 2], expectedOutput: [2, 1], isVisible: true },
        { input: [], expectedOutput: [], isHidden: true },
        { input: [1], expectedOutput: [1], isHidden: true },
        { input: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], expectedOutput: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1], isHidden: true }
      ],
      reasoning: "Tests pointer manipulation and recursive/iterative thinking — a core data structure skill.",
      rubric: "Must correctly reverse pointers iteratively or recursively. Handles empty list and single-node edge cases.",
      points: 25, timeLimit: 1200
    },
    {
      difficulty: "hard",
      title: "Fibonacci Number with Memoization",
      question: `Problem Statement:
Write a function that returns the nth Fibonacci number (F(n)) using either memoization (top-down DP) or tabulation (bottom-up DP).

The Fibonacci sequence is defined as:
F(0) = 0, F(1) = 1
F(n) = F(n - 1) + F(n - 2) for n > 1

Input Format:
An integer n (0 <= n <= 45)

Output Format:
Return the nth Fibonacci number as an integer.

Constraints:
- 0 <= n <= 45
- Time complexity must be better than O(2^n) — naive recursion will timeout.
- Space complexity should be O(n) or better.

Examples:
Input: 2
Output: 1
Explanation: F(2) = F(1) + F(0) = 1 + 0 = 1

Input: 10
Output: 55
Explanation: F(10) = F(9) + F(8) = 34 + 21 = 55

Input: 0
Output: 0

Input: 1
Output: 1`,
      starterCode: {
        javascript: `// Approach 1: Memoization (top-down)\nfunction fib(n, memo = {}) {\n  // Write your solution here\n  \n}\n\n// Approach 2: Bottom-up tabulation (optional)\nfunction fibTab(n) {\n  // Write your solution here\n  \n}`,
        python: `# Approach 1: Memoization (top-down)\ndef fib(n, memo=None):\n    # Write your solution here\n    pass\n\n# Approach 2: Bottom-up tabulation (optional)\ndef fib_tab(n):\n    # Write your solution here\n    pass`
      },
      testCases: [
        { input: 2, expectedOutput: 1, isVisible: true },
        { input: 10, expectedOutput: 55, isVisible: true },
        { input: 0, expectedOutput: 0, isHidden: true },
        { input: 1, expectedOutput: 1, isHidden: true },
        { input: 20, expectedOutput: 6765, isHidden: true },
        { input: 30, expectedOutput: 832040, isHidden: true }
      ],
      reasoning: "Tests understanding of dynamic programming — memoization vs tabulation. Verifies candidate knows to avoid exponential naive recursion.",
      rubric: "Must implement DP approach. Naive recursion that times out on n=45 gets partial credit at best.",
      points: 25, timeLimit: 1200
    },
    {
      difficulty: "easy",
      title: "Palindrome Check",
      question: `Problem Statement:
Write a function that checks whether a given string is a palindrome.

A palindrome is a string that reads the same forward and backward, ignoring spaces, punctuation, and case.

Input Format:
A single string s (1 <= s.length <= 100)

Output Format:
Return true if the string is a palindrome, otherwise return false.

Constraints:
- s consists of printable ASCII characters only.
- You must handle edge cases: single character strings, empty-like strings.

Examples:
Input: "racecar"
Output: true

Input: "hello"
Output: false

Input: "A man a plan a canal Panama"
Output: true
Explanation: Ignoring spaces and case, it reads the same forwards and backwards.

Input: "Madam"
Output: true`,
      starterCode: {
        javascript: `function isPalindrome(s) {\n  // Return true or false\n  \n}`,
        python: `def is_palindrome(s):\n    # Return True or False\n    pass`
      },
      testCases: [
        { input: "racecar", expectedOutput: true, isVisible: true },
        { input: "hello", expectedOutput: false, isVisible: true },
        { input: "A man a plan a canal Panama", expectedOutput: true, isHidden: true },
        { input: "Madam", expectedOutput: true, isHidden: true },
        { input: "abba", expectedOutput: true, isHidden: true },
        { input: "not a palindrome", expectedOutput: false, isHidden: true }
      ],
      reasoning: "Tests basic string manipulation — good for junior roles to assess comfort with string APIs.",
      rubric: "Correctly handles case-insensitivity and spaces. Edge case of single character handled.",
      points: 15, timeLimit: 600
    },
    {
      difficulty: "medium",
      title: "Nested Object Flattening",
      question: `Problem Statement:
You are given a nested object where keys can be strings with dots representing nested paths (e.g., { 'a.b.c': 'value' }) or flat values. Write a function to flatten such an object into a single-level object, and also write the inverse function to unflatten it.

Input Format:
For flatten: a nested object (e.g., { a: { b: { c: 'd' } } })
For unflatten: a flat object with dot-notation keys (e.g., { 'a.b.c': 'd' })

Output Format:
flatten() returns: { 'a.b.c': 'd' }
unflatten() returns: { a: { b: { c: 'd' } } }

Constraints:
- Keys will not contain dots except for the flattening path separator.
- Values can be strings, numbers, booleans, or null.
- Maximum nesting depth is 10 levels.

Examples:
Input (flatten): { a: { b: { c: 'd' } } }
Output: { 'a.b.c': 'd' }

Input (flatten): { a: 'b', c: { d: 'e' } }
Output: { a: 'b', 'c.d': 'e' }

Input (unflatten): { 'a.b.c': 'd' }
Output: { a: { b: { c: 'd' } } }`,
      starterCode: {
        javascript: `// Flatten: converts nested object to dot-notation flat object\nfunction flatten(obj) {\n  // Write your solution here\n  \n}\n\n// Unflatten: converts dot-notation flat object back to nested\nfunction unflatten(obj) {\n  // Write your solution here\n  \n}`,
        python: `# Flatten: converts nested dict to dot-notation flat dict\ndef flatten(obj):\n    # Write your solution here\n    pass\n\n# Unflatten: converts dot-notation flat dict back to nested\ndef unflatten(obj):\n    # Write your solution here\n    pass`
      },
      testCases: [
        { input: { a: { b: { c: 'd' } } }, expectedOutput: { 'a.b.c': 'd' }, isVisible: true },
        { input: { a: 'b', c: { d: 'e' } }, expectedOutput: { a: 'b', 'c.d': 'e' }, isVisible: true },
        { input: { 'a.b.c': 'd' }, expectedOutput: { a: { b: { c: 'd' } } }, isHidden: true },
        { input: { x: { y: { z: 123 } } }, expectedOutput: { 'x.y.z': 123 }, isHidden: true },
        { input: { 'x.y': 'z' }, expectedOutput: { x: { y: 'z' } }, isHidden: true }
      ],
      reasoning: "Tests recursion, object traversal, and string manipulation — highly relevant for full-stack roles dealing with API responses and data transformation.",
      rubric: "Must correctly handle arbitrary nesting depth. Handles both flatten and unflatten.",
      points: 20, timeLimit: 900
    },
    {
      difficulty: "medium",
      title: "Event Bus Simulation",
      question: `Problem Statement:
Implement a simple Event Bus (publish-subscribe pattern) in JavaScript / Python.

The EventBus should support:
- subscribe(eventType, callback): Register a callback to be called when the eventType is published.
- publish(eventType, data): Call all callbacks registered for eventType with the provided data.
- unsubscribe(eventType, callback): Remove a specific callback from the eventType.
- getListeners(eventType): Return an array of all registered callback names (or identifiers) for eventType.

Input Format:
All operations are method calls on an EventBus instance. Event types are strings. Data is any value.

Output Format:
- subscribe returns a unique subscription ID (string) for later unsubscribing.
- publish returns an array of callback results (or null if none).
- getListeners returns an array of listener identifiers for that event type.

Constraints:
- EventBus must not call callbacks from other event types.
- A callback unsubscribed via its ID must not be called on subsequent publishes.

Examples:
const bus = new EventBus();
bus.subscribe('user:login', (data) => 'notified: ' + data.user);
bus.subscribe('user:login', (data) => 'logged: ' + data.user);
bus.publish('user:login', { user: 'alice' });
// Expected output from publish: ['notified: alice', 'logged: alice']

bus.unsubscribe('user:login', <first_callback_id>);
bus.publish('user:login', { user: 'bob' });
// Expected: only second callback fires: ['logged: bob']`,
      starterCode: {
        javascript: `class EventBus {\n  constructor() {\n    // Write your solution here\n  }\n\n  subscribe(eventType, callback) {\n    // Return a subscription ID string\n  }\n\n  publish(eventType, data) {\n    // Return array of callback results\n  }\n\n  unsubscribe(eventType, subscriptionId) {\n    // Remove the specific subscription\n  }\n\n  getListeners(eventType) {\n    // Return array of listener identifiers\n  }\n}`,
        python: `class EventBus:\n    def __init__(self):\n        # Write your solution here\n        pass\n\n    def subscribe(self, event_type, callback):\n        # Return a subscription ID string\n        pass\n\n    def publish(self, event_type, data):\n        # Return list of callback results\n        pass\n\n    def unsubscribe(self, event_type, subscription_id):\n        # Remove the specific subscription\n        pass\n\n    def get_listeners(self, event_type):\n        # Return list of listener identifiers\n        pass`
      },
      testCases: [
        { input: { action: 'subscribe', eventType: 'user:login', data: (x) => 'cb1:' + x.user }, expectedOutput: 'sub_id_1', isVisible: true },
        { input: { action: 'subscribe', eventType: 'user:login', data: (x) => 'cb2:' + x.user }, expectedOutput: 'sub_id_2', isVisible: true },
        { input: { action: 'publish', eventType: 'user:login', data: { user: 'alice' } }, expectedOutput: ['cb1:alice', 'cb2:alice'], isVisible: true },
        { input: { action: 'publish', eventType: 'user:logout', data: {} }, expectedOutput: [], isHidden: true },
        { input: { action: 'getListeners', eventType: 'user:login' }, expectedOutput: ['sub_id_1', 'sub_id_2'], isHidden: true },
        { input: { action: 'unsubscribe', eventType: 'user:login', subscriptionId: 'sub_id_1' }, expectedOutput: true, isHidden: true }
      ],
      reasoning: "Tests understanding of the pub/sub pattern — widely used in frontend (Redux middleware, Vue events) and backend (Node EventEmitter, message queues).",
      rubric: "Must correctly implement subscribe/publish/unsubscribe with proper callback tracking. Handles missing listeners gracefully.",
      points: 20, timeLimit: 900
    },
    {
      difficulty: "easy",
      title: "Form Validator",
      question: `Problem Statement:
Write a function that validates form data against a set of rules.

The form data is an object with string values. The rules object defines validation rules per field.

Input Format:
validateForm(data, rules) where:
- data: { fieldName: "value", ... }
- rules: { fieldName: [{ rule: "required" | "email" | "minLength", value: number }, ...], ... }

Output Format:
Returns an object: { isValid: boolean, errors: { fieldName: "error message", ... } }
If a field passes all its rules, it has no entry in errors.
If the entire form is valid, isValid is true and errors is {}.

Constraints:
- Rules are applied in order — first failure is the error message returned.
- "required": field value must not be empty string after trimming.
- "email": must match a basic email regex (user@domain.com format).
- "minLength:N": string must have length >= N.

Examples:
Input: { name: 'John Doe', email: 'john@example.com' }
Rules: { name: [{ rule: 'required' }], email: [{ rule: 'required' }, { rule: 'email' }] }
Output: { isValid: true, errors: {} }

Input: { name: '', email: 'john@example.com' }
Output: { isValid: false, errors: { name: 'Name is required' } }

Input: { name: 'John', email: 'invalid-email' }
Output: { isValid: false, errors: { email: 'Invalid email address' } }`,
      starterCode: {
        javascript: `function validateForm(data, rules) {\n  // Write your solution here\n  // Return { isValid: boolean, errors: {} }\n  \n}`,
        python: `def validate_form(data, rules):\n    # Write your solution here\n    # Return {'isValid': bool, 'errors': {}}\n    pass`
      },
      testCases: [
        { input: { data: { name: 'John Doe', email: 'john@example.com' }, rules: { name: [{ rule: 'required' }], email: [{ rule: 'required' }, { rule: 'email' }] } }, expectedOutput: { isValid: true, errors: {} }, isVisible: true },
        { input: { data: { name: '', email: 'john@example.com' }, rules: { name: [{ rule: 'required' }] } }, expectedOutput: { isValid: false, errors: { name: 'Name is required' } }, isVisible: true },
        { input: { data: { name: 'John', email: 'invalid-email' }, rules: { email: [{ rule: 'email' }] } }, expectedOutput: { isValid: false, errors: { email: 'Invalid email address' } }, isHidden: true },
        { input: { data: { username: 'ab' }, rules: { username: [{ rule: 'minLength', value: 3 }] } }, expectedOutput: { isValid: false, errors: { username: 'Must be at least 3 characters' } }, isHidden: true },
        { input: { data: { x: 'test' }, rules: {} }, expectedOutput: { isValid: true, errors: {} }, isHidden: true }
      ],
      reasoning: "Tests string manipulation, regex, and data validation — practical for any role handling user input.",
      rubric: "Correctly handles all rule types. Returns proper error messages. Edge cases: empty rules object, missing fields in data.",
      points: 15, timeLimit: 600
    },
    {
      difficulty: "medium",
      title: "Array Chunking",
      question: `Problem Statement:
Write a function that splits an array into groups of a given size (chunk). The last chunk may be smaller if the array length is not evenly divisible by the chunk size.

Input Format:
chunk(array, size) where:
- array: an array of any values
- size: a positive integer (size >= 1)

Output Format:
Returns a new array of arrays, where each inner array has at most 'size' elements.
If array is empty or size <= 0, return [].

Constraints:
- Do not use built-in array chunking methods like Array.prototype.chunk or Python's itertools.

Examples:
Input: [1, 2, 3, 4, 5], size = 2
Output: [[1, 2], [3, 4], [5]]

Input: [1, 2, 3, 4, 5], size = 3
Output: [[1, 2, 3], [4, 5]]

Input: [1, 2], size = 2
Output: [[1, 2]]

Input: [1, 2, 3], size = 4
Output: [[1, 2, 3]]

Input: [], size = 2
Output: []`,
      starterCode: {
        javascript: `function chunk(array, size) {\n  // Return array of chunks\n  \n}`,
        python: `def chunk(array, size):\n    # Return list of chunks\n    pass`
      },
      testCases: [
        { input: { array: [1, 2, 3, 4, 5], size: 2 }, expectedOutput: [[1, 2], [3, 4], [5]], isVisible: true },
        { input: { array: [1, 2, 3, 4, 5], size: 3 }, expectedOutput: [[1, 2, 3], [4, 5]], isVisible: true },
        { input: { array: [1, 2, 3], size: 4 }, expectedOutput: [[1, 2, 3]], isHidden: true },
        { input: { array: [], size: 2 }, expectedOutput: [], isHidden: true },
        { input: { array: ['a', 'b', 'c', 'd'], size: 2 }, expectedOutput: [['a', 'b'], ['c', 'd']], isHidden: true }
      ],
      reasoning: "Tests array manipulation skills — practical utility function used in pagination, data processing pipelines, and UI rendering.",
      rubric: "Correctly handles edge cases: odd-length arrays, empty arrays, size 1, size larger than array length.",
      points: 15, timeLimit: 600
    },
    {
      difficulty: "hard",
      title: "LRU Cache",
      question: `Problem Statement:
Implement an LRU (Least Recently Used) Cache with a given capacity.

The cache must support:
- get(key): Return the value if the key exists, otherwise return null. Marks the key as most recently used.
- put(key, value): Insert or update the key-value pair. If the cache is at capacity, evict the least recently used item before inserting.

Input Format:
LRUCache(capacity) — constructor with positive integer capacity
.get(key) — get operation
.put(key, value) — put operation

Output Format:
- get returns the value (or null if not found).
- put returns true on successful insert/update.

Constraints:
- 1 <= capacity <= 1000
- All operations (get and put) must run in O(1) average time complexity.

Examples:
cache = new LRUCache(2);
cache.put(1, 1);  // cache: {1=1}
cache.put(2, 2);  // cache: {1=1, 2=2}
cache.get(1);     // returns 1, cache: {2=2, 1=1} (1 is most recent)
cache.put(3, 3);  // evicts key 2 (least recent), cache: {1=1, 3=3}
cache.get(2);     // returns null (not found)
cache.put(4, 4);  // evicts key 1 (least recent), cache: {3=3, 4=4}
cache.get(1);     // returns null (not found)
cache.get(3);     // returns 3
cache.get(4);     // returns 4`,
      starterCode: {
        javascript: `class LRUCache {\n  constructor(capacity) {\n    // Initialize your cache here\n  }\n\n  get(key) {\n    // Return value or null\n  }\n\n  put(key, value) {\n    // Insert/update, evict LRU if over capacity\n  }\n}`,
        python: `class LRUCache:\n    def __init__(self, capacity):\n        # Initialize your cache here\n        pass\n\n    def get(self, key):\n        # Return value or None\n        pass\n\n    def put(self, key, value):\n        # Insert/update, evict LRU if over capacity\n        pass`
      },
      testCases: [
        { input: { ops: [['LRUCache', 2], ['put', 1, 1], ['put', 2, 2], ['get', 1], ['put', 3, 3]] }, expectedOutput: [null, null, 1, null, null], isVisible: true },
        { input: { ops: [['LRUCache', 2], ['put', 1, 1], ['put', 2, 2], ['get', 1], ['get', 2]] }, expectedOutput: [null, null, 1, 2], isVisible: true },
        { input: { ops: [['LRUCache', 1], ['put', 1, 1], ['get', 1], ['put', 2, 2], ['get', 1]] }, expectedOutput: [null, null, 1, null], isHidden: true },
        { input: { ops: [['LRUCache', 3], ['put', 1, 1], ['put', 2, 2], ['put', 3, 3], ['get', 2], ['put', 4, 4], ['get', 3]] }, expectedOutput: [null, null, null, 2, null, null], isHidden: true }
      ],
      reasoning: "Classic system design + data structures problem. Tests Map/HashMap + doubly linked list understanding. Frequently asked in interviews at Amazon, Google, LinkedIn.",
      rubric: "Must implement get and put in O(1). Uses Map for O(1) access and recency ordering.",
      points: 25, timeLimit: 1200
    },
    {
      difficulty: "medium",
      title: "Deep Clone Object",
      question: `Problem Statement:
Write a function that performs a deep clone (deep copy) of a given object.

The object may contain nested objects, arrays, strings, numbers, booleans, and null values.

Input Format:
deepClone(obj) — a value of any type

Output Format:
Returns a completely independent deep copy of obj. Modifying the copy must NOT affect the original.

Constraints:
- Must handle circular references gracefully (return null if circular detected).
- Must handle Date objects (preserve type).
- Must handle arrays and plain objects.

Examples:
Input: { name: 'Alice', address: { city: 'NYC' } }
Output: { name: 'Alice', address: { city: 'NYC' } }
// Modifying copy.address.city does not affect original

Input: [1, [2, 3], { a: 4 }]
Output: [1, [2, 3], { a: 4 }]

Input: null
Output: null

Input: new Date('2024-01-01')
Output: Date object equal to 2024-01-01 (not a string)`,
      starterCode: {
        javascript: `function deepClone(obj, seen = new WeakMap()) {\n  // Write your solution here\n  \n}`,
        python: `import copy\n\ndef deep_clone(obj):\n    # Note: Python's copy.deepcopy handles circular refs automatically\n    # But implement a manual version for this exercise\n    # Return the deep cloned object\n    pass`
      },
      testCases: [
        { input: { name: 'Alice', address: { city: 'NYC' } }, expectedOutput: { name: 'Alice', address: { city: 'NYC' } }, isVisible: true },
        { input: [1, [2, 3], { a: 4 }], expectedOutput: [1, [2, 3], { a: 4 }], isVisible: true },
        { input: null, expectedOutput: null, isHidden: true },
        { input: { prev: null, value: 1 }, expectedOutput: { prev: null, value: 1 }, isHidden: true },
        { input: { list: [{ id: 1 }, { id: 2 }] }, expectedOutput: { list: [{ id: 1 }, { id: 2 }] }, isHidden: true }
      ],
      reasoning: "Tests understanding of references vs values, recursion, and handling of edge cases — critical for JavaScript/Python roles handling data transformations.",
      rubric: "Must correctly deep clone nested structures. Handles null, arrays, plain objects. WeakMap for circular reference detection in JS.",
      points: 20, timeLimit: 900
    }
  ],
  theory: [
    {
      question: "Explain the difference between vertical and horizontal scaling in database architecture. When would you prefer one over the other?",
      reasoning: "Tests system design knowledge and decision-making for scalable architectures.",
      rubric: "Should mention adding power to a single machine vs adding more machines. Should mention limitations like single point of failure and data partitioning overhead.",
      points: 10, timeLimit: 300, difficulty: "easy"
    },
    {
      question: "What is a Race Condition in concurrent programming? How can you prevent it?",
      reasoning: "Crucial for evaluating multi-threaded and asynchronous programming competence.",
      rubric: "Should mention multiple threads accessing shared state simultaneously, causing unpredictable results. Prevention: Mutex, Locks, Semaphores.",
      points: 15, timeLimit: 300, difficulty: "medium"
    },
    {
      "question": "Explain the concept of 'Eventual Consistency'. How does it impact user experience in a highly distributed microservices application?",
      reasoning: "Vital for senior roles dealing with distributed databases and high-availability systems.",
      rubric: "Data takes time to propagate, readers might temporarily see stale data. Impact includes cart updates taking a second to reflect on another device.",
      points: 20, timeLimit: 420, difficulty: "hard"
    },
    {
      question: "Describe your strategy for diagnosing a massive memory leak in a Node.js production application.",
      reasoning: "Verifies production debugging skills and deep technical platform knowledge.",
      rubric: "Heap snapshots, performance profiling, tracing callbacks, ensuring event listeners are cleared.",
      points: 20, timeLimit: 420, difficulty: "hard"
    },
    {
      question: "What are the core principles of RESTful APIs, and how do they differ from GraphQL?",
      reasoning: "Tests modern API design knowledge and ability to pick the right tool for the job.",
      rubric: "Stateless, standard HTTP verbs, resource-based URL. GraphQL has single endpoint and lets client specify precisely what fields they want to avoid over-fetching.",
      points: 15, timeLimit: 300, difficulty: "medium"
    }
  ]
};
