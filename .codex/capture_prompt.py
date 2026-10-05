import json
import sys
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
LOG_DIR = ROOT / ".agent-logs"
STATE_FILE = ROOT / ".codex" / "capture_state.json"


def utc_now():
    return datetime.now(timezone.utc).isoformat(
        timespec="milliseconds"
    ).replace("+00:00", "Z")


def main():
    try:
        event = json.load(sys.stdin)
    except Exception:
        return

    session_id = event.get("session_id", "unknown-session")
    model = event.get("model", "unknown-model")
    prompt = event.get("prompt", "")
    timestamp = utc_now()

    LOG_DIR.mkdir(parents=True, exist_ok=True)

    state = {}
    if STATE_FILE.exists():
        try:
            state = json.loads(
                STATE_FILE.read_text(encoding="utf-8")
            )
        except Exception:
            state = {}

    session = state.get(session_id, {})
    exchange = int(session.get("exchange", 0)) + 1

    if "log_file" not in session:
        filename = (
            datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M-%S")
            + f"_{session_id}.md"
        )

        log_path = LOG_DIR / filename

        header = (
            "---\n"
            f"session_id: {session_id}\n"
            f"date: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}\n"
            "author: adithyap3113\n"
            f"model: {model}\n"
            "tool: codex-cli\n"
            "project: amazon-clone-8x\n"
            f"total_exchanges: {exchange}\n"
            f"first_prompt_time: {timestamp}\n"
            f"last_prompt_time: {timestamp}\n"
            "---\n\n"
            f"# Session Log - "
            f"{datetime.now(timezone.utc).strftime('%Y-%m-%d')}\n\n"
            f"Session: `{session_id}` | "
            "Project: `amazon-clone-8x` | "
            "Author: `adithyap3113`\n\n"
            "---\n\n"
        )

        log_path.write_text(header, encoding="utf-8")
        session["log_file"] = str(log_path)

    else:
        log_path = Path(session["log_file"])

    with log_path.open("a", encoding="utf-8") as f:
        f.write(
            f"[LOG_ENTRY type=PROMPT num={exchange} "
            f"session={session_id}]\n"
            f"timestamp: {timestamp}\n"
            f"model: {model}\n\n"
            f"{prompt}\n\n\n"
        )

    session["exchange"] = exchange
    session["model"] = model
    session["last_prompt_time"] = timestamp
    state[session_id] = session

    STATE_FILE.write_text(
        json.dumps(state, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()