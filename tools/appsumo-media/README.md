# AppSumo listing images

Makes the 1920x1080 hero and story images in brand/appsumo/listing from real app screens with sample data.
Run from a working folder (it writes shots/, crops/, th/ and out/ there):

1. `node cap.js /path/to/app/app.js shots s1.json` (and s2.json, s3.json): app screens. cap.js adds a run() hook to a copy of the app; the shipped app is unchanged.
2. `node capu.js shots`: recipient page screens (demo=1).
3. `python3 crop.py`: phone-sized crops (crop names and offsets are at the top).
4. `node compose.js`: writes out/slice-of-thanks-hero.png and story-1..4.png.

AppSumo needs 1920x1080 or larger, 16:9, PNG or JPEG, under 5 MB.
