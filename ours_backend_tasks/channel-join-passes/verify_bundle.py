from pathlib import Path

root = Path(__file__).resolve().parent
instruction = (root / "instruction.md").read_bytes()
solution = (root / "solution" / "solution.patch").read_bytes()
tests = (root / "tests" / "test.patch").read_bytes()
config = (root / "tests" / "config.json").read_bytes()
script = (root / "tests" / "test.sh").read_bytes()

for name, raw in {
    "instruction.md": instruction,
    "solution.patch": solution,
    "test.patch": tests,
    "config.json": config,
    "test.sh": script,
}.items():
    if raw.startswith(b"\xef\xbb\xbf"):
        raise SystemExit(f"FAIL: {name} has a BOM")
    if b"\r" in raw:
        raise SystemExit(f"FAIL: {name} contains Windows CRLF")

sol_lines = sum(1 for line in solution.splitlines() if line.startswith(b"+") and not line.startswith(b"+++"))
test_lines = sum(1 for line in tests.splitlines() if line.startswith(b"+") and not line.startswith(b"+++"))
sol_files = sum(1 for line in solution.splitlines() if line.startswith(b"diff --git"))
test_file_count = sum(1 for line in tests.splitlines() if line.startswith(b"diff --git"))
words = len(
    (root / "instruction.md")
    .read_text(encoding="utf-8")
    .replace(
        "IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.",
        "",
    )
    .split()
)

print(f"OK: solution.patch +lines = {sol_lines} files = {sol_files}")
print(f"OK: test.patch +lines = {test_lines} files = {test_file_count}")
print(f"OK: instruction words = {words}")

if sol_lines < 459:
    raise SystemExit("FAIL: solution added lines below 459")
if sol_files < 4:
    raise SystemExit("FAIL: solution file count below 4")
if test_lines < 596:
    raise SystemExit("FAIL: test added lines below 596")
if test_file_count < 2:
    raise SystemExit("FAIL: test file count below 2")
if words < 100 or words > 300:
    raise SystemExit("FAIL: instruction word count out of range")
if not (root / "instruction.md").read_text(encoding="utf-8").rstrip().endswith(
    "IMPORTANT: Please work on this in a new branch from main and commit everything when you are done."
):
    raise SystemExit("FAIL: instruction missing mandatory last line")

print("All pre-submit checks passed. Safe to paste to platform.")
