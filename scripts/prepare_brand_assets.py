"""Prepare Ask Zaen launch and platform brand assets from the symbol-only mark."""

from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/images/askzaen_wave_z_mark.png"
OUTPUT = ROOT / "assets/images"
WARM_WHITE = (250, 248, 245, 255)
SAGE = (63, 77, 53, 255)


def cropped_mark() -> Image.Image:
    mark = Image.open(SOURCE).convert("RGBA")
    alpha = mark.getchannel("A").point(lambda value: 255 if value >= 32 else 0)
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError("The source logo has no visible pixels")
    return mark.crop(bounds)


def render_mark(mark: Image.Image, size: int, scale: float, background: tuple[int, int, int, int]) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), background)
    content = mark.copy()
    content.thumbnail((round(size * scale), round(size * scale)), Image.Resampling.LANCZOS)
    left = (size - content.width) // 2
    top = (size - content.height) // 2
    canvas.alpha_composite(content, (left, top))
    return canvas


def render_monochrome(mark: Image.Image, size: int, scale: float) -> Image.Image:
    alpha = mark.getchannel("A")
    content = Image.new("RGBA", mark.size, SAGE)
    content.putalpha(alpha)
    return render_mark(content, size, scale, (0, 0, 0, 0))


def main() -> None:
    mark = cropped_mark()

    # Adaptive icons receive a separate opaque background layer.
    Image.new("RGBA", (1024, 1024), WARM_WHITE).save(OUTPUT / "android-icon-background.png", optimize=True)

    # The general app icon is opaque and square, as required by the platform stores.
    render_mark(mark, 1024, 0.76, WARM_WHITE).save(OUTPUT / "icon.png", optimize=True)

    # Adaptive foreground and splash art stay transparent so Expo can compose them.
    render_mark(mark, 1024, 0.64, (0, 0, 0, 0)).save(OUTPUT / "android-icon-foreground.png", optimize=True)
    render_monochrome(mark, 1024, 0.64).save(OUTPUT / "android-icon-monochrome.png", optimize=True)
    render_mark(mark, 1024, 0.62, (0, 0, 0, 0)).save(OUTPUT / "splash-icon.png", optimize=True)

    # A small opaque favicon remains legible on browser tabs and bookmarks.
    render_mark(mark, 192, 0.74, WARM_WHITE).save(OUTPUT / "favicon.png", optimize=True)


if __name__ == "__main__":
    main()
