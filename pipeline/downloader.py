"""
YouTube video download module.

Extracts metadata and downloads audio from YouTube videos using yt-dlp.
"""

import logging
import re
from pathlib import Path
from typing import Optional, TypedDict

import yt_dlp

logger = logging.getLogger(__name__)


class VideoMetadata(TypedDict):
    video_id: str
    title: str
    channel: str
    duration: int
    thumbnail: str
    upload_date: str


def extract_metadata(url: str) -> VideoMetadata:
    """Extract metadata from a YouTube video URL.

    Args:
        url: YouTube video URL.

    Returns:
        Dictionary containing video_id, title, channel, duration,
        thumbnail URL, and upload_date.

    Raises:
        ValueError: If the URL is invalid or metadata cannot be extracted.
        yt_dlp.utils.DownloadError: If yt-dlp encounters an error.
    """
    logger.info("Extracting metadata from: %s", url)

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except yt_dlp.utils.DownloadError as e:
        logger.error("Failed to extract metadata: %s", e)
        raise

    if info is None:
        raise ValueError(f"Could not extract metadata from URL: {url}")

    video_id = info.get("id", "")
    title = info.get("title", "")
    channel = info.get("channel", "") or info.get("uploader", "")
    duration = int(info.get("duration", 0))
    thumbnail = info.get("thumbnail", "")
    upload_date_raw = info.get("upload_date", "")

    # Format upload_date from YYYYMMDD to YYYY-MM-DD
    upload_date = upload_date_raw
    if upload_date_raw and len(upload_date_raw) == 8:
        upload_date = f"{upload_date_raw[:4]}-{upload_date_raw[4:6]}-{upload_date_raw[6:]}"

    metadata: VideoMetadata = {
        "video_id": video_id,
        "title": title,
        "channel": channel,
        "duration": duration,
        "thumbnail": thumbnail,
        "upload_date": upload_date,
    }

    logger.info(
        "Metadata extracted: '%s' by %s (%ds)",
        title,
        channel,
        duration,
    )
    return metadata


def download_audio(
    url: str,
    video_id: str,
    temp_dir: str = "pipeline/.tmp",
) -> str:
    """Download audio from a YouTube video as MP3.

    Args:
        url: YouTube video URL.
        video_id: Video ID used to name the output file.
        temp_dir: Directory for temporary audio files.

    Returns:
        Absolute path to the downloaded MP3 file.

    Raises:
        yt_dlp.utils.DownloadError: If download fails.
        FileNotFoundError: If the output file was not created.
    """
    temp_path = Path(temp_dir)
    temp_path.mkdir(parents=True, exist_ok=True)

    output_template = str(temp_path / f"{video_id}.%(ext)s")
    output_mp3 = temp_path / f"{video_id}.mp3"

    # If file already exists, skip download
    if output_mp3.exists():
        logger.info("Audio file already exists: %s", output_mp3)
        return str(output_mp3.resolve())

    logger.info("Downloading audio for video: %s", video_id)

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": output_template,
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }
        ],
        "quiet": True,
        "no_warnings": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except yt_dlp.utils.DownloadError as e:
        logger.error("Failed to download audio: %s", e)
        raise

    if not output_mp3.exists():
        raise FileNotFoundError(
            f"Expected audio file not found after download: {output_mp3}"
        )

    logger.info("Audio downloaded: %s", output_mp3.resolve())
    return str(output_mp3.resolve())


def extract_video_id_from_url(url: str) -> Optional[str]:
    """Extract video ID from various YouTube URL formats.

    Args:
        url: YouTube URL in any common format.

    Returns:
        Video ID string, or None if extraction fails.
    """
    patterns = [
        r"(?:v=|/v/|youtu\.be/)([a-zA-Z0-9_-]{11})",
        r"(?:embed/)([a-zA-Z0-9_-]{11})",
        r"(?:shorts/)([a-zA-Z0-9_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO)

    if len(sys.argv) < 2:
        print("Usage: python downloader.py <youtube_url>")
        sys.exit(1)

    url = sys.argv[1]
    meta = extract_metadata(url)
    print(f"Title: {meta['title']}")
    print(f"Channel: {meta['channel']}")
    print(f"Duration: {meta['duration']}s")
    print(f"Video ID: {meta['video_id']}")

    audio_path = download_audio(url, meta["video_id"])
    print(f"Audio saved to: {audio_path}")
