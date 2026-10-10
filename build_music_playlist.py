import json
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parent
PLAYLISTS = [
    PROJECT_DIR / "assets" / "music" / "playlist.json",
    PROJECT_DIR / "dist" / "assets" / "music" / "playlist.json",
]
TRACKS = [
    {"title": "คนละชั้น - JAONAAY", "videoId": "Lxeq3_uWib8"},
    {"title": "พลังงานจน - LABANOON", "videoId": "mSgf8hZw4fg"},
    {"title": "วลีรัก - ONENIGHT Ft ZoneC Thedays", "videoId": "2J_2poN0_1c"},
    {"title": "แพงอ้าย - SOPHANA", "videoId": "D3H3ZAFsdF4"},
]


def main() -> None:
    content = json.dumps(TRACKS, ensure_ascii=False, indent=2) + "\n"
    for playlist in PLAYLISTS:
        playlist.parent.mkdir(parents=True, exist_ok=True)
        playlist.write_text(content, encoding="utf-8")
    print(f"Updated {len(PLAYLISTS)} playlists with {len(TRACKS)} YouTube videos.")


if __name__ == "__main__":
    main()
