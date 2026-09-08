#!/usr/bin/env bash
set -uo pipefail
cd /app

# ---- RUN TESTS: task-owned section ----
JSON_REPORT=/tmp/expense-approval-jest.json
JUNIT_REPORT=/tmp/expense-approval-results.xml
rm -f "$JSON_REPORT" "$JUNIT_REPORT"

npx jest --runInBand --json --outputFile="$JSON_REPORT"
JEST_STATUS=$?

python3 - "$JSON_REPORT" "$JUNIT_REPORT" <<'PY'
import json
import os
import sys
import xml.etree.ElementTree as ET

json_path, junit_path = sys.argv[1], sys.argv[2]
repo_root = "/app"
f2p_files = {
    "src/modules/expenses/application/__tests__/ExpenseApprovalWorkflow.behavior.test.ts",
    "src/modules/expenses/domain/__tests__/ExpenseApprovalGate.behavior.test.ts",
    "src/modules/expenses/presentation/__tests__/ExpenseApprovalSchemas.behavior.test.ts",
}

root = ET.Element("testsuites")
suite = ET.SubElement(root, "testsuite", name="mega-tracker")
total = failures = 0

if os.path.exists(json_path):
    with open(json_path, "r", encoding="utf-8") as fh:
        payload = json.load(fh)
    for result in payload.get("testResults", []):
        rel = os.path.relpath(result.get("name", ""), repo_root).replace(os.sep, "/")
        prefix = "f2p" if rel in f2p_files else "p2p"
        for assertion in result.get("assertionResults", []):
            full_name = assertion.get("fullName") or assertion.get("title") or "unnamed test"
            node_id = f"{prefix}::{rel}::{full_name}"
            case = ET.SubElement(suite, "testcase", classname=rel, name=node_id)
            total += 1
            status = assertion.get("status")
            if status != "passed":
                failures += 1
                failure = ET.SubElement(case, "failure", message=f"jest status: {status}")
                messages = assertion.get("failureMessages") or []
                failure.text = "\n".join(str(x) for x in messages) or f"Test status was {status}"

suite.set("tests", str(total))
suite.set("failures", str(failures))
ET.ElementTree(root).write(junit_path, encoding="utf-8", xml_declaration=True)
PY
# ---- END RUN TESTS ----

exit "$JEST_STATUS"
