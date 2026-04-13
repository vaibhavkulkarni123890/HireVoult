const { VM } = require('vm2');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Execute JavaScript code in a sandbox.
 */
function stripComments(code) {
    return code
        .replace(/\/\*[\s\S]*?\*\//g, '\n')
        .replace(/\/\/.*$/gm, '')
        .replace(/#.*$/gm, '');
}

async function runJS(code, testCases) {
    const vm = new VM({
        timeout: 5000,
        sandbox: {},
        eval: false,
        wasm: false
    });

    const cleanCode = stripComments(code);

    const results = [];
    for (const tc of testCases) {
        try {
            const funcNameMatch = cleanCode.match(/function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/)
                || cleanCode.match(/const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/)
                || cleanCode.match(/let\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/)
                || cleanCode.match(/var\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?function\s*\(([^)]*)\)/);
            const funcName = funcNameMatch ? funcNameMatch[1] : 'solution';
            const rawParams = funcNameMatch ? (funcNameMatch[2] || '') : '';
            const paramCount = rawParams.split(',').filter(p => p.trim()).length;

            // Serialize input as JSON, parse inside VM, then call with correct # of args
            const inputJson = JSON.stringify(tc.input);

            const driver = `
                ${cleanCode}
                (function() {
                    try {
                        const _parsed = JSON.parse('${inputJson.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}');
                        let _args;
                        if (Array.isArray(_parsed)) {
                            _args = _parsed;
                        } else if (typeof _parsed === 'object' && _parsed !== null) {
                            const _keys = Object.keys(_parsed);
                            _args = _keys.length === 1 ? [_parsed[_keys[0]]] : Object.values(_parsed);
                        } else {
                            _args = [_parsed];
                        }
                        if (typeof ${funcName} !== 'function') {
                            return "ERROR: Function '${funcName}' is not defined or has no implementation. Please write your code before running.";
                        }
                        const _result = ${funcName}.apply(null, _args.slice(0, ${paramCount}));
                        return JSON.stringify(_result);
                    } catch (e) {
                        return "ERROR: " + e.message;
                    }
                })()
            `;

            const rawResult = vm.run(driver);
            let actual = rawResult;
            let error = null;

            let parsedActual = null;
            try {
                parsedActual = JSON.parse(rawResult);
            } catch (e) {
                parsedActual = rawResult;
            }
            // Robust comparison: if expectedOutput is an array, pass if actual matches ANY element (multiple valid answers)
            const _expected = tc.expectedOutput;
            const passed = !error && (
                Array.isArray(_expected)
                    ? _expected.some(e => JSON.stringify(parsedActual) === JSON.stringify(e))
                    : JSON.stringify(parsedActual) === JSON.stringify(_expected)
            );
            results.push({ 
                passed, 
                input: tc.input, 
                expected: JSON.stringify(tc.expectedOutput), 
                actual: rawResult, 
                error 
            });
        } catch (err) {
            results.push({ passed: false, input: tc.input, expected: JSON.stringify(tc.expectedOutput), actual: null, error: err.message });
        }
    }
    return results;
}

/**
 * Execute Python code in a child process.
 */
async function runPython(code, testCases) {
    const results = [];
    
    // Find python function name
    const funcNameMatch = code.match(/def\s+([a-zA-Z0-9_]+)\s*\(/);
    const funcName = funcNameMatch ? funcNameMatch[1] : 'solution';

    for (const tc of testCases) {
        const tempFile = path.join(__dirname, `../../tmp/${uuidv4()}.py`);
        
        // Serialize the input as a JSON string so it becomes a valid Python literal
        const inputJson = JSON.stringify(tc.input);
        // Find function signature to determine parameter count
        const funcNameMatch = code.match(/def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);
        const funcName = funcNameMatch ? funcNameMatch[1] : 'solution';
        const rawParams = funcNameMatch ? funcNameMatch[2] || '' : '';
        const paramCount = rawParams.split(',').filter(p => p.trim()).length;

        const driver = `
import json

${code}

try:
    if not callable(${funcName}):
        print(f"ERROR: Function '${funcName}' is not defined or has no implementation. Please write your code before running.")
    else:
        _raw = json.loads('${inputJson.replace(/'/g, "\\'")}')
        if isinstance(_raw, dict):
            _keys = list(_raw.keys())
            if ${paramCount} == 1 and len(_keys) == 1:
                _args = [_raw[_keys[0]]]
            else:
                _args = [_raw[k] for k in _keys[:${paramCount}]]
        elif isinstance(_raw, list):
            _args = _raw[:${paramCount}]
        else:
            _args = [_raw]
        result = ${funcName}(*_args)
        print(json.dumps(result))
except Exception as e:
    print(f"ERROR: {str(e)}")
`;
        
        try {
            if (!fs.existsSync(path.dirname(tempFile))) fs.mkdirSync(path.dirname(tempFile), { recursive: true });
            fs.writeFileSync(tempFile, driver);

            const output = await new Promise((resolve, reject) => {
                execFile('python', [tempFile], { timeout: 5000 }, (error, stdout, stderr) => {
                    if (error && error.killed) return resolve('ERROR: Execution timed out (5s)');
                    if (stderr) return resolve('ERROR: ' + stderr);
                    resolve(stdout);
                });
            });

            const rawResult = output.trim();
            let actual = rawResult;
            let error = null;

            let parsedActual = null;
            try {
                parsedActual = JSON.parse(rawResult);
            } catch (e) {
                parsedActual = rawResult;
            }

            // If expectedOutput is an array, pass if actual matches ANY element (multiple valid answers)
            const _expected2 = tc.expectedOutput;
            const passed = !error && (
                Array.isArray(_expected2)
                    ? _expected2.some(e => JSON.stringify(parsedActual) === JSON.stringify(e))
                    : JSON.stringify(parsedActual) === JSON.stringify(_expected2)
            );
            results.push({ 
                passed, 
                input: tc.input, 
                expected: JSON.stringify(tc.expectedOutput), 
                actual: rawResult, 
                error 
            });
        } catch (err) {
            results.push({ passed: false, input: tc.input, expected: JSON.stringify(tc.expectedOutput), actual: null, error: err.message });
        } finally {
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        }
    }
    return results;
}

module.exports = { runJS, runPython };
