from pathlib import Path
import sys


ROOT = Path(__file__).parents[1]
LOCAL_DEPS = ROOT / ".python"

if LOCAL_DEPS.exists():
    sys.path.insert(0, str(LOCAL_DEPS))

sys.path.insert(0, str(ROOT))

import uvicorn


if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000)
