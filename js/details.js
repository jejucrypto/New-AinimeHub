/**
 * Details page functionality for the anime website
 */
document.addEventListener('DOMContentLoaded', async function() {
    // Get anime ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const animeId = urlParams.get('id');
    let currentEpisodePage = 1;
    const episodesPerPage = 25;
    
    // If no anime ID is provided, redirect to home page
    if (!animeId) {
        window.location.href = 'index.html';
        return;
    }
    
    // DOM Elements
    const videoPlayer = document.getElementById('anime-video');
    const videoPlaceholder = document.querySelector('.video-placeholder');
    const prevEpisodeBtn = document.getElementById('prev-episode');
    const nextEpisodeBtn = document.getElementById('next-episode');
    const currentEpisodeEl = document.getElementById('current-episode');
    const episodeTitleEl = document.getElementById('episode-title');
    const episodesGrid = document.getElementById('episodes-grid');
    const episodesPagination = document.getElementById('episodes-pagination');
    const animeDetailsContainer = document.getElementById('anime-details-container');
    
    // State
    let currentAnime = null;
    let episodes = [];
    let currentEpisodeIndex = 0;
    
    // Show loading indicators
    if (animeDetailsContainer) {
        animeDetailsContainer.innerHTML = '<div class="loading">Loading anime details...</div>';
    }
    
    if (episodesGrid) {
        episodesGrid.innerHTML = '<div class="loading">Loading episodes...</div>';
    }
    
    // Setup episode pagination
    if (episodesPagination) {
        episodesPagination.addEventListener('click', function(e) {
            if (e.target.classList.contains('pagination-button')) {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                if (page && page !== currentEpisodePage) {
                    currentEpisodePage = page;
                    renderEpisodesGrid(episodes, currentEpisodePage);
                }
            }
        });
    }
    
    try {
        // Show loading indicators for all sections
        const loadingSections = [
            'anime-details-container', 'episodes-grid', 'characters-grid',
            'staff-grid', 'reviews-container', 'recommendations-grid'
        ];
        
        loadingSections.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = '<div class="loading">Loading...</div>';
            }
        });
        
        // Fetch anime details
        const animeResponse = await animeAPI.getAnimeById(animeId);
        currentAnime = animeResponse.data;
        
        console.log('Anime data:', currentAnime);
        
        if (!currentAnime) {
            showError('Anime not found');
            return;
        }
        
        // Render anime details
        renderAnimeDetails(currentAnime);
        
        // Fetch episodes
        const episodesResponse = await animeAPI.getAnimeEpisodes(animeId);
        episodes = episodesResponse.data || [];
        
        console.log('Episodes data:', episodes);
        
        // Render episodes grid
        if (episodes && episodes.length > 0) {
            renderEpisodesGrid(episodes, currentEpisodePage);
            setCurrentEpisode(episodes, 0);
            
            // Load the first episode video
            if (episodes[0]) {
                loadEpisodeVideo(currentAnime.title, episodes[0].mal_id || 1);
            }
        } else {
            if (episodesGrid) {
                episodesGrid.innerHTML = '<div class="no-episodes">No episodes available</div>';
            }
            disableVideoControls();
        }
        
        // Fetch and render characters
        fetchAndRenderCharacters(animeId);
        
        // Fetch and render reviews
        fetchAndRenderReviews(animeId);
        
        // Fetch and render recommendations
        fetchAndRenderRecommendations(animeId);
        
        // Fetch highest rated anime for the sidebar
        const highestRatedAnime = await animeAPI.fetchHighestRatedAnime(20);
        const highestRatedContainer = document.getElementById('highest-rated');
        if (highestRatedContainer) {
            renderAnimeGrid(highestRatedAnime, highestRatedContainer);
        }
        
    } catch (error) {
        console.error('Error loading anime details:', error);
        showError('Failed to load anime details. Please try again later.');
    }
    
    /**
     * Show error message
     * @param {string} message - Error message
     */
    function showError(message) {
        if (animeDetailsContainer) {
            animeDetailsContainer.innerHTML = `<div class="error">${message}</div>`;
        }
        if (episodesGrid) {
            episodesGrid.innerHTML = '';
        }
        disableVideoControls();
    }
    
    /**
     * Fetch and render characters
     * @param {number} animeId - Anime ID
     */
    async function fetchAndRenderCharacters(animeId) {
        const charactersGrid = document.getElementById('characters-grid');
        if (!charactersGrid) return;
        
        try {
            const response = await animeAPI.getAnimeCharacters(animeId);
            const characters = response || [];
            
            console.log('Characters data:', characters);
            
            if (!characters || characters.length === 0) {
                charactersGrid.innerHTML = '<div class="no-data">No character information available</div>';
                return;
            }
            
            // Render characters
            charactersGrid.innerHTML = '';
            
            // Create a container for the character cards
            const characterCardsContainer = document.createElement('div');
            characterCardsContainer.className = 'character-cards';
            
            // Display all characters, but limit to 20 for better performance
            // Sort by role importance: Main characters first, then Supporting, then others
            const sortedCharacters = [
                ...characters.filter(char => char.role === 'Main'),
                ...characters.filter(char => char.role === 'Supporting'),
                ...characters.filter(char => char.role !== 'Main' && char.role !== 'Supporting')
            ];
            
            // Take the first 20 characters
            const displayCharacters = sortedCharacters.slice(0, 20);
            
            displayCharacters.forEach(character => {
                const characterCard = document.createElement('div');
                characterCard.className = 'character-card';
                
                const characterImage = character.character.images?.jpg?.image_url || 'https://placehold.co/200x300.png?text=No+Image';
                const characterName = character.character.name || 'Unknown';
                const characterRole = character.role || 'Unknown';
                
                characterCard.innerHTML = `
                    <div class="character-image">
                        <img src="${characterImage}" alt="${characterName}">
                    </div>
                    <div class="character-info">
                        <h3 class="character-name">${characterName}</h3>
                        <p class="character-role">${characterRole}</p>
                    </div>
                `;
                
                characterCardsContainer.appendChild(characterCard);
            });
            
            charactersGrid.appendChild(characterCardsContainer);
            
        } catch (error) {
            console.error('Error fetching characters:', error);
            charactersGrid.innerHTML = '<div class="error">Failed to load characters. Please try again later.</div>';
        }
    }
    
    /**
     * Fetch and render staff
     * @param {number} animeId - Anime ID
     */
    async function fetchAndRenderStaff(animeId) {
        const staffGrid = document.getElementById('staff-grid');
        if (!staffGrid) return;
        
        try {
            const response = await animeAPI.getAnimeStaff(animeId);
            const staff = response || [];
            
            console.log('Staff data:', staff);
            
            if (!staff || staff.length === 0) {
                staffGrid.innerHTML = '<div class="no-data">No staff information available</div>';
                return;
            }
            
            // Render staff
            staffGrid.innerHTML = '';
            
            // Create a container for the staff cards
            const staffCardsContainer = document.createElement('div');
            staffCardsContainer.className = 'staff-cards';
            
            staff.forEach(staffMember => {
                const staffCard = document.createElement('div');
                staffCard.className = 'staff-card';
                
                const staffImage = staffMember.person.images?.jpg?.image_url || 'https://placehold.co/200x300.png?text=No+Image';
                const staffName = staffMember.person.name || 'Unknown';
                const staffPosition = staffMember.positions?.join(', ') || 'Unknown';
                
                staffCard.innerHTML = `
                    <div class="staff-image">
                        <img src="${staffImage}" alt="${staffName}">
                    </div>
                    <div class="staff-info">
                        <h3 class="staff-name">${staffName}</h3>
                        <p class="staff-position">${staffPosition}</p>
                    </div>
                `;
                
                staffCardsContainer.appendChild(staffCard);
            });
            
            staffGrid.appendChild(staffCardsContainer);
            
        } catch (error) {
            console.error('Error fetching staff:', error);
            staffGrid.innerHTML = '<div class="error">Failed to load staff. Please try again later.</div>';
        }
    }
    
    /**
     * Fetch and render reviews
     * @param {number} animeId - Anime ID
     */
    async function fetchAndRenderReviews(animeId) {
        const reviewsContainer = document.getElementById('reviews-container');
        if (!reviewsContainer) return;
        
        try {
            const response = await animeAPI.getAnimeReviews(animeId);
            const reviews = response || [];
            
            console.log('Reviews data:', reviews);
            
            if (!reviews || reviews.length === 0) {
                reviewsContainer.innerHTML = '<div class="no-data">No reviews available</div>';
                return;
            }
            
            // Render reviews
            reviewsContainer.innerHTML = '';
            
            // Create a container for the reviews
            const reviewsListContainer = document.createElement('div');
            reviewsListContainer.className = 'reviews-list';
            
            // Limit to 5 reviews for better performance
            const limitedReviews = reviews.slice(0, 5);
            
            limitedReviews.forEach(review => {
                const reviewCard = document.createElement('div');
                reviewCard.className = 'review-card';
                reviewCard.dataset.reviewId = review.mal_id || Math.random().toString(36).substring(2, 9);
                
                const userImage = review.user?.images?.jpg?.image_url || 'https://placehold.co/50x50.png?text=User';
                const userName = review.user?.username || 'Anonymous';
                const reviewDate = new Date(review.date).toLocaleDateString() || 'Unknown date';
                const reviewScore = review.score || 'N/A';
                
                // Store the full review text
                const fullReviewText = review.review || 'No review text';
                
                // Truncate review text if it's too long
                let displayReviewText = fullReviewText;
                let showReadMore = false;
                
                if (fullReviewText.length > 300) {
                    displayReviewText = fullReviewText.substring(0, 300) + '...';
                    showReadMore = true;
                }
                
                reviewCard.innerHTML = `
                    <div class="review-header">
                        <div class="reviewer-info">
                            <img src="${userImage}" alt="${userName}" class="reviewer-avatar">
                            <div>
                                <h3 class="reviewer-name">${userName}</h3>
                                <p class="review-date">${reviewDate}</p>
                            </div>
                        </div>
                        <div class="review-score">${reviewScore}/10</div>
                    </div>
                    <div class="review-content" data-full-text="${encodeURIComponent(fullReviewText)}" data-short-text="${encodeURIComponent(displayReviewText)}">
                        ${displayReviewText}
                        ${showReadMore ? '<span class="read-more">Read more</span>' : ''}
                    </div>
                `;
                
                reviewsListContainer.appendChild(reviewCard);
            });
            
            reviewsContainer.appendChild(reviewsListContainer);
            
            // Add event listeners for 'Read more' buttons
            document.querySelectorAll('.read-more').forEach(button => {
                button.addEventListener('click', function() {
                    const contentDiv = this.parentElement;
                    const fullText = decodeURIComponent(contentDiv.dataset.fullText);
                    contentDiv.innerHTML = fullText + '<span class="hide-review">Hide</span>';
                    
                    // Add event listener for the hide button
                    const hideButton = contentDiv.querySelector('.hide-review');
                    if (hideButton) {
                        hideButton.addEventListener('click', function() {
                            const shortText = decodeURIComponent(contentDiv.dataset.shortText);
                            contentDiv.innerHTML = shortText + '<span class="read-more">Read more</span>';
                            
                            // Re-add event listener to the new read more button
                            const newReadMoreButton = contentDiv.querySelector('.read-more');
                            if (newReadMoreButton) {
                                newReadMoreButton.addEventListener('click', function() {
                                    const fullText = decodeURIComponent(contentDiv.dataset.fullText);
                                    contentDiv.innerHTML = fullText + '<span class="hide-review">Hide</span>';
                                    
                                    // Re-add event listener to the new hide button
                                    const newHideButton = contentDiv.querySelector('.hide-review');
                                    if (newHideButton) {
                                        newHideButton.addEventListener('click', arguments.callee);
                                    }
                                });
                            }
                        });
                    }
                });
            });
            
        } catch (error) {
            console.error('Error fetching reviews:', error);
            reviewsContainer.innerHTML = '<div class="error">Failed to load reviews. Please try again later.</div>';
        }
    }
    
    /**
     * Fetch and render recommendations
     * @param {number} animeId - Anime ID
     */
    async function fetchAndRenderRecommendations(animeId) {
        const recommendationsGrid = document.getElementById('recommendations-grid');
        if (!recommendationsGrid) return;
        
        try {
            const response = await animeAPI.getAnimeRecommendations(animeId);
            const recommendations = response || [];
            
            console.log('Recommendations data:', recommendations);
            
            if (!recommendations || recommendations.length === 0) {
                recommendationsGrid.innerHTML = '<div class="no-data">No recommendations available</div>';
                return;
            }
            
            // Render recommendations
            recommendationsGrid.innerHTML = '';
            
            // Create a container for the recommendation cards
            const recommendationsContainer = document.createElement('div');
            recommendationsContainer.className = 'anime-grid';
            
            // Limit to 10 recommendations for better display
            const limitedRecommendations = recommendations.slice(0, 10);
            
            limitedRecommendations.forEach(recommendation => {
                const anime = recommendation.entry;
                if (!anime) return;
                
                const animeCard = createAnimeCard(anime);
                recommendationsContainer.appendChild(animeCard);
            });
            
            recommendationsGrid.appendChild(recommendationsContainer);
            
        } catch (error) {
            console.error('Error fetching recommendations:', error);
            recommendationsGrid.innerHTML = '<div class="error">Failed to load recommendations. Please try again later.</div>';
        }
    }
    
    /**
     * Render anime details
     * @param {Object} anime - Anime data
     */
    function renderAnimeDetails(anime) {
        // Format anime data
        const title = anime.title;
        const titleJapanese = anime.title_japanese || '';
        const synopsis = anime.synopsis || 'No synopsis available';
        const type = anime.type || 'Unknown';
        const status = anime.status || 'Unknown';
        const episodes = anime.episodes || 'Unknown';
        const duration = anime.duration || 'Unknown';
        const rating = anime.rating || 'Unknown';
        const score = anime.score || 0;
        const scoredBy = anime.scored_by || 0;
        const rank = anime.rank || 'N/A';
        const popularity = anime.popularity || 'N/A';
        const genres = anime.genres || [];
        const studios = anime.studios || [];
        const aired = anime.aired?.string || 'Unknown';
        const season = anime.season ? `${anime.season.charAt(0).toUpperCase() + anime.season.slice(1)} ${anime.year}` : 'Unknown';
        
        // Create stars based on score (max 5 stars)
        const fullStars = Math.floor(score / 2);
        const halfStar = score % 2 >= 0.5;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
        
        let starsHTML = '';
        for (let i = 0; i < fullStars; i++) {
            starsHTML += '<i class="fas fa-star"></i>';
        }
        if (halfStar) {
            starsHTML += '<i class="fas fa-star-half-alt"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += '<i class="far fa-star"></i>';
        }
        
        // Create genres HTML
        const genresHTML = genres.map(genre => `
            <span class="genre-tag">${genre.name}</span>
        `).join('');
        
        // Create studios HTML
        const studiosHTML = studios.map(studio => studio.name).join(', ');
        
        // Render anime details
        animeDetailsContainer.innerHTML = `
            <div class="anime-details-header">
                <div class="anime-poster">
                    <img src="${anime.images?.jpg?.large_image_url || 'https://placehold.co/placeholder.jpg'}" alt="${title}">
                </div>
                <div class="anime-info">
                    <h1 class="anime-title">${title}</h1>
                    ${titleJapanese ? `<h2 class="anime-title-japanese">${titleJapanese}</h2>` : ''}
                    
                    <div class="anime-meta">
                        <div class="meta-item">
                            <i class="fas fa-tv"></i>
                            <span>${type}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-info-circle"></i>
                            <span>${status}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-film"></i>
                            <span>${episodes} episodes</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-clock"></i>
                            <span>${duration}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${aired}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-sun"></i>
                            <span>${season}</span>
                        </div>
                    </div>
                    
                    <div class="anime-rating">
                        <div class="rating-stars">
                            ${starsHTML}
                        </div>
                        <div class="rating-value">${score} / 10</div>
                        <div class="rating-count">(${scoredBy.toLocaleString()} votes)</div>
                    </div>
                    
                    <div class="anime-stats">
                        <div class="stat-item">
                            <span class="stat-label">Rank:</span>
                            <span class="stat-value">#${rank}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Popularity:</span>
                            <span class="stat-value">#${popularity}</span>
                        </div>
                    </div>
                    
                    <div class="anime-genres">
                        ${genresHTML}
                    </div>
                    
                    <div class="anime-studios">
                        <span class="studios-label">Studios:</span>
                        <span class="studios-value">${studiosHTML || 'Unknown'}</span>
                    </div>
                </div>
            </div>
            
            <div class="anime-synopsis">
                <h3>Synopsis</h3>
                <p>${synopsis}</p>
            </div>
        `;
    }
    
    /**
                                        <div class="recommendation-title">${rec.entry?.title || 'Unknown'}</div>
                                        <div class="recommendation-meta">
                                            <span>${rec.entry?.type || 'Unknown'}</span>
                                            <span>${rec.votes || 0} votes</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('');
                            
                            // Add click event to recommendation cards
                            document.querySelectorAll('.recommendation-card').forEach(card => {
                                card.addEventListener('click', () => {
                                    const id = card.getAttribute('data-id');
                                    window.location.href = `details.html?id=${id}`;
                                });
                            });
                        } else {
                            recommendationsGrid.innerHTML = '<div class="no-data">No recommendations available</div>';
                        }
                    }
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${tabId} tab:`, error);
            const tabPane = document.querySelector(`#${tabId}-tab`);
            if (tabPane) {
                tabPane.innerHTML = `<div class="error">Failed to load ${tabId}. Please try again later.</div>`;
            }
        }
    }
    
    /**
     * Render episodes grid
     * @param {Array} episodesArray - Array of episodes
     * @param {number} page - Page number to render
     */
    function renderEpisodesGrid(episodesArray, page = 1) {
        console.log('Rendering episodes grid for page:', page);
        console.log('Episodes array:', episodesArray);
        
        if (!episodesGrid) {
            console.error('Episodes grid element not found');
            return;
        }
        
        // Update current episode page
        currentEpisodePage = page;
        
        // Calculate total pages
        const totalPages = Math.ceil(episodesArray.length / episodesPerPage);
        console.log('Total pages:', totalPages);
        
        // Render pagination
        renderPagination(totalPages, page);
        
        // Get episodes for current page
        const startIndex = (page - 1) * episodesPerPage;
        const endIndex = Math.min(startIndex + episodesPerPage, episodesArray.length);
        const currentPageEpisodes = episodesArray.slice(startIndex, endIndex);
        console.log('Current page episodes:', currentPageEpisodes);
        
        // Render episodes
        episodesGrid.innerHTML = '';
        
        if (currentPageEpisodes.length === 0) {
            console.warn('No episodes available for this page');
            episodesGrid.innerHTML = '<div class="no-episodes">No episodes available</div>';
            return;
        }
        
        currentPageEpisodes.forEach((episode, index) => {
            const episodeIndex = startIndex + index;
            const card = document.createElement('div');
            card.className = 'episode-card';
            if (episodeIndex === currentEpisodeIndex) {
                card.classList.add('active');
            }
            card.setAttribute('data-index', episodeIndex);
            
            // Handle potential missing data in the API response
            const episodeNumber = episode.mal_id || (episodeIndex + 1);
            
            // Simplified episode card with only the episode number
            card.innerHTML = `
                <div class="episode-number">EP ${episodeNumber}</div>
            `;
            
            // Add click event to set current episode
            card.addEventListener('click', () => {
                setCurrentEpisode(episodesArray, episodeIndex);
            });
            
            episodesGrid.appendChild(card);
        });
        
        // Episode cards already have click events attached when created
    }
    
    /**
     * Render pagination
     * @param {number} totalPages - Total number of pages
     * @param {number} currentPage - Current page number
     */
    function renderPagination(totalPages, currentPage) {
        if (!episodesPagination) return;
        
        if (totalPages <= 1) {
            episodesPagination.innerHTML = '';
            return;
        }
        
        // Calculate pagination range
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        // Create pagination HTML
        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <button class="pagination-button prev-page" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        // First page
        if (startPage > 1) {
            paginationHTML += `
                <button class="pagination-button" data-page="1">1</button>
            `;
            
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }
        
        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-button ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>
            `;
        }
        
        // Last page
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
            
            paginationHTML += `
                <button class="pagination-button" data-page="${totalPages}">${totalPages}</button>
            `;
        }
        
        // Next button
        paginationHTML += `
            <button class="pagination-button next-page" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        // Set pagination HTML
        episodesPagination.innerHTML = paginationHTML;
    }
    
    // Scroll to episodes section function
    function scrollToEpisodes() {
        const episodesSection = document.querySelector('.episodes-section');
        if (episodesSection) {
            episodesSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    /**
     * Set current episode
     * @param {Array} episodesArray - Array of episodes
     * @param {number} index - Episode index
     */
    function setCurrentEpisode(episodesArray, index) {
        if (!episodesArray || episodesArray.length === 0) return;
        
        // Validate index
        if (index < 0) {
            index = 0;
        } else if (index >= episodesArray.length) {
            index = episodesArray.length - 1;
        }
        
        currentEpisodeIndex = index;
        const episode = episodesArray[index];
        
        // Update episode cards
        const episodeCards = document.querySelectorAll('.episode-card');
        episodeCards.forEach(card => {
            card.classList.toggle('active', parseInt(card.getAttribute('data-index')) === index);
        });
        
        // Update current episode text
        if (currentEpisodeEl) {
            currentEpisodeEl.textContent = `Episode ${episode.mal_id || (index + 1)}`;
        }
        
        // Update episode title
        if (episodeTitleEl) {
            episodeTitleEl.textContent = episode.title || `Episode ${episode.mal_id || (index + 1)}`;
        }
        
        // Update navigation buttons
        if (prevEpisodeBtn) {
            prevEpisodeBtn.disabled = index === 0;
        }
        
        if (nextEpisodeBtn) {
            nextEpisodeBtn.disabled = index === episodesArray.length - 1;
        }
        
        // Load episode video
        if (currentAnime && episode) {
            loadEpisodeVideo(currentAnime.title, episode.mal_id || (index + 1));
        }
        
        // Check if current episode is on current page
        const episodePageIndex = Math.floor(index / episodesPerPage) + 1;
        if (episodePageIndex !== currentEpisodePage) {
            renderEpisodesGrid(episodesArray, episodePageIndex);
            scrollToEpisodes();
        }
    }
    
    /**
     * Load episode video from the server
     * @param {string} animeTitle - Anime title
     * @param {number} episodeNumber - Episode number
     */
    async function loadEpisodeVideo(animeTitle, episodeNumber) {
        try {
            // Show loading state
            if (videoPlaceholder) {
                videoPlaceholder.style.display = 'flex';
                videoPlaceholder.innerHTML = '<div class="loading">Loading video...</div>';
            }
            
            // Request stream URL from server
            const response = await fetch('https://new-ainimehub-production.up.railway.app/api/get-stream-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    animeTitle: animeTitle,
                    episodeNumber: episodeNumber
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to get stream URL');
            }
            
            if (!data.embedUrl) {
                throw new Error('No embed URL returned from server');
            }
            
            console.log('Stream URL received:', data.embedUrl);
            
            // Replace video placeholder with iframe with sandbox to block popups/ads
            if (videoPlayer) {
                const videoContainer = document.getElementById('video-player');
                videoContainer.innerHTML = `
                    <iframe 
                        src="${data.embedUrl}"
                        frameborder="0"
                        allowfullscreen
                        class="video-iframe"
                        sandbox="allow-scripts allow-same-origin"
                        style="width:100%;height:100%;"
                    ></iframe>
                `;
            }
            
            // Update episode list selection
            updateEpisodeSelection();
        } catch (error) {
            console.error('Error loading video:', error);
            if (videoPlaceholder) {
                videoPlaceholder.style.display = 'flex';
                videoPlaceholder.innerHTML = `
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error loading video: ${error.message}</p>
                `;
            }
        }
    }
    
    /**
     * Disable video controls
     */
    function disableVideoControls() {
        prevEpisodeBtn.disabled = true;
        nextEpisodeBtn.disabled = true;
        currentEpisodeEl.textContent = 'No Episodes';
        episodeTitleEl.textContent = '';
        videoPlaceholder.querySelector('p').textContent = 'No Episodes Available';
    }
    
    /**
     * Show error message
     * @param {string} message - Error message
     */
    function showError(message) {
        animeDetailsContainer.innerHTML = `<div class="error">${message}</div>`;
        episodesGrid.innerHTML = '';
        disableVideoControls();
    }
    
    // Event listeners for episode navigation
    if (prevEpisodeBtn) {
        prevEpisodeBtn.addEventListener('click', () => {
            setCurrentEpisode(episodes, currentEpisodeIndex - 1);
        });
    }
    
    if (nextEpisodeBtn) {
        nextEpisodeBtn.addEventListener('click', () => {
            setCurrentEpisode(episodes, currentEpisodeIndex + 1);
        });
    }
    
    // Video player click to play
    videoPlaceholder.addEventListener('click', () => {
        // In a real implementation, you would start playing the video
        // For this example, we'll just hide the placeholder
        videoPlaceholder.style.display = 'none';
    });
});

/**
 * Render anime grid for the highest rated section
 * @param {Array} animeList - List of anime
 * @param {HTMLElement} container - Container element
 */
function renderAnimeGrid(animeList, container) {
    container.innerHTML = '';

    if (!animeList || animeList.length === 0) {
        container.innerHTML = '<div class="no-results">No anime found</div>';
        return;
    }

    animeList.forEach(anime => {
        const card = createAnimeCard(anime);
        
        // Add click event to navigate to details page
        card.addEventListener('click', () => {
            window.location.href = `details.html?id=${anime.mal_id}`;
        });
        
        container.appendChild(card);
    });
}

/**
 * Create anime card element
 * @param {Object} anime - Anime data
 * @returns {HTMLElement} - Anime card element
 */
function createAnimeCard(anime) {
    const card = document.createElement('div');
    card.className = 'anime-card';
    card.dataset.id = anime.mal_id;

    const imageUrl = anime.images?.jpg?.image_url || 'https://placehold.co/placeholder.jpg';
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
    
    // Add click event to navigate to details page
    card.addEventListener('click', () => {
        if (anime.mal_id) {
            window.location.href = `details.html?id=${anime.mal_id}`;
        }
    });

    return card;
}
