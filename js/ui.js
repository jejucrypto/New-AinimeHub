/**
 * UI Manager for the Anime Website
 * Handles rendering and UI interactions
 */
class UIManager {
    constructor() {
        // DOM Elements
        this.trendingAnimeContainer = document.getElementById('trending-anime');
        this.popularAnimeContainer = document.getElementById('popular-anime');
        this.highestRatedContainer = document.getElementById('highest-rated');
        this.topAnimeGrid = document.getElementById('top-anime-grid');
        this.seasonalAnimeGrid = document.getElementById('seasonal-anime-grid');
        this.genresGrid = document.getElementById('genres-grid');
        this.genreAnimeGrid = document.getElementById('genre-anime-grid');
        this.animeModal = document.getElementById('anime-modal');
        this.animeDetails = document.getElementById('anime-details');
        this.topPagination = document.getElementById('top-pagination');
        this.searchInput = document.getElementById('search-input');
        this.searchButton = document.getElementById('search-button');
        this.menuToggle = document.querySelector('.menu-toggle');
        this.navLinks = document.querySelector('.nav-links');
        this.closeModal = document.querySelector('.close-modal');
        this.topFilter = document.getElementById('top-filter');
        this.seasonSelect = document.getElementById('season-select');
        this.yearSelect = document.getElementById('year-select');
        
        // Initialize event listeners
        this.initEventListeners();
    }

    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Mobile menu toggle
        if (this.menuToggle && this.navLinks) {
            this.menuToggle.addEventListener('click', () => {
                this.navLinks.classList.toggle('active');
            });
        }

        // Close modal
        if (this.closeModal && this.animeModal) {
            this.closeModal.addEventListener('click', () => {
                this.animeModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            });
        }

        // Close modal when clicking outside
        if (this.animeModal) {
            window.addEventListener('click', (e) => {
                if (e.target === this.animeModal) {
                    this.animeModal.style.display = 'none';
                    document.body.style.overflow = 'auto';
                }
            });
        }
    }

    /**
     * Show loading indicator
     * @param {HTMLElement} container - Container element
     */
    showLoading(container) {
        container.innerHTML = '<div class="loading">Loading...</div>';
    }

    /**
     * Show error message
     * @param {HTMLElement} container - Container element
     * @param {string} message - Error message
     */
    showError(container, message) {
        container.innerHTML = `<div class="error">${message}</div>`;
    }

    /**
     * Create anime card element
     * @param {Object} anime - Anime data
     * @returns {HTMLElement} - Anime card element
     */
    createAnimeCard(anime) {
        const card = document.createElement('div');
        card.className = 'anime-card';
        card.dataset.id = anime.mal_id;

        const imageUrl = anime.images.jpg.image_url || 'images/placeholder.jpg';
        const title = anime.title || 'Unknown Title';
        const score = anime.score ? anime.score.toFixed(1) : 'N/A';
        const type = anime.type || 'Unknown';

        card.innerHTML = `
            <img src="${imageUrl}" alt="${title}" loading="lazy">
            <div class="anime-info">
                <h3 class="anime-title">${title}</h3>
                <div class="anime-meta">
                    <span>${type}</span>
                    <span class="anime-rating">
                        <i class="fas fa-star"></i> ${score}
                    </span>
                </div>
            </div>
        `;

        return card;
    }

    /**
     * Render anime list
     * @param {Array} animeList - List of anime
     * @param {HTMLElement} container - Container element
     */
    renderAnimeList(animeList, container) {
        container.innerHTML = '';

        if (!animeList || animeList.length === 0) {
            container.innerHTML = '<div class="no-results">No anime found</div>';
            return;
        }

        animeList.forEach(anime => {
            const card = this.createAnimeCard(anime);
            
            // Add click event to navigate to details page
            card.addEventListener('click', () => {
                window.location.href = `details.html?id=${anime.mal_id}`;
            });
            
            container.appendChild(card);
        });
    }

    /**
     * Render anime details in modal
     * @param {Object} anime - Anime data
     */
    renderAnimeDetails(anime) {
        const {
            title,
            title_japanese,
            images,
            synopsis,
            score,
            scored_by,
            rank,
            popularity,
            status,
            rating,
            season,
            year,
            genres,
            studios,
            episodes,
            duration,
            aired
        } = anime;

        // Format aired dates
        const airedFrom = aired?.from ? new Date(aired.from).toLocaleDateString() : 'Unknown';
        const airedTo = aired?.to ? new Date(aired.to).toLocaleDateString() : 'Ongoing';
        const airedText = `${airedFrom} to ${airedTo}`;

        // Format studios
        const studioNames = studios?.map(studio => studio.name).join(', ') || 'Unknown';

        // Create HTML content
        const detailsHTML = `
            <div class="anime-details">
                <div class="anime-poster">
                    <img src="${images.jpg.large_image_url}" alt="${title}">
                </div>
                <div class="anime-info-details">
                    <h2>${title}</h2>
                    <p class="japanese-title">${title_japanese || ''}</p>
                    
                    <div class="anime-stats">
                        ${score ? `<div class="anime-stat"><i class="fas fa-star"></i> ${score} (${scored_by?.toLocaleString() || 'N/A'} votes)</div>` : ''}
                        ${rank ? `<div class="anime-stat"><i class="fas fa-trophy"></i> Rank #${rank}</div>` : ''}
                        ${popularity ? `<div class="anime-stat"><i class="fas fa-heart"></i> Popularity #${popularity}</div>` : ''}
                        ${status ? `<div class="anime-stat"><i class="fas fa-info-circle"></i> ${status}</div>` : ''}
                        ${rating ? `<div class="anime-stat"><i class="fas fa-users"></i> ${rating}</div>` : ''}
                        ${season && year ? `<div class="anime-stat"><i class="fas fa-calendar"></i> ${season.charAt(0).toUpperCase() + season.slice(1)} ${year}</div>` : ''}
                    </div>
                    
                    <div class="anime-genres">
                        ${genres?.map(genre => `<span class="anime-genre">${genre.name}</span>`).join('') || ''}
                    </div>
                    
                    <div class="anime-synopsis">
                        <h3>Synopsis</h3>
                        <p>${synopsis || 'No synopsis available.'}</p>
                    </div>
                    
                    <div class="anime-details-info">
                        <p><strong>Episodes:</strong> ${episodes || 'Unknown'}</p>
                        <p><strong>Duration:</strong> ${duration || 'Unknown'}</p>
                        <p><strong>Aired:</strong> ${airedText}</p>
                        <p><strong>Studios:</strong> ${studioNames}</p>
                    </div>
                </div>
            </div>
        `;

        this.animeDetails.innerHTML = detailsHTML;
    }

    /**
     * Create pagination
     * @param {number} currentPage - Current page
     * @param {number} totalPages - Total pages
     * @param {Function} callback - Callback function when page is clicked
     * @param {HTMLElement} container - Container element
     */
    createPagination(currentPage, totalPages, callback, container) {
        container.innerHTML = '';

        // Previous button
        if (currentPage > 1) {
            const prevButton = document.createElement('button');
            prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
            prevButton.addEventListener('click', () => callback(currentPage - 1));
            container.appendChild(prevButton);
        }

        // Page numbers
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            
            if (i === currentPage) {
                pageButton.classList.add('active');
            }
            
            pageButton.addEventListener('click', () => callback(i));
            container.appendChild(pageButton);
        }

        // Next button
        if (currentPage < totalPages) {
            const nextButton = document.createElement('button');
            nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
            nextButton.addEventListener('click', () => callback(currentPage + 1));
            container.appendChild(nextButton);
        }
    }

    /**
     * Render genre list
     * @param {Array} genres - List of genres
     */
    renderGenres(genres) {
        this.genresGrid.innerHTML = '';

        genres.forEach(genre => {
            const genreCard = document.createElement('div');
            genreCard.className = 'genre-card';
            genreCard.dataset.id = genre.mal_id;
            genreCard.textContent = genre.name;
            this.genresGrid.appendChild(genreCard);
        });
    }
    
    /**
     * Create episode card element
     * @param {Object} anime - Anime data
     * @returns {HTMLElement} - Episode card element
     */
    createEpisodeCard(anime) {
        const card = document.createElement('div');
        card.className = 'episode-card';
        card.dataset.id = anime.mal_id;

        const imageUrl = anime.images.jpg.image_url || 'images/placeholder.jpg';
        const title = anime.title || 'Unknown Title';
        const episodeNum = anime.episodes || '?';
        const airingTime = anime.aired?.string || 'Unknown';

        card.innerHTML = `
            <img src="${imageUrl}" alt="${title}" class="episode-thumbnail" loading="lazy">
            <div class="episode-info">
                <h3 class="episode-title">${title}</h3>
                <div class="episode-meta">
                    <span class="episode-number">Episode ${episodeNum}</span>
                    <span class="episode-date">${airingTime}</span>
                </div>
            </div>
        `;

        return card;
    }
    
    /**
     * Render episode list
     * @param {Array} episodeList - List of episodes
     * @param {HTMLElement} container - Container element
     */
    renderEpisodeList(episodeList, container) {
        container.innerHTML = '';

        if (!episodeList || episodeList.length === 0) {
            container.innerHTML = '<div class="no-results">No episodes found</div>';
            return;
        }

        episodeList.forEach(anime => {
            const card = this.createEpisodeCard(anime);
            container.appendChild(card);
        });
    }

    /**
     * Populate year select dropdown
     */
    populateYearSelect() {
        const currentYear = new Date().getFullYear();
        this.yearSelect.innerHTML = '';
        
        // Add years from current year down to 1990
        for (let year = currentYear; year >= 1990; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            this.yearSelect.appendChild(option);
        }
    }

    /**
     * Show anime modal
     */
    showAnimeModal() {
        this.animeModal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
}

// Create a singleton instance
const uiManager = new UIManager();
