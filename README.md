# UniMelb CS Open Letter

A single-page website hosting an open letter to the University of Melbourne Computer Science Department addressing critical concerns about curriculum quality and missing fundamental courses.

## Purpose

This website serves as a public platform for frustrated UniMelb CS post-graduate students to voice their concerns about:

- Missing fundamental computer science courses (compilers, systems, networking)
- Poor quality of current course offerings
- Inadequate preparation for both industry and academia
- Stark differences compared to international CS programs

## SEO Optimization

The site is heavily optimized for search terms like "UniMelb CS", "University of Melbourne Computer Science", and related queries through:

- **Meta Tags**: Comprehensive title, description, and keyword tags
- **Open Graph**: Social media sharing optimization
- **Schema.org**: Structured data for rich snippets
- **Semantic HTML**: Proper heading hierarchy and content structure
- **Mobile Responsive**: Mobile-first design approach
- **Fast Loading**: Minimal dependencies, optimized CSS
- **Sitemap & Robots.txt**: Search engine crawling guidance

## Files Structure

```
├── index.html          # Main webpage (signature block is auto-generated)
├── styles.css          # Responsive stylesheet
├── script.js           # Share-button interactions
├── signatures.json     # Source of truth for signatures
├── build.py            # Renders signatures.json into index.html via Jinja
├── requirements.txt    # Python deps for build.py
├── sitemap.xml         # Search engine sitemap
├── robots.txt          # Crawler instructions
└── README.md           # Project documentation
```

## Signing the letter

Add an entry to `signatures.json` via pull request. After merge, GitHub Actions
runs `build.py` to render the signature into `index.html`.

## Building locally

The signature list in `index.html` is generated from `signatures.json` between
the `<!-- SIGNATURES:START -->` and `<!-- SIGNATURES:END -->` markers. After
editing `signatures.json` (or to preview locally):

```bash
pip install -r requirements.txt
python build.py
```

The script is idempotent — re-running with no changes is a no-op.

## Local Development

1. Clone or download the project files
2. Run `python build.py` after any change to `signatures.json`
3. Serve locally:
   ```bash
   python -m http.server 8000
   ```

## Deployment

### GitHub Pages
1. Push to a GitHub repository
2. Enable GitHub Pages in repository settings
3. Select source branch (main/master)

### Netlify
1. Drag and drop the project folder to Netlify
2. Custom domain can be configured for better SEO

### Vercel
```bash
npx vercel --prod
```

### Traditional Web Hosting
Upload all files to your web hosting provider's public directory.

## SEO Checklist

- ✅ Title tag with target keywords
- ✅ Meta description (under 160 characters)
- ✅ H1, H2, H3 heading hierarchy
- ✅ Alt tags for images (if added)
- ✅ Internal linking structure
- ✅ Mobile responsive design
- ✅ Fast loading times
- ✅ Schema.org structured data
- ✅ Open Graph tags
- ✅ Canonical URL
- ✅ Sitemap.xml
- ✅ Robots.txt

## Target Keywords

- UniMelb CS
- University of Melbourne Computer Science
- Melbourne University CS Department
- UniMelb curriculum concerns
- CS education quality Melbourne

## Performance

- No external dependencies
- Optimized CSS with modern techniques
- Semantic HTML for accessibility
- Print-friendly styles
- Cross-browser compatibility

## Contributing

This is a community-driven open letter. To suggest changes or corrections:

1. Join the Discord community: https://discord.gg/MXqbgYWK82
2. Discuss proposed changes with the community
3. Submit updates through appropriate channels

## License

This content is made available for the purpose of raising awareness about CS education concerns at the University of Melbourne. 