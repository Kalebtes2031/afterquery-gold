#!/usr/bin/env python3
import json
import os
import sys
import xml.etree.ElementTree as ET

CONFIG_PATH = os.environ.get("TASK_TEST_CONFIG", "/task/tests/config.json")
REPORT_PATH = os.environ.get("TASK_TEST_REPORT", "/tmp/expense-approval-results.xml")

if not os.path.exists(CONFIG_PATH):
    CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.json")

with open(CONFIG_PATH, "r", encoding="utf-8") as fh:
    config = json.load(fh)

seen = {}
if os.path.exists(REPORT_PATH):
    tree = ET.parse(REPORT_PATH)
    for case in tree.findall(".//testcase"):
        name = case.attrib.get("name", "")
        passed = not any(case.find(tag) is not None for tag in ("failure", "error", "skipped"))
        seen[name] = seen.get(name, True) and passed

f2p = config.get("f2p_node_ids", [])
p2p = config.get("p2p_node_ids", [])
missing = [node for node in f2p + p2p if node not in seen]
failed = [node for node in f2p + p2p if node in seen and not seen[node]]
reward = int(bool(f2p) and not missing and not failed)

result = {
    "reward": reward,
    "f2p_total": len(f2p),
    "p2p_total": len(p2p),
    "missing": missing,
    "failed": failed,
}
print(json.dumps(result))
sys.exit(0 if reward else 1)
