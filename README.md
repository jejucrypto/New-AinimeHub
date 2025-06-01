# AniExplore - Anime Website

AniExplore is a modern, responsive anime website built with HTML, CSS, and JavaScript. It uses the Jikan API (unofficial MyAnimeList API) to display anime information, including details, episodes, and more.

## Features

- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern UI**: Clean and intuitive user interface with smooth animations
- **Multiple Pages**: Home, Top Anime, Seasonal Anime, and Genres
- **Search Functionality**: Search for any anime by title
- **Detailed Information**: View comprehensive details about each anime
- **Filtering Options**: Filter anime by season, year, and genre

## Project Structure

```
anime-website/
├── css/
│   └── style.css
├── js/
│   ├── api.js
│   ├── ui.js
│   └── app.js
├── images/
└── index.html
```

- **index.html**: Main HTML file
- **css/style.css**: Styling for the website
- **js/api.js**: Handles API calls to Jikan API
- **js/ui.js**: Manages UI rendering and components
- **js/app.js**: Main application logic

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection to fetch data from the Jikan API

### Installation

1. Clone or download this repository
2. Open the `index.html` file in your web browser

That's it! No build process or dependencies required.

## Deployment

### Option 1: GitHub Pages

1. Create a GitHub repository
2. Upload the project files
3. Go to Settings > Pages
4. Select the main branch as the source
5. Your site will be published at `https://yourusername.github.io/repository-name/`

### Option 2: Netlify

1. Sign up for a Netlify account
2. Drag and drop the project folder to the Netlify dashboard
3. Your site will be deployed with a Netlify subdomain
4. You can configure a custom domain in the Netlify settings

### Option 3: Vercel

1. Sign up for a Vercel account
2. Install Vercel CLI: `npm i -g vercel`
3. Navigate to your project directory and run: `vercel`
4. Follow the prompts to deploy your site

## API Usage

This project uses the [Jikan API](https://jikan.moe/), which is a free, open-source API for MyAnimeList. The API has rate limiting of 3 requests per second, which is handled by the application.

## Customization

- **Colors**: Edit the CSS variables in the `:root` selector in `style.css`
- **Hero Image**: Replace the hero background URL in the `.hero` class in `style.css`
- **Logo**: Change the logo text in the HTML file

## License

This project is open source and available under the MIT License.

## Acknowledgements

- [Jikan API](https://jikan.moe/) for providing anime data
- [Font Awesome](https://fontawesome.com/) for icons
- [Google Fonts](https://fonts.google.com/) for typography
