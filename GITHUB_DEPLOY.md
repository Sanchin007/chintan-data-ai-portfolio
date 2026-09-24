# Deploy to GitHub Pages

## Recommended: create a separate repository
Keep the Decathlon portfolio in its existing repository and deploy this Data & AI/ML portfolio separately.

Suggested repository name:
`chintan-data-ai-portfolio`

## Browser / GitHub UI method
1. Sign in to GitHub.
2. Create a new **Public** repository named `chintan-data-ai-portfolio`.
3. Do not initialize it with another website template.
4. Open the repository and choose **Add file → Upload files**.
5. Upload the contents of the portfolio folder, not the parent folder:
   - `index.html`
   - `styles.css`
   - `projects.js`
   - `script.js`
   - optional `README.md`
6. Commit directly to `main`.
7. Open **Settings → Pages**.
8. Under **Build and deployment**, select **Deploy from a branch**.
9. Select branch `main` and folder `/ (root)`, then Save.
10. Wait for the Pages deployment to complete. The URL will normally be:
    `https://<github-username>.github.io/chintan-data-ai-portfolio/`

## Important
- Use the multi-file version for GitHub Pages. Do not upload only the standalone HTML file.
- Keep all four core files at the same repository root because `index.html` uses relative references.
- When replacing files later, increment the cache version in `index.html` (`?v=40`) if the browser keeps an older CSS/JS copy.
