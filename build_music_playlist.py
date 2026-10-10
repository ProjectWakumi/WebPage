import json
import struct
from pathlib import Path
from urllib.parse import quote


PROJECT_DIR = Path(__file__).resolve().parent
MUSIC_DIR = PROJECT_DIR / "assets" / "music"
PLAYLIST_FILE = MUSIC_DIR / "playlist.json"
TRACK_ORDER = [
    "คนละชั้น - JAONAAY.mp3",
    "พลังงานจน - LABANOON.mp3",
    "วลีรัก - ONENIGHT Ft ZoneC Thedays.mp3",
    "แพงอ้าย - SOPHANA.mp3",
]
TRACK_TITLES = {
    "คนละชั้น - JAONAAY.mp3": "คนละชั้น - JAONAAY",
    "พลังงานจน - LABANOON.mp3": "พลังงานจน - LABANOON",
    "วลีรัก - ONENIGHT Ft ZoneC Thedays.mp3": "วลีรัก - ONENIGHT Ft ZoneC Thedays",
    "แพงอ้าย - SOPHANA.mp3": "แพงอ้าย - SOPHANA",
}
TRACK_TITLE_MARKERS = {
    "คนละชั้น - JAONAAY.mp3": "คนละชั้น",
    "พลังงานจน - LABANOON.mp3": "พลังงานจน",
    "วลีรัก - ONENIGHT Ft ZoneC Thedays.mp3": "วลีรัก",
    "แพงอ้าย - SOPHANA.mp3": "ແພງອ້າຍ",
}


def _decode_text_frame(frame: bytes) -> str | None:
    if not frame:
        return None

    encoding = frame[0]
    payload = frame[1:]
    codecs = {0: "latin-1", 1: "utf-16", 2: "utf-16-be", 3: "utf-8"}
    codec = codecs.get(encoding)
    if codec is None:
        return None

    try:
        title = payload.decode(codec).strip("\x00\ufffe\uffff ").strip()
    except UnicodeDecodeError:
        return None
    return title or None


def read_mp3_title(path: Path) -> str | None:
    with path.open("rb") as file:
        header = file.read(10)
        if len(header) != 10 or header[:3] != b"ID3" or header[3] not in (3, 4):
            return None

        version = header[3]
        flags = header[5]
        tag_size = sum(byte << shift for byte, shift in zip(header[6:10], (21, 14, 7, 0)))
        tag_end = 10 + tag_size

        if flags & 0x40:
            extended_header = file.read(4)
            if len(extended_header) != 4:
                return None
            extended_size = (
                struct.unpack(">I", extended_header)[0]
                if version == 3
                else sum(byte << shift for byte, shift in zip(extended_header, (21, 14, 7, 0)))
            )
            file.seek(4 + extended_size if version == 3 else extended_size, 1)

        while file.tell() + 10 <= tag_end:
            frame_header = file.read(10)
            frame_id = frame_header[:4]
            if frame_id == b"\x00\x00\x00\x00":
                break

            frame_size = (
                struct.unpack(">I", frame_header[4:8])[0]
                if version == 3
                else sum(byte << shift for byte, shift in zip(frame_header[4:8], (21, 14, 7, 0)))
            )
            if frame_size <= 0 or file.tell() + frame_size > tag_end:
                break

            frame_flags = frame_header[9]
            if frame_id != b"TIT2" or frame_flags & (0x80 | 0x40):
                file.seek(frame_size, 1)
                continue

            frame = file.read(frame_size)
            if version == 4 and frame_flags & 0x40:
                frame = frame[1:]
            return _decode_text_frame(frame)

    return None


def main() -> None:
    paths = sorted(
        MUSIC_DIR.glob("*.mp3"),
        key=lambda item: (
            TRACK_ORDER.index(item.name) if item.name in TRACK_ORDER else len(TRACK_ORDER),
            item.name.casefold(),
        ),
    )
    tracks = []
    for path in paths:
        embedded_title = read_mp3_title(path)
        expected_marker = TRACK_TITLE_MARKERS.get(path.name)
        if expected_marker and (embedded_title is None or expected_marker not in embedded_title):
            raise SystemExit(
                f"Track mismatch: {path.name} is expected to contain "
                f"{expected_marker!r}, but its MP3 title is {embedded_title!r}. "
                "Replace the file with the correct audio before rebuilding the playlist."
            )

        if embedded_title is None:
            raise SystemExit(
                f"Missing MP3 title metadata in {path.name}. "
                "Add an ID3 title tag before rebuilding the playlist."
            )

        title = TRACK_TITLES.get(path.name) or embedded_title
        tracks.append({"title": title, "src": "assets/music/" + quote(path.name)})

    if not tracks:
        raise SystemExit(f"No MP3 files found in {MUSIC_DIR}")

    PLAYLIST_FILE.write_text(
        json.dumps(tracks, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Updated {PLAYLIST_FILE.name} with {len(tracks)} tracks.")


if __name__ == "__main__":
    main()
