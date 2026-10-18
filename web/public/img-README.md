# Image folder

Drop your real photos in here, then point the site at them.

## Suggested filenames
- `interior.jpg` — dining room, wide, at least 1600px
- `dining.jpg` — tables and counter
- `food-*.jpg` — one per hero dish on the menu
- `person-1.jpg`, `person-2.jpg`, `person-3.jpg` — team headshots, square
- `og-image.jpg` — 1200x630, used for social sharing previews

## Where each is referenced
| Place | File |
| --- | --- |
| Interior hero on About page | `about.html`, block marked `Interior photo` |
| Team photos | `CT.team[].img` in `assets/js/data.js` |
| Social preview image | `<meta property="og:image">` in `<head>` of every page |
| Map | `CT.site.mapEmbed` in `assets/js/data.js` |

The `placeholder/` folder holds the grey silhouette SVGs used until you
replace them.

## Good photography, cheaply
- Shoot near the window between 11:00 and 14:00, no flash
- One wide establishing shot, then close-ups of three or four dishes
- Portrait crops for team shots, square, chest up
- Compress before uploading: aim for under 300KB per image
