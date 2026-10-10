# WebWakumi

Static site for GitHub Pages: <https://ysdwakumi.github.io/WebWakumi/>.

Before the first deployment, enable GitHub Pages in **Settings → Pages** and select **GitHub Actions** as the build and deployment source. Pushing to `main` then deploys the `dist` site automatically.

The music player publishes the MP3 files in `dist/assets/music` and reads its track list from `dist/assets/music/playlist.json`. The playlist is rebuilt from ID3 tags with `python build_music_playlist.py`. Only add audio that is licensed for redistribution.
