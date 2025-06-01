/**
 * Main Application Logic
 * Handles page navigation and data fetching
 */
document.addEventListener('DOMContentLoaded', () => {
    // State
    const state = {
        currentPage: 'home',
        topAnimePage: 1,
        topAnimeType: 'bypopularity', // Updated to use a valid filter value for Jikan API v4
        currentSeason: getCurrentSeason(),
        currentYear: new Date().getFullYear(),
        selectedGenreId: null,
        sliderIndex: 0,
        featuredAnime: [],
        // Specific anime titles to feature in the slider
        featuredAnimeTitles: [
            "Lazarus",
            "The Beginning After the End",
            "Wind Breaker",
            "One Piece",
            "The Brilliant Healer's New Life"
        ]
    };

    // DOM Elements
    const navLinks = document.querySelectorAll('.nav-links a');
    const footerLinks = document.querySelectorAll('.footer-links a');
    const pages = document.querySelectorAll('.page');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const topFilter = document.getElementById('top-filter');
    const seasonSelect = document.getElementById('season-select');
    const yearSelect = document.getElementById('year-select');
    const featuredSlider = document.getElementById('featured-slider');
    const prevSlideBtn = document.getElementById('prev-slide');
    const nextSlideBtn = document.getElementById('next-slide');
    const sliderDots = document.getElementById('slider-dots');

    // Initialize
    init();

    /**
     * Initialize the application
     */
    function init() {
        // Set up event listeners
        setupEventListeners();
        
        // Check if we're on the details page
        const isDetailsPage = window.location.pathname.includes('details.html');
        
        if (!isDetailsPage) {
            // Initialize UI components (only needed for main pages)
            if (uiManager && typeof uiManager.populateYearSelect === 'function') {
                uiManager.populateYearSelect();
            }
            
            // Set default selected values
            if (seasonSelect) {
                seasonSelect.value = state.currentSeason;
            }
            
            if (yearSelect) {
                yearSelect.value = state.currentYear;
            }
            
            // Load initial data
            loadHomePage();
            
            // Preload other page data
            loadTopAnimePage();
            loadSeasonalAnimePage();
            loadGenresPage();
        }
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Navigation links
        if (navLinks) {
            navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const page = link.dataset.page;
                    navigateToPage(page);
                });
            });
        }

        // Footer links
        if (footerLinks) {
            footerLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const page = link.dataset.page;
                    navigateToPage(page);
                });
            });
        }

        // Search
        if (searchButton && searchInput) {
            searchButton.addEventListener('click', handleSearch);
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleSearch();
                }
            });
        }

        // Top anime filter
        if (topFilter) {
            topFilter.addEventListener('change', () => {
                state.topAnimeType = topFilter.value;
                state.topAnimePage = 1;
                loadTopAnimePage();
            });
        }

        // Seasonal anime filters
        if (seasonSelect) {
            seasonSelect.addEventListener('change', () => {
                state.currentSeason = seasonSelect.value;
                loadSeasonalAnimePage();
            });
        }
        
        if (yearSelect) {
            yearSelect.addEventListener('change', () => {
                state.currentYear = yearSelect.value;
                loadSeasonalAnimePage();
            });
        }

        // Anime card click event (using event delegation)
        document.addEventListener('click', (e) => {
            const animeCard = e.target.closest('.anime-card');
            if (animeCard) {
                const animeId = animeCard.dataset.id;
                loadAnimeDetails(animeId);
            }
        });

        // Genre card click event (using event delegation)
        document.addEventListener('click', (e) => {
            const genreCard = e.target.closest('.genre-card');
            if (genreCard) {
                const genreId = genreCard.dataset.id;
                state.selectedGenreId = genreId;
                loadAnimeByGenre(genreId);
            }
        });
        
        // Slider navigation
        if (prevSlideBtn) {
            prevSlideBtn.addEventListener('click', () => {
                navigateSlider('prev');
            });
        }
        
        if (nextSlideBtn) {
            nextSlideBtn.addEventListener('click', () => {
                navigateSlider('next');
            });
        }
        
        // Slider dot navigation (using event delegation)
        if (sliderDots) {
            sliderDots.addEventListener('click', (e) => {
                const dot = e.target.closest('.slider-dot');
                if (dot) {
                    const index = parseInt(dot.dataset.index);
                    goToSlide(index);
                }
            });
            
            // Auto slide every 5 seconds
            setInterval(() => {
                if (document.visibilityState === 'visible' && state.currentPage === 'home') {
                    navigateSlider('next');
                }
            }, 5000);
        }
    }

    /**
     * Navigate to a page
     * @param {string} page - Page name
     */
    function navigateToPage(page) {
        // Update active link
        navLinks.forEach(link => {
            if (link.dataset.page === page) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Show selected page
        pages.forEach(p => {
            if (p.id === `${page}-page`) {
                p.classList.add('active');
            } else {
                p.classList.remove('active');
            }
        });

        // Update state
        state.currentPage = page;

        // Close mobile menu if open
        document.querySelector('.nav-links').classList.remove('active');

        // Scroll to top
        window.scrollTo(0, 0);
    }

    /**
     * Load home page data
     */
    async function loadHomePage() {
        try {
            // Show loading indicators
            featuredSlider.innerHTML = '<div class="loading">Loading featured anime...</div>';
            uiManager.showLoading(uiManager.trendingAnimeContainer);
            uiManager.showLoading(uiManager.popularAnimeContainer);
            uiManager.showLoading(uiManager.highestRatedContainer);

            // Start all data fetching in parallel
            const featuredPromise = animeAPI.getSpecificAnimes(state.featuredAnimeTitles);
            const popularPromise = animeAPI.fetchPopularAnime(20);
            const newReleasesPromise = animeAPI.fetchNewReleases(20);
            const highestRatedPromise = animeAPI.fetchHighestRatedAnime(20);
            
            // Process featured anime (slider) first as it's most visible
            try {
                const featuredAnimeData = await featuredPromise;
                state.featuredAnime = featuredAnimeData;
                renderSlider(featuredAnimeData);
            } catch (sliderError) {
                console.error('Error loading slider anime:', sliderError);
                featuredSlider.innerHTML = '<div class="error">Failed to load featured anime</div>';
            }

            // Process the rest of the data as it becomes available
            // Using Promise.allSettled to handle each promise independently
            const results = await Promise.allSettled([
                popularPromise,
                newReleasesPromise,
                highestRatedPromise
            ]);
            
            // Handle popular anime results
            if (results[0].status === 'fulfilled' && results[0].value.length > 0) {
                uiManager.renderAnimeList(results[0].value, uiManager.trendingAnimeContainer);
            } else {
                uiManager.showError(uiManager.trendingAnimeContainer, 'Failed to load popular anime');
            }
            
            // Handle new releases results
            if (results[1].status === 'fulfilled' && results[1].value.length > 0) {
                uiManager.renderAnimeList(results[1].value, uiManager.popularAnimeContainer);
            } else {
                uiManager.showError(uiManager.popularAnimeContainer, 'Failed to load new releases');
            }
            
            // Handle highest rated results
            if (results[2].status === 'fulfilled' && results[2].value.length > 0) {
                uiManager.renderAnimeList(results[2].value, uiManager.highestRatedContainer);
            } else {
                uiManager.showError(uiManager.highestRatedContainer, 'Failed to load highest rated anime');
            }
        } catch (error) {
            console.error('Error loading home page:', error);
            uiManager.showError(uiManager.trendingAnimeContainer, 'Failed to load popular anime');
            uiManager.showError(uiManager.popularAnimeContainer, 'Failed to load new releases');
            uiManager.showError(uiManager.highestRatedContainer, 'Failed to load highest rated anime');
        }
    }
    
    /**
     * Render the anime slider
     * @param {Array} animeList - List of anime to display in the slider
     */
    function renderSlider(animeList) {
        if (!animeList || animeList.length === 0) {
            featuredSlider.innerHTML = '<div class="error">No featured anime found</div>';
            return;
        }
        
        // Clear previous content
        featuredSlider.innerHTML = '';
        sliderDots.innerHTML = '';
        
        // Create slides
        animeList.forEach((anime, index) => {
            const slide = document.createElement('div');
            slide.className = 'slider-slide';
            slide.dataset.id = anime.mal_id;
            
            const imageUrl = anime.images.jpg.large_image_url || anime.images.jpg.image_url;
            const title = anime.title || 'Unknown Title';
            const synopsis = anime.synopsis || 'No description available.';
            
            slide.innerHTML = `
                <img src="${imageUrl}" alt="${title}">
                <div class="slider-content">
                    <h2 class="slider-title">${title}</h2>
                    <div class="slider-content-wrapper">
                        <p class="slider-description">${synopsis}</p>
                        <a href="#" class="slider-button" data-id="${anime.mal_id}">Play Now</a>
                    </div>
                </div>
            `;
            
            featuredSlider.appendChild(slide);
            
            // Create dot for this slide
            const dot = document.createElement('div');
            dot.className = 'slider-dot';
            dot.dataset.index = index;
            if (index === 0) dot.classList.add('active');
            sliderDots.appendChild(dot);
            
            // Add click event to the View Details button
            slide.querySelector('.slider-button').addEventListener('click', (e) => {
                e.preventDefault();
                loadAnimeDetails(anime.mal_id);
            });
        });
        
        // Initialize slider position
        goToSlide(0);
    }
    
    /**
     * Navigate the slider (previous or next)
     * @param {string} direction - Direction to navigate ('prev' or 'next')
     */
    function navigateSlider(direction) {
        if (state.featuredAnime.length === 0) return;
        
        if (direction === 'prev') {
            state.sliderIndex = (state.sliderIndex - 1 + state.featuredAnime.length) % state.featuredAnime.length;
        } else {
            state.sliderIndex = (state.sliderIndex + 1) % state.featuredAnime.length;
        }
        
        goToSlide(state.sliderIndex);
    }
    
    /**
     * Go to a specific slide
     * @param {number} index - Slide index
     */
    function goToSlide(index) {
        if (state.featuredAnime.length === 0) return;
        
        state.sliderIndex = index;
        
        // Update slider position
        featuredSlider.style.transform = `translateX(-${index * 100}%)`;
        
        // Update active dot
        const dots = sliderDots.querySelectorAll('.slider-dot');
        dots.forEach((dot, i) => {
            if (i === index) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    /**
     * Load top anime page
     */
    async function loadTopAnimePage() {
        try {
            uiManager.showLoading(uiManager.topAnimeGrid);
            
            // Updated to match the API changes, removing the type parameter
            const response = await animeAPI.getTopAnime(
                'bypopularity', // Using a valid filter value instead
                state.topAnimePage,
                24
            );
            
            uiManager.renderAnimeList(response.data, uiManager.topAnimeGrid);
            
            // Create pagination
            let totalPages = 1;
            if (response.pagination && response.pagination.items && response.pagination.items.total) {
                totalPages = Math.ceil(response.pagination.items.total / response.pagination.items.per_page);
            } else if (response.pagination && response.pagination.last_visible_page) {
                totalPages = response.pagination.last_visible_page;
            }
            
            uiManager.createPagination(
                state.topAnimePage,
                totalPages,
                (page) => {
                    state.topAnimePage = page;
                    loadTopAnimePage();
                },
                uiManager.topPagination
            );
        } catch (error) {
            console.error('Error loading top anime:', error);
            uiManager.showError(uiManager.topAnimeGrid, 'Failed to load top anime');
        }
    }

    /**
     * Load seasonal anime page
     */
    async function loadSeasonalAnimePage() {
        try {
            uiManager.showLoading(uiManager.seasonalAnimeGrid);
            
            const response = await animeAPI.getSeasonalAnime(
                state.currentYear,
                state.currentSeason,
                1,
                24
            );
            
            uiManager.renderAnimeList(response.data, uiManager.seasonalAnimeGrid);
        } catch (error) {
            console.error('Error loading seasonal anime:', error);
            uiManager.showError(uiManager.seasonalAnimeGrid, 'Failed to load seasonal anime');
        }
    }

    /**
     * Load genres page
     */
    async function loadGenresPage() {
        try {
            uiManager.showLoading(uiManager.genresGrid);
            
            const response = await animeAPI.getAnimeGenres();
            uiManager.renderGenres(response.data);
        } catch (error) {
            console.error('Error loading genres:', error);
            uiManager.showError(uiManager.genresGrid, 'Failed to load genres');
        }
    }

    /**
     * Load anime by genre
     * @param {number} genreId - Genre ID
     */
    async function loadAnimeByGenre(genreId) {
        try {
            uiManager.showLoading(uiManager.genreAnimeGrid);
            
            const response = await animeAPI.getAnimeByGenre(genreId, 1, 24);
            uiManager.renderAnimeList(response.data, uiManager.genreAnimeGrid);
            
            // Scroll to anime grid
            uiManager.genreAnimeGrid.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Error loading anime by genre:', error);
            uiManager.showError(uiManager.genreAnimeGrid, 'Failed to load anime for this genre');
        }
    }

    /**
     * Load anime details
     * @param {number} animeId - Anime ID
     */
    async function loadAnimeDetails(animeId) {
        // Navigate directly to the details page instead of showing a modal
        window.location.href = `details.html?id=${animeId}`;
    }

    /**
     * Handle search
     */
    async function handleSearch() {
        const query = searchInput.value.trim();
        
        if (!query) return;
        
        try {
            // Navigate to home page
            navigateToPage('home');
            
            // Show loading
            uiManager.showLoading(uiManager.trendingAnimeContainer);
            uiManager.popularAnimeContainer.innerHTML = '';
            
            // Update section title
            document.querySelector('.trending-section .section-title').textContent = `Search Results: ${query}`;
            
            // Hide popular section
            document.querySelector('.popular-section').style.display = 'none';
            
            // Fetch search results
            const response = await animeAPI.searchAnime(query, 1, 24);
            uiManager.renderAnimeList(response.data, uiManager.trendingAnimeContainer);
        } catch (error) {
            console.error('Error searching anime:', error);
            uiManager.showError(uiManager.trendingAnimeContainer, 'Failed to search anime');
        }
    }

    /**
     * Get current season
     * @returns {string} - Current season (winter, spring, summer, fall)
     */
    function getCurrentSeason() {
        const month = new Date().getMonth();
        
        if (month >= 0 && month <= 2) return 'winter';
        if (month >= 3 && month <= 5) return 'spring';
        if (month >= 6 && month <= 8) return 'summer';
        return 'fall';
    }
});
