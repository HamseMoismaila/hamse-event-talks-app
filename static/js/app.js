// Global state management
let allUpdates = [];
let selectedUpdateId = null;

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const skeletonLoader = document.getElementById('skeleton-loader');
const emptyState = document.getElementById('empty-state');
const feedGrid = document.getElementById('feed-grid');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const errorContainer = document.getElementById('error-container');
const errorText = document.getElementById('error-text');
const retryBtn = document.getElementById('retry-btn');
const cacheTimeIndicator = document.getElementById('cache-time-indicator');
const resetFiltersBtn = document.getElementById('reset-filters-btn');

// Stats Elements
const valTotal = document.getElementById('val-total');
const valFeatures = document.getElementById('val-features');
const valAnnouncements = document.getElementById('val-announcements');
const valDeprecations = document.getElementById('val-deprecations');

// Filter Badges
const badgeAll = document.getElementById('badge-all');
const badgeFeatures = document.getElementById('badge-features');
const badgeAnnouncements = document.getElementById('badge-announcements');
const badgeDeprecations = document.getElementById('badge-deprecations');
const badgeOthers = document.getElementById('badge-others');

// Drawer Elements
const tweetDrawer = document.getElementById('tweet-drawer');
const closeDrawerBtn = document.getElementById('close-drawer-btn');
const previewChip = document.getElementById('preview-chip');
const previewDate = document.getElementById('preview-date');
const previewText = document.getElementById('preview-text');
const tweetTextArea = document.getElementById('tweet-text');
const tweetCharCounter = document.getElementById('tweet-char-counter');
const tweetWarning = document.getElementById('tweet-warning');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const postTweetBtn = document.getElementById('post-tweet-btn');

// Active filter category
let activeFilter = 'all';

// Initialize Lucide Icons
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    loadReleaseNotes(false);
    setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
    refreshBtn.addEventListener('click', () => loadReleaseNotes(true));
    retryBtn.addEventListener('click', () => loadReleaseNotes(true));
    
    // Search input handler
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearSearchBtn.style.display = query ? 'flex' : 'none';
        renderFeed();
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        renderFeed();
        searchInput.focus();
    });
    
    // Filter chips click handler
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            const clickedChip = e.currentTarget;
            clickedChip.classList.add('active');
            activeFilter = clickedChip.getAttribute('data-filter');
            renderFeed();
        });
    });
    
    // Reset Filters empty state
    resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Tweet Drawer interaction
    closeDrawerBtn.addEventListener('click', deselectUpdate);
    
    // Tweet text counter
    tweetTextArea.addEventListener('input', updateCharCounter);
    
    // Copy Tweet button
    copyTweetBtn.addEventListener('click', copyTweetText);
    
    // Post Tweet button
    postTweetBtn.addEventListener('click', postTweet);
}

// Fetch Release Notes
async function loadReleaseNotes(forceRefresh = false) {
    // Set loading state
    setLoadingState(true);
    errorContainer.style.display = 'none';
    
    try {
        const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}`);
        }
        
        const result = await response.json();
        allUpdates = result.updates || [];
        
        // Update stats dashboard
        calculateStats(allUpdates);
        
        // Format last updated time
        const updateDate = new Date(result.last_updated * 1000);
        cacheTimeIndicator.textContent = `Feed source: ${result.source === 'cache' ? 'Cache' : 'Live Net'} (Updated ${updateDate.toLocaleTimeString()})`;
        
        // Render updates
        renderFeed();
        
    } catch (error) {
        console.error('Failed to load release notes:', error);
        errorText.textContent = error.message || 'Unable to load BigQuery release notes. Please check your network connection or try again later.';
        errorContainer.style.display = 'flex';
        feedGrid.innerHTML = '';
    } finally {
        setLoadingState(false);
    }
}

// UI Loading Toggle
function setLoadingState(isLoading) {
    if (isLoading) {
        refreshBtn.disabled = true;
        refreshIcon.classList.add('spinning');
        skeletonLoader.style.display = 'block';
        feedGrid.style.display = 'none';
        emptyState.style.display = 'none';
    } else {
        refreshBtn.disabled = false;
        refreshIcon.classList.remove('spinning');
        skeletonLoader.style.display = 'none';
        feedGrid.style.display = 'grid';
    }
}

// Reset filters and search
function resetFilters() {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    activeFilter = 'all';
    document.querySelectorAll('.filter-chip').forEach(chip => {
        if (chip.getAttribute('data-filter') === 'all') {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });
    renderFeed();
}

// Calculate Feed Statistics
function calculateStats(updates) {
    let totals = {
        all: updates.length,
        feature: 0,
        announcement: 0,
        deprecation: 0,
        other: 0
    };
    
    updates.forEach(u => {
        const type = u.type.toLowerCase();
        if (type.includes('feature')) {
            totals.feature++;
        } else if (type.includes('announc')) {
            totals.announcement++;
        } else if (type.includes('deprecat')) {
            totals.deprecation++;
        } else {
            totals.other++;
        }
    });
    
    // Update value UI
    valTotal.textContent = totals.all;
    valFeatures.textContent = totals.feature;
    valAnnouncements.textContent = totals.announcement;
    valDeprecations.textContent = totals.deprecation;
    
    // Update badges
    badgeAll.textContent = totals.all;
    badgeFeatures.textContent = totals.feature;
    badgeAnnouncements.textContent = totals.announcement;
    badgeDeprecations.textContent = totals.deprecation;
    badgeOthers.textContent = totals.other;
}

// Render Feed items to HTML
function renderFeed() {
    feedGrid.innerHTML = '';
    const query = searchInput.value.toLowerCase();
    
    // Filter updates
    const filtered = allUpdates.filter(u => {
        // Filter by Type
        const type = u.type.toLowerCase();
        let matchesType = false;
        
        if (activeFilter === 'all') {
            matchesType = true;
        } else if (activeFilter === 'feature' && type.includes('feature')) {
            matchesType = true;
        } else if (activeFilter === 'announcement' && type.includes('announc')) {
            matchesType = true;
        } else if (activeFilter === 'deprecation' && type.includes('deprecat')) {
            matchesType = true;
        } else if (activeFilter === 'other' && !type.includes('feature') && !type.includes('announc') && !type.includes('deprecat')) {
            matchesType = true;
        }
        
        // Filter by Search Query
        let matchesSearch = true;
        if (query) {
            matchesSearch = u.type.toLowerCase().includes(query) || 
                            u.date.toLowerCase().includes(query) || 
                            u.content_text.toLowerCase().includes(query);
        }
        
        return matchesType && matchesSearch;
    });
    
    // Empty state trigger
    if (filtered.length === 0) {
        emptyState.style.display = 'flex';
        feedGrid.style.display = 'none';
        return;
    }
    
    emptyState.style.display = 'none';
    feedGrid.style.display = 'grid';
    
    filtered.forEach(item => {
        const card = document.createElement('article');
        card.className = `update-card glass ${selectedUpdateId === item.id ? 'selected' : ''}`;
        card.setAttribute('data-id', item.id);
        
        // Match category for chips style
        let chipClass = 'other';
        const typeLower = item.type.toLowerCase();
        if (typeLower.includes('feature')) chipClass = 'feature';
        else if (typeLower.includes('announc')) chipClass = 'announcement';
        else if (typeLower.includes('deprecat')) chipClass = 'deprecation';
        
        // Add target="_blank" rel="noopener noreferrer" to links
        let processedHtml = item.content_html.replace(/<a\s+/g, '<a target="_blank" rel="noopener noreferrer" ');
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-meta">
                    <span class="type-chip ${chipClass}">${item.type}</span>
                    <span class="date-text"><i data-lucide="calendar"></i> ${item.date}</span>
                </div>
                <div class="select-container">
                    <span class="tweet-select-label">Select to Tweet</span>
                    <div class="tweet-checkbox">
                        <i data-lucide="check"></i>
                    </div>
                </div>
            </div>
            <div class="card-body">
                ${processedHtml}
            </div>
            <div class="card-footer">
                <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="source-link">
                    <span>View in original docs</span>
                    <i data-lucide="external-link"></i>
                </a>
                <button class="card-action-btn" title="Tweet this update">
                    <i data-lucide="twitter"></i>
                    <span>Tweet</span>
                </button>
            </div>
        `;
        
        // Add Card interactions
        // Click to select
        card.addEventListener('click', (e) => {
            // Prevent select if user clicked a link
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                return;
            }
            
            // Prevent double click trigger if action button is clicked
            if (e.target.closest('.card-action-btn')) {
                return;
            }
            
            toggleUpdateSelection(item);
        });
        
        // Directly tweet button click
        const tweetBtn = card.querySelector('.card-action-btn');
        tweetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectUpdate(item);
        });
        
        feedGrid.appendChild(card);
    });
    
    // Re-create icons for new elements
    lucide.createIcons();
}

// Toggle update selected state
function toggleUpdateSelection(item) {
    if (selectedUpdateId === item.id) {
        deselectUpdate();
    } else {
        selectUpdate(item);
    }
}

// Select update details and populate tweet drawer
function selectUpdate(item) {
    selectedUpdateId = item.id;
    
    // Highlight Card
    document.querySelectorAll('.update-card').forEach(card => {
        if (card.getAttribute('data-id') === item.id) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
    
    // Populate Tweet Drawer details
    let typeClass = 'other';
    const typeLower = item.type.toLowerCase();
    if (typeLower.includes('feature')) typeClass = 'feature';
    else if (typeLower.includes('announc')) typeClass = 'announcement';
    else if (typeLower.includes('deprecat')) typeClass = 'deprecation';
    
    previewChip.className = `type-chip ${typeClass}`;
    previewChip.textContent = item.type;
    previewDate.innerHTML = `<i data-lucide="calendar"></i> ${item.date}`;
    previewText.textContent = item.content_text;
    
    // Generate Tweet text draft
    generateTweetDraft(item);
    
    // Open drawer
    tweetDrawer.classList.add('open');
    
    // Refresh lucide icons in drawer
    lucide.createIcons();
}

// Deselect update and close drawer
function deselectUpdate() {
    selectedUpdateId = null;
    document.querySelectorAll('.update-card').forEach(card => card.classList.remove('selected'));
    tweetDrawer.classList.remove('open');
}

// Generate the initial tweet draft text
function generateTweetDraft(item) {
    let emoji = '💡';
    const typeLower = item.type.toLowerCase();
    if (typeLower.includes('feature')) emoji = '🚀';
    else if (typeLower.includes('announc')) emoji = '📢';
    else if (typeLower.includes('deprecat')) emoji = '⚠️';
    
    const prefix = `${emoji} BigQuery ${item.type} (${item.date}):\n\n`;
    const suffix = `\n\nDocs: ${item.link}`;
    
    // Calculate length available for text snippet
    // Twitter counts URL as 23 characters
    const urlPlaceholderLen = 23;
    const overhead = prefix.length + "\n\nDocs: ".length + urlPlaceholderLen;
    const maxSnippetLen = 280 - overhead - 5; // buffer
    
    let snippet = item.content_text;
    if (snippet.length > maxSnippetLen) {
        snippet = snippet.substring(0, maxSnippetLen - 3).trim() + '...';
    }
    
    tweetTextArea.value = `${prefix}${snippet}${suffix}`;
    updateCharCounter();
}

// Character counter updater
function updateCharCounter() {
    const text = tweetTextArea.value;
    
    // Custom calculation simulating Twitter's URL count logic
    // Replace HTTP URLs with a 23-char placeholder for counting accuracy
    const urlRegex = /https?:\/\/[^\s]+/g;
    let computedText = text.replace(urlRegex, 'x'.repeat(23));
    
    const count = computedText.length;
    tweetCharCounter.textContent = `${count} / 280`;
    
    if (count > 280) {
        tweetCharCounter.classList.add('error');
        tweetWarning.style.display = 'block';
        postTweetBtn.disabled = true;
    } else {
        tweetCharCounter.classList.remove('error');
        tweetWarning.style.display = 'none';
        postTweetBtn.disabled = false;
    }
}

// Copy Tweet text to clipboard
async function copyTweetText() {
    const text = tweetTextArea.value;
    try {
        await navigator.clipboard.writeText(text);
        
        // Show copied status
        const originalText = copyTweetBtn.innerHTML;
        copyTweetBtn.innerHTML = `<i data-lucide="check"></i> <span>Copied!</span>`;
        copyTweetBtn.classList.remove('btn-outline');
        copyTweetBtn.classList.add('btn-primary');
        lucide.createIcons();
        
        setTimeout(() => {
            copyTweetBtn.innerHTML = originalText;
            copyTweetBtn.classList.remove('btn-primary');
            copyTweetBtn.classList.add('btn-outline');
            lucide.createIcons();
        }, 2000);
        
    } catch (err) {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy text to clipboard. Please copy it manually.');
    }
}

// Intent Share to Twitter
function postTweet() {
    const text = tweetTextArea.value;
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
}
