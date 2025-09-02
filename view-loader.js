// view-loader.js - Dynamic game loader for view-all.html

// This function will extract games from index.html
async function fetchGamesFromIndex() {
    try {
        // Fetch the index.html content
        const response = await fetch('/index.html');
        if (!response.ok) throw new Error('Failed to fetch index.html');
        
        const html = await response.text();
        
        // Create a DOM parser
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Initialize the game list
        const gamesList = [];
        const processedGameUrls = new Set(); // Track processed games to avoid duplicates
        
        // Define a function to extract category from a game row
        function getCategoryFromRow(row) {
            const categoryHeader = row.querySelector('.category-header h2');
            return categoryHeader ? categoryHeader.textContent.trim().toLowerCase() : null;
        }
        
        // Process game rows in order
        const gameRows = doc.querySelectorAll('.game-row');
        
        gameRows.forEach(row => {
            const categoryText = getCategoryFromRow(row);
            if (!categoryText) return;
            
            // Normalize the category name
            let category;
            if (categoryText.includes('continue playing')) {
                category = 'continue';
            } else if (categoryText.includes('recommended')) {
                category = 'recommended';
            } else if (categoryText.includes('popular')) {
                category = 'popular';
            } else if (categoryText.includes('arcade')) {
                category = 'arcade';
            } else if (categoryText.includes('casual')) {
                category = 'casual';
            } else if (categoryText.includes('shooting')) {
                category = 'shooting';
            } else if (categoryText.includes('driving')) {
                category = 'driving';
            } else if (categoryText.includes('puzzle')) {
                category = 'puzzle';
            } else if (categoryText.includes('action')) {
                category = 'action';
            } else if (categoryText.includes('clicker')) {
                category = 'clicker';
            } else if (categoryText.includes('sports')) {
                category = 'sports';
            } else if (categoryText.includes('io')) {
                category = 'io';
            } else if (categoryText.includes('platform')) {
                category = 'platform';
            } else if (categoryText.includes('battle')) {
                category = 'battle';
            } else if (categoryText.includes('all games')) {
                category = 'all';
            } else {
                // Default category name if none matched
                category = categoryText.split(' ')[0].toLowerCase();
            }
            
            // Get all games in this row - maintain the order
            const gameButtons = row.querySelectorAll('.round-button');
            
            gameButtons.forEach(button => {
                const parent = button.closest('a');
                if (!parent) return;
                
                const url = parent.getAttribute('href');
                if (!url) return;
                
                // Skip duplicates
                if (processedGameUrls.has(url)) return;
                processedGameUrls.add(url);
                
                // Extract game info
                const bg = button.style.backgroundImage || '';
                const image = bg.replace(/url\(['"]?(.*?)['"]?\)/i, '$1').replace(/['"]/g, '');
                
                const nameEl = button.querySelector('.game-name');
                const title = nameEl ? nameEl.textContent.trim() : '';
                
                if (title && url && image) {
                    // Check if game already exists
                    const existingGame = gamesList.find(g => g.url === url);
                    if (existingGame) {
                        // Add the category if not already included
                        if (!existingGame.categories.includes(category)) {
                            existingGame.categories.push(category);
                        }
                    } else {
                        // Add new game
                        gamesList.push({
                            title: title,
                            url: url,
                            image: image,
                            categories: [category]
                        });
                    }
                }
            });
        });
        
        // Load recently played games
        try {
            const storedGames = localStorage.getItem('recentlyPlayed');
            if (storedGames) {
                const recentlyPlayed = JSON.parse(storedGames);
                
                gamesList.forEach(game => {
                    const gameId = game.url.replace('/games/', '');
                    if (recentlyPlayed.includes(gameId) && !game.categories.includes('continue')) {
                        game.categories.push('continue');
                    }
                });
            }
        } catch (e) {
            console.error("Error loading recently played games:", e);
        }
        
        // Save the extracted games list to localStorage for debugging
        localStorage.setItem('extractedGames', JSON.stringify(gamesList));
        
        return gamesList;
        
    } catch (error) {
        console.error("Error fetching games from index:", error);
        return fallbackGamesList(); // Use fallback list if fetch fails
    }
}

// Define a fallback games list in case fetching fails
function fallbackGamesList() {
    // This function returns a basic list of games if fetching fails
    return [
        { title: "1v1 LOL", image: "/img/1v1.avif", url: "/games/1v1", categories: ["shooting", "battle", "popular"] },
        { title: "2048", image: "/img/2048.avif", url: "/games/2048", categories: ["puzzle", "popular"] },
        // Add more games here if needed for fallback
    ];
}

// Function to get games data
async function loadGamesFromIndexPage() {
    // First try to get games from localStorage if already fetched
    try {
        const storedGames = localStorage.getItem('viewAllGames');
        if (storedGames) {
            const games = JSON.parse(storedGames);
            if (games && games.length > 0) {
                console.log("Using cached games list from localStorage");
                return games;
            }
        }
    } catch (e) {
        console.warn("Error loading games from localStorage:", e);
    }
    
    // Fetch from index.html
    const games = await fetchGamesFromIndex();
    
    // Store in localStorage to avoid repeated fetching
    try {
        localStorage.setItem('viewAllGames', JSON.stringify(games));
    } catch (e) {
        console.warn("Error saving games to localStorage:", e);
    }
    
    return games;
}

// Update filter buttons based on available categories
async function updateFilterButtons(gamesData) {
    // Get all unique categories
    const categories = new Set();
    gamesData.forEach(game => {
        if (game.categories) {
            game.categories.forEach(cat => categories.add(cat));
        }
    });
    
    // Get filter options container
    const filterOptions = document.querySelector('.filter-options');
    if (!filterOptions) return;
    
    // Clear existing buttons
    filterOptions.innerHTML = '';
    
    // Add All Games button
    const allButton = document.createElement('button');
    allButton.className = 'filter-button active';
    allButton.dataset.category = 'all';
    allButton.textContent = 'All Games';
    filterOptions.appendChild(allButton);
    
    // Priority categories
    const priorityCategories = ['popular', 'continue', 'recommended'];
    
    // Add priority categories first
    priorityCategories.forEach(cat => {
        if (categories.has(cat)) {
            addCategoryButton(cat, filterOptions);
            categories.delete(cat);
        }
    });
    
    // Add remaining categories alphabetically
    Array.from(categories).sort().forEach(cat => {
        addCategoryButton(cat, filterOptions);
    });
    
    // Set up event listeners
    setupFilterButtons();
}

// Helper function to add a category button
function addCategoryButton(category, container) {
    const button = document.createElement('button');
    button.className = 'filter-button';
    button.dataset.category = category;
    
    // Format the category name
    let displayName;
    switch(category) {
        case 'continue':
            displayName = 'Continue Playing';
            break;
        case 'recommended':
            displayName = 'Recommended';
            break;
        case 'io':
            displayName = 'IO Games';
            break;
        default:
            displayName = category.charAt(0).toUpperCase() + category.slice(1);
    }
    
    button.textContent = displayName;
    container.appendChild(button);
}

// Set up filter button click handlers
function setupFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-button');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Get category and display games
            const category = button.dataset.category;
            displayGames(category);
            
            // Update URL hash without page reload
            history.replaceState(null, '', `${window.location.pathname}${category === 'all' ? '' : '#' + category}`);
        });
    });
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    // Show loader
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'flex';
    
    try {
        // Load games from index.html
        window.gamesList = await loadGamesFromIndexPage();
        console.log(`Loaded ${window.gamesList.length} games`);
        
        // Update filter buttons
        await updateFilterButtons(window.gamesList);
        
        // Check URL hash
        checkUrlHash();
        
        // Listen for hash changes
        window.addEventListener('hashchange', checkUrlHash);
    } catch (error) {
        console.error("Error initializing view-all page:", error);
    } finally {
        // Hide loader with delay for smooth transition
        setTimeout(() => {
            if (loader) loader.style.display = 'none';
        }, 500);
    }
});

// Check URL hash and apply filter
function checkUrlHash() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        const filterButtons = document.querySelectorAll('.filter-button');
        let matchFound = false;
        
        filterButtons.forEach(button => {
            if (button.dataset.category === hash) {
                // Update active button
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Apply filter
                displayGames(hash);
                matchFound = true;
            }
        });
        
        if (!matchFound) {
            displayGames('all');
        }
    } else {
        displayGames('all');
    }
}

// Display games based on filter
function displayGames(filter = 'all') {
    const gamesGrid = document.getElementById('games-grid');
    if (!gamesGrid) return;
    
    // Clear existing games
    gamesGrid.innerHTML = '';
    
    // Update section title and description
    const sectionTitle = document.getElementById('section-title');
    const sectionDescription = document.getElementById('section-description');
    
    if (sectionTitle && sectionDescription) {
        updateSectionInfo(filter, sectionTitle, sectionDescription);
    }
    
    // Filter games
    let filteredGames;
    if (filter === 'all') {
        filteredGames = window.gamesList;
    } else {
        filteredGames = window.gamesList.filter(game => 
            game.categories && game.categories.includes(filter)
        );
    }
    
    // Display message if no games
    if (!filteredGames || filteredGames.length === 0) {
        gamesGrid.innerHTML = '<div style="text-align: center; grid-column: 1/-1; padding: 50px;">No games found in this category</div>';
        return;
    }
    
    // Create game elements
    filteredGames.forEach(game => {
        const gameElement = document.createElement('a');
        gameElement.href = game.url;
        gameElement.className = 'grid-game';
        gameElement.style.backgroundImage = `url(${game.image})`;
        gameElement.onclick = function() {
            trackGame(game.title, game.image, game.url);
        };
        
        const gameName = document.createElement('span');
        gameName.className = 'grid-game-name';
        gameName.textContent = game.title;
        
        gameElement.appendChild(gameName);
        gamesGrid.appendChild(gameElement);
    });
}

// Update section title and description based on category
function updateSectionInfo(category, titleElement, descElement) {
    switch(category) {
        case 'popular':
            titleElement.textContent = "Popular Games";
            descElement.textContent = "Our most played games";
            break;
        case 'continue':
            titleElement.textContent = "Continue Playing";
            descElement.textContent = "Pick up where you left off";
            break;
        case 'recommended':
            titleElement.textContent = "Recommended For You";
            descElement.textContent = "Games we think you'll love";
            break;
        case 'action':
            titleElement.textContent = "Action Games";
            descElement.textContent = "Fast-paced and exciting games";
            break;
        case 'puzzle':
            titleElement.textContent = "Puzzle Games";
            descElement.textContent = "Test your brain with these challenges";
            break;
        case 'sports':
            titleElement.textContent = "Sports Games";
            descElement.textContent = "Competitive sports games to play";
            break;
        case 'arcade':
            titleElement.textContent = "Arcade Games";
            descElement.textContent = "Classic arcade-style games";
            break;
        case 'casual':
            titleElement.textContent = "Casual Games";
            descElement.textContent = "Relaxed and easy-to-play games";
            break;
        case 'shooting':
            titleElement.textContent = "Shooting Games";
            descElement.textContent = "Action-packed shooter games";
            break;
        case 'driving':
            titleElement.textContent = "Driving Games";
            descElement.textContent = "Racing and driving simulations";
            break;
        case 'clicker':
            titleElement.textContent = "Clicker Games";
            descElement.textContent = "Addictive incremental games";
            break;
        case 'io':
            titleElement.textContent = "IO Games";
            descElement.textContent = "Multiplayer web-based games";
            break;
        case 'platform':
            titleElement.textContent = "Platform Games";
            descElement.textContent = "Jump and run through challenging levels";
            break;
        case 'battle':
            titleElement.textContent = "Battle Games";
            descElement.textContent = "Competitive fighting games";
            break;
        default:
            titleElement.textContent = "All Games";
            descElement.textContent = "Browse our complete collection of unblocked games";
    }
}

// Track played games
function trackGame(title, image, url) {
    try {
        // Get game ID from URL
        const gameId = url.replace('/games/', '');
        
        // Get recently played games
        let recentlyPlayed = [];
        try {
            const storedGames = localStorage.getItem('recentlyPlayed');
            if (storedGames) {
                recentlyPlayed = JSON.parse(storedGames);
            }
        } catch (e) {
            console.error("Error parsing recently played games:", e);
        }
        
        // Remove if already in list
        recentlyPlayed = recentlyPlayed.filter(id => id !== gameId);
        
        // Add to beginning of list
        recentlyPlayed.unshift(gameId);
        
        // Keep only 15 most recent
        if (recentlyPlayed.length > 15) {
            recentlyPlayed = recentlyPlayed.slice(0, 15);
        }
        
        // Save back to localStorage
        localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed));
    } catch (e) {
        console.error("Error tracking game:", e);
    }
}

// Search functionality
function filterGames() {
    const searchInput = document.getElementById('gameSearch');
    const searchResults = document.getElementById('searchResults');
    
    if (!searchInput || !searchResults) return;
    
    const query = searchInput.value.toLowerCase();
    
    if (query.length < 2) {
        searchResults.style.display = 'none';
        return;
    }
    
    // Filter games based on search
    const matchingGames = window.gamesList.filter(game => 
        game.title.toLowerCase().includes(query)
    );
    
    // Display search results
    searchResults.innerHTML = '';
    
    if (matchingGames.length > 0) {
        matchingGames.slice(0, 8).forEach(game => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-item';
            resultItem.style.padding = '10px';
            resultItem.style.cursor = 'pointer';
            resultItem.innerHTML = `
                <div class="game-info">${game.title}</div>
            `;
            
            resultItem.addEventListener('click', () => {
                trackGame(game.title, game.image, game.url);
                window.location.href = game.url;
            });
            
            searchResults.appendChild(resultItem);
        });
        
        searchResults.style.display = 'block';
    } else {
        searchResults.style.display = 'none';
    }
}

// Close search results when clicking outside
document.addEventListener('click', function(event) {
    const searchResults = document.getElementById('searchResults');
    const searchInput = document.getElementById('gameSearch');
    
    if (!searchResults || !searchInput) return;
    
    if (event.target !== searchInput && !searchResults.contains(event.target)) {
        searchResults.style.display = 'none';
    }
});
