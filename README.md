# GNOME Shell extensions (`@imam`)

Personal collection of **GNOME Shell 45+** extensions written as **ES modules** (`import` / `export`). Each extension lives in its own directory named `{uuid}/` and can be installed by copying that folder into your local extensions path.

## Requirements

- GNOME Shell **45** or later (see each extension’s `metadata.json` for `shell-version`).
- Extensions enabled (e.g. **Extensions** app, or `gnome-extensions`).

## Extensions

| UUID | Name | Summary |
|------|------|---------|
| [`system-monitor@muhammad-imam-hasan.com`](system-monitor@muhammad-imam-hasan.com/README.md) | System Monitor | Top-bar uptime, CPU, and RAM; dropdown with memory, disk, and network metrics. |
| [`clipboard-manager@muhammad-imam-hasan.com`](clipboard-manager@muhammad-imam-hasan.com/README.md) | Clipboard History | Searchable history, categories, optional encrypted JSON persistence; event-driven clipboard capture. |

## Install (any extension)

1. Copy the extension directory to:

   `~/.local/share/gnome-shell/extensions/<uuid>/`

   Example:

   ```bash
   cp -r system-monitor@muhammad-imam-hasan.com ~/.local/share/gnome-shell/extensions/
   cp -r clipboard-manager@muhammad-imam-hasan.com ~/.local/share/gnome-shell/extensions/
   ```

2. Enable it:

   ```bash
   gnome-extensions enable system-monitor@muhammad-imam-hasan.com
   gnome-extensions enable clipboard-manager@muhammad-imam-hasan.com
   ```

   Or use the **Extensions** application.

3. **Reload GNOME Shell** so changes load:

   - **X11:** Alt+F2, type `r`, Enter.
   - **Wayland:** log out and back in (or restart the session).

## Debug logs

Shell extensions run inside `gnome-shell`. To follow messages (including `log()` output):

```bash
journalctl -f /usr/bin/gnome-shell
```

Filter by UUID string, for example:

```bash
journalctl -f /usr/bin/gnome-shell | grep --line-buffered '@imam'
```

## Repository layout

```
my-extensions/
├── README.md                 # This file
├── system-monitor@muhammad-imam-hasan.com/              # System Monitor extension
└── clipboard-manager@muhammad-imam-hasan.com/           # Clipboard History extension
```

Each extension folder has its own `README.md` and subfolders include short `README.md` files describing their role.

## License

Add a root `LICENSE` if you distribute these extensions; otherwise treat as private / all rights reserved unless you state otherwise.
