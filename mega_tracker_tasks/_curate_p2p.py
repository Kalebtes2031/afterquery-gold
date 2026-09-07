# -*- coding: utf-8 -*-
import json
import re
from pathlib import Path

REPO = Path(r"E:/Webapps/afterquerytrain/afterquery-gold/mega-tracker")
OUT = Path(r"E:/Webapps/afterquerytrain/afterquery-gold/mega_tracker_tasks/_shared_p2p_ids.json")

P2P_FILES = [
    "src/modules/accounts/domain/__tests__/Account.test.ts",
    "src/modules/accounts/domain/__tests__/Account.getters.test.ts",
    "src/modules/branches/domain/__tests__/Branch.test.ts",
    "src/shared/infrastructure/pagination/__tests__/CursorPager.test.ts",
    "src/modules/inventory/domain/__tests__/Product.test.ts",
    "src/modules/finance/domain/__tests__/FinanceDomain.test.ts",
    "src/modules/partners/domain/__tests__/Partner.test.ts",
    "src/modules/sales/domain/__tests__/SaleOrder.test.ts",
    "src/modules/purchases/domain/__tests__/PurchaseOrder.test.ts",
    "src/modules/inventory/domain/__tests__/InventoryMovementService.test.ts",
    "src/modules/inventory/domain/__tests__/Valuation.test.ts",
    "src/modules/inventory/domain/__tests__/InventoryBalanceService.test.ts",
    "src/modules/company/domain/__tests__/Company.test.ts",
    "src/modules/employees/domain/__tests__/Employee.test.ts",
    "src/modules/expenses/domain/__tests__/Expense.test.ts",
    "src/modules/roles/domain/__tests__/RoleDomain.test.ts",
]

DESCRIBE = re.compile(r"""^\s*describe\(\s*["']([^"']+)["']""")
IT = re.compile(r"""^\s*it\(\s*["']([^"']+)["']""")


def extract_from(path: Path) -> list[str]:
    ids: list[str] = []
    stack: list[tuple[int, str]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        m = DESCRIBE.match(line)
        if m:
            indent = len(line) - len(line.lstrip(" "))
            while stack and stack[-1][0] >= indent:
                stack.pop()
            stack.append((indent, m.group(1)))
            continue
        m = IT.match(line)
        if m and stack:
            ids.append(" > ".join([s[1] for s in stack] + [m.group(1)]))
    return ids


def main() -> None:
    ids: list[str] = []
    for rel in P2P_FILES:
        ids.extend(extract_from(REPO / rel))
    seen: set[str] = set()
    unique: list[str] = []
    for i in ids:
        if i not in seen:
            seen.add(i)
            unique.append(i)
    OUT.write_text(json.dumps(unique, indent=2) + "\n", encoding="utf-8")
    print(f"p2p curated count={len(unique)} files={len(P2P_FILES)}")
    meta = {
        "files": P2P_FILES,
        "count": len(unique),
    }
    Path(r"E:/Webapps/afterquerytrain/afterquery-gold/mega_tracker_tasks/_shared_p2p_meta.json").write_text(
        json.dumps(meta, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
