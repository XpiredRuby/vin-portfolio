# Assets

Place static media files in this directory.

## Required files

| File | Description |
|------|-------------|
| `resume.pdf` | Your resume PDF — linked from nav, hero CTA, and contact page |

## Optional files

| File | Description |
|------|-------------|
| `ghost-demo.mp4` | GHOST project demo video — embed in `index.html` and `projects.html` |
| `pendulum-demo.mp4` | Inverted pendulum demo video — embed in `projects.html` |
| `images/` | Any project screenshots or diagrams |

## Embedding videos

Replace the `.video-embed` placeholder div with a standard HTML5 video element:

```html
<video class="video-player" controls preload="metadata" aria-label="GHOST demo video">
  <source src="assets/ghost-demo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>
```

Add corresponding styles to `styles.css` if needed:

```css
.video-player {
  width: 100%;
  margin-top: 1.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
```
