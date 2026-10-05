import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
STATE_FILE = ROOT / ".codex" / "capture_state.json"


def main():
    try:
        event = json.load(sys.stdin)
    except Exception:
        return

    session_id = event.get("session_id", "unknown-session")
    model = event.get("model", "unknown-model")
    response = event.get("last_assistant_message") or ""

    if not STATE_FILE.exists():
        return

    try:
        state = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return

    session = state.get(session_id)
    if not session:
        return

    log_file = session.get("log_file")
    if not log_file:
        return

    log_path = Path(log_file)

    with log_path.open("a", encoding="utf-8") as f:
        f.write(
            f"[LOG_ENTRY type=RESPONSE num={session.get('exchange', 0)} session={session_id}]\n"
            f"model: {model}\n\n"
            f"{response}\n\n\n"
        )


if __name__ == "__main__":
    main()