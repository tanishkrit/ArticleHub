// Ensure these elements are selected correctly at the top of your script
const sidePanel = document.getElementById('sidePanel');
const mainWrapper = document.getElementById('mainWrapper');
const menuToggle = document.getElementById('menuToggle'); // Hamburger icon inside the side panel
const headerMenuToggle = document.getElementById('headerMenuToggle'); // Hamburger icon in the main header
const homeLink = document.getElementById('homeLink');
const publishLink = document.getElementById('publishLink');
const browseLink = document.getElementById('browseLink');
const aboutLink = document.getElementById('aboutLink');
const contactLink = document.getElementById('contactLink');
const searchBox = document.getElementById('searchBox');
const browseSearchBox = document.getElementById('browseSearchBox');
const postButton = document.getElementById('postButton');
const footer = document.querySelector('footer');
const contactForm = document.getElementById('contactForm');

let currentlyViewedArticleIndex = -1;

// Navigation links for highlighting the active section
const navLinksForHighlight = [
    { el: homeLink, id: 'home' },
    { el: publishLink, id: 'publish' },
    { el: browseLink, id: 'browse' },
    { el: aboutLink, id: 'about' },
    { el: contactLink, id: 'contact' }
];

/**
 * Shows a specific section of the page and hides others.
 * Updates the URL hash and highlights the active navigation link.
 * @param {string} sectionId - The ID of the section to show.
 */
function showSection(sectionId) {
    const sections = ['home', 'publish', 'browse', 'about', 'contact'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.classList.add('hidden');
        }
    });

    const selectedSection = document.getElementById(sectionId);

    if (selectedSection) {
        selectedSection.classList.remove('hidden');

        if (sectionId === 'home') {
            const topArticlesContainer = document.getElementById('topArticlesContainer');
            if (topArticlesContainer) {
                 showTopArticle();
            } else {
                console.warn("#topArticlesContainer not found for home section.");
            }
        } else if (sectionId === 'browse') {
            const currentSearchQuery = browseSearchBox ? browseSearchBox.value : '';
            displayArticleList(currentSearchQuery, false);
        }

        navLinksForHighlight.forEach(linkInfo => {
            if (linkInfo.el) {
                linkInfo.el.classList.toggle('active-nav', linkInfo.id === sectionId);
            }
        });

        if (history.pushState) {
            history.pushState(null, null, '#' + sectionId);
        } else {
            window.location.hash = sectionId;
        }

    } else {
        console.warn(`Section with ID "${sectionId}" not found. Attempting to redirect to Home.`);
        showCustomAlert(`The section "${sectionId}" is not available. You will be taken to the Home page.`);

        if (sectionId !== 'home') {
            const homeSectionExists = document.getElementById('home');
            if (homeSectionExists) {
                window.location.hash = 'home'; // This will trigger hashchange and show home
            } else {
                showCustomAlert("Critical error: Home page content is missing. Site navigation may be broken.");
                 navLinksForHighlight.forEach(linkInfo => {
                    if (linkInfo.el) linkInfo.el.classList.remove('active-nav');
                });
            }
        } else { // sectionId IS 'home' but not found
            showCustomAlert("Critical error: Home page content is missing. Site navigation may be broken.");
            navLinksForHighlight.forEach(linkInfo => { // Clear all active states
                if (linkInfo.el) linkInfo.el.classList.remove('active-nav');
            });
        }
    }
}

/**
 * Toggles the visibility of the side panel based on click events.
 */
function toggleSidePanel() {
    if (!sidePanel || !mainWrapper || !footer || !headerMenuToggle) {
        console.error("Critical layout elements (sidePanel, mainWrapper, footer, or headerMenuToggle) not found for toggleSidePanel.");
        return;
    }

    const isCurrentlyClickOpened = sidePanel.classList.contains('is-open');
    const becomingClickOpened = !isCurrentlyClickOpened; // The state it will be after toggle

    // Clear any hover-induced states as a click takes precedence
    if (sidePanel.classList.contains('is-hover-open')) {
        sidePanel.classList.remove('is-hover-open');
        mainWrapper.classList.remove('panel-is-hover-open');
        footer.classList.remove('panel-is-hover-open');
        // headerMenuToggle visibility will be correctly set below based on becomingClickOpened
    }

    // Apply/remove the click-opened states
    sidePanel.classList.toggle('is-open', becomingClickOpened);
    mainWrapper.classList.toggle('panel-is-open', becomingClickOpened);
    footer.classList.toggle('panel-is-open', becomingClickOpened);

    // Manage visibility of the hamburger icon in the main header
    headerMenuToggle.classList.toggle('hidden', becomingClickOpened);
}


/**
 * Gathers article data from the form, handles attachments, and saves the article.
 */
function postArticle() {
    const titleInput = document.getElementById('title');
    const contentInput = document.getElementById('content');
    const categoryInput = document.getElementById('category');
    const tagsInputEl = document.getElementById('tags');
    const attachmentInput = document.getElementById('attachment');

    if (!titleInput || !contentInput || !categoryInput || !tagsInputEl || !attachmentInput) {
        showCustomAlert('Error: One or more form fields are missing. Cannot post article.');
        console.error("Missing form fields for posting article.");
        return;
    }

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const category = categoryInput.value.trim();
    const tagsRaw = tagsInputEl.value;
    const tags = tagsRaw ? tagsRaw.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    const files = attachmentInput.files;

    if (title && content) {
        const article = {
            title,
            content,
            category: category || "Uncategorized",
            tags,
            views: 0,
            attachments: [],
            createdAt: new Date().toISOString()
        };

        if (files && files.length > 0) {
            const filePromises = Array.from(files).map(file => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        resolve({
                            name: file.name,
                            type: file.type,
                            dataURL: event.target.result
                        });
                    };
                    reader.onerror = (error) => {
                        console.error("FileReader error:", error);
                        reject(error);
                    };
                    reader.readAsDataURL(file);
                });
            });

            Promise.all(filePromises)
                .then(attachments => {
                    article.attachments = attachments;
                    saveArticle(article);
                })
                .catch(error => {
                    console.error("Failed to load attachments:", error);
                    showCustomAlert("Failed to upload some attachments. Article saved without them.");
                    saveArticle(article); // Save article even if some attachments fail
                });
        } else {
            saveArticle(article);
        }
    } else {
        showCustomAlert('Please enter at least a title and content for the article.');
    }
}

/**
 * Saves the article to localStorage and resets the form.
 * @param {object} article - The article object to save.
 */
function saveArticle(article) {
    let articles = JSON.parse(localStorage.getItem('articles') || '[]');
    articles.unshift(article); // Add new article to the beginning
    localStorage.setItem('articles', JSON.stringify(articles));

    // Reset form fields
    const titleInput = document.getElementById('title');
    const contentInput = document.getElementById('content');
    const categoryInput = document.getElementById('category');
    const tagsInputEl = document.getElementById('tags');
    const attachmentInput = document.getElementById('attachment');

    if(titleInput) titleInput.value = '';
    if(contentInput) contentInput.value = '';
    if(categoryInput) categoryInput.value = '';
    if(tagsInputEl) tagsInputEl.value = '';
    if (attachmentInput) attachmentInput.value = ''; // Reset file input

    showCustomAlert('Article published successfully!');
    showSection('browse'); // Navigate to browse section to see the new article
}

/**
 * Displays the list of articles, optionally filtered by a query.
 */
function displayArticleList(filterQuery = '', isRefreshFromViewFullArticle = false) {
    const articlesData = JSON.parse(localStorage.getItem('articles') || '[]');
    const articlesContainer = document.getElementById('articles');
    if (!articlesContainer) {
        console.error("Articles container (#articles) not found.");
        return;
    }

    let listAndDetailWrapper = articlesContainer.querySelector('.browse-wrapper');
    let articleListDiv, articleDetailDiv;

    // Setup two-column layout if it doesn't exist
    if (!listAndDetailWrapper) {
        articlesContainer.innerHTML = ''; // Clear previous content
        listAndDetailWrapper = document.createElement('div');
        listAndDetailWrapper.className = 'browse-wrapper';
        articlesContainer.appendChild(listAndDetailWrapper);

        articleListDiv = document.createElement('div');
        articleListDiv.className = 'article-list-column';
        listAndDetailWrapper.appendChild(articleListDiv);

        articleDetailDiv = document.createElement('div');
        articleDetailDiv.className = 'article-detail-column';
        articleDetailDiv.innerHTML = '<p class="placeholder-text">Select an article from the list to read its details.</p>';
        listAndDetailWrapper.appendChild(articleDetailDiv);
    } else {
        articleListDiv = listAndDetailWrapper.querySelector('.article-list-column');
        articleDetailDiv = listAndDetailWrapper.querySelector('.article-detail-column');
        if (articleListDiv) {
            articleListDiv.innerHTML = ''; // Clear only the list for refresh
        } else {
            console.error("Article list column not found within existing browse-wrapper."); return;
        }
    }

    const lowerFilterQuery = filterQuery.toLowerCase();
    const filteredArticles = articlesData.filter(article =>
        (article.title && article.title.toLowerCase().includes(lowerFilterQuery)) ||
        (article.category && article.category.toLowerCase().includes(lowerFilterQuery)) ||
        (article.content && article.content.toLowerCase().includes(lowerFilterQuery)) ||
        (article.tags && Array.isArray(article.tags) && article.tags.some(tag => tag.toLowerCase().includes(lowerFilterQuery)))
    );

    if (filteredArticles.length === 0) {
        const message = filterQuery
            ? 'No articles found matching your search. Try different keywords!'
            : 'No articles yet. Be the first to publish!';
        if(articleListDiv) articleListDiv.innerHTML = `<p class="list-placeholder">${message}</p>`;
        // If no articles match, and a detail view was open, clear it or show a relevant message
        if (articleDetailDiv && currentlyViewedArticleIndex !== -1 && !isRefreshFromViewFullArticle) {
             articleDetailDiv.innerHTML = '<p class="placeholder-text">Previously viewed article is not in the current filter. Select another article.</p>';
        } else if (articleDetailDiv && !isRefreshFromViewFullArticle && !articleDetailDiv.querySelector('.article-full-content')) {
            // If detail view is empty and not a refresh, keep placeholder
            articleDetailDiv.innerHTML = '<p class="placeholder-text">Select an article from the list to read its details.</p>';
        }
        return;
    }

    filteredArticles.forEach((article) => {
        // Find the original index from the full articlesData array to maintain consistency for viewFullArticle
        const originalIndex = articlesData.findIndex(a => a.createdAt === article.createdAt && a.title === article.title);
        const articleItem = document.createElement('div');
        articleItem.className = 'article-list-item';
        if (originalIndex === currentlyViewedArticleIndex) { // Highlight if it's the currently viewed article
            articleItem.classList.add('active');
        }

        const title = article.title || "Untitled Article";
        const category = article.category || 'Uncategorized';
        const views = article.views || 0;

        articleItem.innerHTML = `
            <h4>${title}</h4>
            <p class="category">Category: ${category}</p>
            <p class="views-list">Views: ${views}</p>
        `;
        articleItem.addEventListener('click', () => {
            // Ensure detailContainer is the one in the current DOM, not a stale reference
            const currentDetailContainer = listAndDetailWrapper.querySelector('.article-detail-column');
            if (currentDetailContainer) {
                viewFullArticle(originalIndex, currentDetailContainer);
            } else {
                console.error("Detail container not found on click.");
            }
        });
        if(articleListDiv) articleListDiv.appendChild(articleItem);
    });

    // Logic to maintain or clear the detail view based on filter and current view
    if (!isRefreshFromViewFullArticle && articleDetailDiv) {
        const currentArticleData = articlesData[currentlyViewedArticleIndex];
        const currentArticleIsStillInFilteredList = currentlyViewedArticleIndex !== -1 &&
                                           currentArticleData &&
                                           filteredArticles.some(art => art.createdAt === currentArticleData.createdAt && art.title === currentArticleData.title);

        if (currentArticleIsStillInFilteredList) {
            // If current article is still in list, ensure detail view matches, or re-render if needed
            const detailTitleEl = articleDetailDiv.querySelector('.article-full-content h3');
            if (!detailTitleEl || (detailTitleEl.textContent !== currentArticleData.title)) {
                // If detail view is empty or shows wrong article, re-render
                viewFullArticle(currentlyViewedArticleIndex, articleDetailDiv);
            }
        } else if (currentlyViewedArticleIndex !== -1 && !currentArticleIsStillInFilteredList) {
            // If previously viewed article is no longer in filtered list, show placeholder
            articleDetailDiv.innerHTML = '<p class="placeholder-text">Previously viewed article is not in the current filter. Select another article.</p>';
        } else if (currentlyViewedArticleIndex === -1 && !articleDetailDiv.querySelector('.article-full-content')) {
            // If no article was selected and detail view is empty, show default placeholder
            articleDetailDiv.innerHTML = '<p class="placeholder-text">Select an article from the list to read its details.</p>';
        }
    }
}


/**
 * Displays the full content of a selected article in the detail column.
 * @param {number} index - Index of the article in the original articlesData array.
 * @param {HTMLElement} detailContainer - The DOM element to render the article into.
 */
function viewFullArticle(index, detailContainer) {
    let articles = JSON.parse(localStorage.getItem('articles') || '[]');
    if (index < 0 || index >= articles.length || !articles[index]) {
        if(detailContainer) detailContainer.innerHTML = '<p class="error-text">Could not load article. It may have been removed or data is corrupt.</p>';
        currentlyViewedArticleIndex = -1; // Reset viewed index
        return;
    }

    const article = articles[index];
    let viewsUpdated = false;
    // Increment views if this article is being viewed for the first time in this session or is a new article
    if (currentlyViewedArticleIndex !== index || !article.views) { // Also increment if views is 0 or undefined
        article.views = (Number(article.views) || 0) + 1;
        articles[index] = article; // Update the article in the array
        localStorage.setItem('articles', JSON.stringify(articles)); // Save back to localStorage
        viewsUpdated = true;
    }
    currentlyViewedArticleIndex = index; // Set this as the currently viewed article

    const title = article.title || "Untitled Article";
    const category = article.category || 'Uncategorized';
    const content = article.content || "No content available for this article.";
    const views = article.views || 0; // Use updated views

    const tagsHTML = article.tags && Array.isArray(article.tags) && article.tags.length > 0
        ? article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')
        : '<span class="text-gray-500 italic text-sm">No tags</span>'; // Placeholder if no tags

    let attachmentsHTML = '';
    if (article.attachments && Array.isArray(article.attachments) && article.attachments.length > 0) {
        attachmentsHTML = '<div class="attachments">';
        attachmentsHTML += '<h4>Attachments:</h4>';
        article.attachments.forEach(attachment => {
            if (attachment && attachment.type && attachment.dataURL && attachment.name) {
                const isImage = attachment.type.startsWith('image/');
                const isVideo = attachment.type.startsWith('video/');
                if (isImage) {
                    attachmentsHTML += `<img src="${attachment.dataURL}" alt="${attachment.name}" onerror="this.style.display='none'; this.parentElement.insertAdjacentHTML('beforeend', '<p class=\\'attachment-error\\'>Preview unavailable for ${attachment.name}</p>');">`;
                } else if (isVideo) {
                    attachmentsHTML += `<video controls width="100%"><source src="${attachment.dataURL}" type="${attachment.type}">Your browser does not support the video tag. <a href="${attachment.dataURL}" download="${attachment.name}">${attachment.name}</a></video>`;
                } else { // For other file types like PDF, DOCX
                    attachmentsHTML += `<a href="${attachment.dataURL}" download="${attachment.name}" class="attachment-link">${attachment.name}</a>`;
                }
            } else {
                 attachmentsHTML += `<p class="attachment-error">An attachment could not be loaded (data missing).</p>`;
            }
        });
        attachmentsHTML += '</div>';
    }

    if(detailContainer) {
        detailContainer.innerHTML = `
            <div class="article-full-content">
                <h3>${title}</h3>
                <p class="category-detail"><strong>Category:</strong> ${category}</p>
                <div class="tags-detail"><strong>Tags:</strong> ${tagsHTML}</div>
                <hr>
                <div class="content-main">${content.replace(/\n/g, '<br>')}</div>
                ${attachmentsHTML}
                <hr>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <p class="views-detail"><strong>Views:</strong> ${views}</p>
                    <button onclick="deleteArticleConfirmation()" class="delete-button">Delete Article</button>
                </div>
            </div>
        `;
        detailContainer.scrollTop = 0; // Scroll to top of new content
    }

    // Refresh the article list to update view counts and active item highlighting
    // Pass true for isRefreshFromViewFullArticle to avoid clearing detail view unnecessarily
    const currentSearchQuery = browseSearchBox ? browseSearchBox.value : '';
    // Only refresh list if browse section is active and list column exists
    if (document.querySelector('.article-list-column') && !document.getElementById('browse').classList.contains('hidden')) {
         displayArticleList(currentSearchQuery, true);
    }
}


/**
 * Shows a confirmation dialog before deleting an article.
 */
function deleteArticleConfirmation() {
    if (currentlyViewedArticleIndex !== -1) {
        const articles = JSON.parse(localStorage.getItem('articles') || '[]');
        if (articles[currentlyViewedArticleIndex]) { // Check if article still exists at that index
            showCustomConfirm('Are you sure you want to delete this article? This action cannot be undone.', () => {
                deleteArticle(currentlyViewedArticleIndex);
            });
        } else {
            showCustomAlert('Selected article no longer exists or was already deleted.');
            currentlyViewedArticleIndex = -1; // Reset index
            const currentSearchQuery = browseSearchBox ? browseSearchBox.value : '';
            displayArticleList(currentSearchQuery, false); // Refresh list
        }
    } else {
        showCustomAlert('No article selected for deletion.');
    }
}

/**
 * Deletes an article from localStorage and refreshes the list.
 * @param {number} indexToDelete - The index of the article to delete from the original articles array.
 */
function deleteArticle(indexToDelete) {
    let articles = JSON.parse(localStorage.getItem('articles') || '[]');
    if (indexToDelete < 0 || indexToDelete >= articles.length) {
        showCustomAlert('Error: Cannot delete. Article not found or index out of bounds.');
        return;
    }
    articles.splice(indexToDelete, 1); // Remove the article
    localStorage.setItem('articles', JSON.stringify(articles));

    // Clear the detail view and reset currentlyViewedArticleIndex
    const articleDetailDiv = document.querySelector('.article-detail-column');
    if(articleDetailDiv) {
        articleDetailDiv.innerHTML = '<p class="placeholder-text">Article deleted. Select another article.</p>';
    }
    currentlyViewedArticleIndex = -1; // Reset index

    // Refresh the article list
    const currentSearchQuery = browseSearchBox ? browseSearchBox.value : '';
    displayArticleList(currentSearchQuery, false); // `false` to ensure detail view is reset if needed
    showCustomAlert('Article has been deleted.');
}


/**
 * Filters and displays articles based on the search query from main search box or browse search box.
 * @param {string} query - The search query.
 */
function searchArticles(query) {
    // This function is primarily called from search input events.
    // It will re-render the article list based on the query.
    // The displayArticleList function handles the filtering and rendering.
    displayArticleList(query, false); // `false` because this is a new search/filter action
}

/**
 * Displays the top articles on the home page.
 */
function showTopArticle() {
    const articles = JSON.parse(localStorage.getItem('articles') || '[]');
    const topArticlesContainer = document.getElementById('topArticlesContainer');
    if (!topArticlesContainer) {
        console.warn("Top articles container (#topArticlesContainer) not found.");
        return;
    }

    topArticlesContainer.innerHTML = ''; // Clear previous top articles

    if (articles.length === 0) {
        topArticlesContainer.innerHTML = '<p>No articles available yet. Be the first to publish!</p>';
        return;
    }

    // Ensure views are numeric for sorting
    const articlesWithNumericViews = articles.map(article => ({ ...article, views: Number(article.views) || 0 }));
    const sorted = [...articlesWithNumericViews].sort((a, b) => b.views - a.views); // Sort by views descending

    const topFew = sorted.slice(0, 3); // Get top 3 articles

    if (topFew.length === 0) { // Should not happen if articles.length > 0, but good check
        topArticlesContainer.innerHTML = '<p>No articles to display in top section.</p>';
        return;
    }

    topFew.forEach(top => {
        // Find original index for navigation
        const originalIndexOfTop = articles.findIndex(a => a.createdAt === top.createdAt && a.title === top.title);

        const topTitle = top.title || "Top Article";
        const topCategory = top.category || "Uncategorized";
        const topContentPreview = top.content ? top.content.substring(0, 100) + (top.content.length > 100 ? '...' : '') : "No content preview.";
        const topViews = top.views || 0;

        const card = document.createElement('div');
        card.className = 'top-article-card';
        card.innerHTML = `
          <h3>${topTitle}</h3>
          <p class="category">Category: ${topCategory}</p>
          <p class="content-preview">${topContentPreview}</p>
          <p class="views">Views: ${topViews}</p>
          <button onclick="navigateToArticleFromHome(${originalIndexOfTop})" class="button-style">Read More</button>
        `;
        topArticlesContainer.appendChild(card);
    });
}


/**
 * Navigates to the browse section and displays the selected article from home page.
 * @param {number} articleIndex - The index of the article to show.
 */
function navigateToArticleFromHome(articleIndex) {
    currentlyViewedArticleIndex = articleIndex; // Set the article to be viewed
    showSection('browse'); // Switch to browse section; displayArticleList will be called by showSection
                           // and viewFullArticle will be called if needed by displayArticleList logic.
}

/**
 * Shows a custom alert message at the bottom of the screen.
 * @param {string} message - The message to display.
 */
function showCustomAlert(message) {
    const alertBoxId = 'custom-alert-box';
    let alertBox = document.getElementById(alertBoxId);
    if (!alertBox) { // Create if it doesn't exist
        alertBox = document.createElement('div');
        alertBox.id = alertBoxId;
        alertBox.className = 'custom-alert-box'; // Ensure styles are applied
        document.body.appendChild(alertBox);
    }
    alertBox.textContent = message;
    alertBox.style.display = 'block'; // Make it visible before animation
    alertBox.style.opacity = '0'; // Start transparent for fade in

    void alertBox.offsetWidth; // Trigger reflow to apply initial opacity before animation

    alertBox.style.animation = 'fadeInOut 3s forwards'; // Apply animation

    // Fallback to hide it if animation 'forwards' doesn't persist display:none
    setTimeout(() => {
        if(alertBox && getComputedStyle(alertBox).display !== 'none') {
            // Start fade out part of animation if not handled by keyframes' 100% state
            alertBox.style.opacity = '0';
            setTimeout(() => { if(alertBox) alertBox.style.display = 'none'; }, 500); // Delay display:none
        }
    }, 2800); // Start hiding process slightly before animation ends
}

/**
 * Shows a custom confirmation dialog in the center of the screen.
 * @param {string} message - The confirmation message.
 * @param {function} callback - The function to call if user confirms (clicks Yes).
 */
function showCustomConfirm(message, callback) {
    const confirmBoxId = 'custom-confirm-box';
    let confirmBox = document.getElementById(confirmBoxId);
    if (confirmBox) confirmBox.remove(); // Remove existing confirm box if any

    confirmBox = document.createElement('div');
    confirmBox.id = confirmBoxId;
    confirmBox.className = 'custom-confirm-box'; // Ensure styles are applied

    const messageP = document.createElement('p');
    messageP.textContent = message;
    confirmBox.appendChild(messageP);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-around'; // Space out buttons
    buttonContainer.style.marginTop = '1rem';


    const yesButton = document.createElement('button');
    yesButton.textContent = 'Yes';
    yesButton.className = 'confirm-yes'; // For styling
    yesButton.onclick = () => {
        callback(); // Execute the callback function
        confirmBox.remove(); // Remove the confirm box
    };
    buttonContainer.appendChild(yesButton);

    const noButton = document.createElement('button');
    noButton.textContent = 'No';
    noButton.className = 'confirm-no'; // For styling
    noButton.onclick = () => {
        confirmBox.remove(); // Remove the confirm box
    };
    buttonContainer.appendChild(noButton);

    confirmBox.appendChild(buttonContainer);
    document.body.appendChild(confirmBox);
    confirmBox.style.display = 'flex'; // Make it visible (flex for column layout)
}

// Event Listener for Contact Form Submission
if (contactForm) {
    contactForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent default form submission

        const name = document.getElementById('contactName').value;
        const email = document.getElementById('contactEmail').value;
        const subject = document.getElementById('contactSubject').value;
        const message = document.getElementById('contactMessage').value;

        if (!name || !email || !subject || !message) {
            showCustomAlert('Please fill in all fields.');
            return;
        }

        console.log('Contact Form Submitted:', { name, email, subject, message });
        showCustomAlert('Message sent successfully! We will get back to you soon.');
        contactForm.reset();
    });
}


// Event Listeners Setup on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Set current year in footer
    const yearSpan = document.getElementById('year');
    if(yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // Initial setup for side panel toggles
    if(menuToggle) menuToggle.addEventListener('click', toggleSidePanel);
    if(headerMenuToggle) headerMenuToggle.addEventListener('click', toggleSidePanel);

    // Hover functionality for side panel
    if (sidePanel && mainWrapper && footer && headerMenuToggle) {
        sidePanel.addEventListener('mouseenter', () => {
            // Only apply hover effect if the panel is not permanently open by click
            if (!sidePanel.classList.contains('is-open')) {
                sidePanel.classList.add('is-hover-open');
                mainWrapper.classList.add('panel-is-hover-open');
                footer.classList.add('panel-is-hover-open');
                headerMenuToggle.classList.add('hidden'); // Hide header toggle during hover-open
            }
        });

        sidePanel.addEventListener('mouseleave', () => {
            // Only remove hover effect if it was applied (and not click-opened)
            if (sidePanel.classList.contains('is-hover-open')) {
                sidePanel.classList.remove('is-hover-open');
                mainWrapper.classList.remove('panel-is-hover-open');
                footer.classList.remove('panel-is-hover-open');
                // If not permanently (click) open, show header toggle again
                if (!sidePanel.classList.contains('is-open')) {
                    headerMenuToggle.classList.remove('hidden');
                }
            }
        });
    }

    // Navigation link click handlers
    navLinksForHighlight.forEach(linkInfo => {
        if (linkInfo.el) {
            linkInfo.el.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent default anchor behavior
                showSection(linkInfo.id);
                // If panel is click-open or hover-open and a nav link is clicked,
                // it's good UX to close it if it's not meant to stay open for navigation.
                // However, current toggleSidePanel handles click-open state.
                // For hover-open, mouseleave will handle it.
                // If panel is fully open (is-open), clicking a link might not need to close it automatically,
                // user can use the toggle. Let's keep it simple for now.
                // If the panel is only hover-opened, it will close on mouseleave.
                // If it's click-opened, it will stay open. This behavior is fine.
            });
        }
    });

    // Search box listeners
    if(searchBox) { // Main header search
        searchBox.addEventListener('input', () => {
            const query = searchBox.value;
            // If user types in main search, and browse section is not active, activate it.
            if (document.getElementById('browse').classList.contains('hidden')) {
                 showSection('browse'); // This will call displayArticleList
            } else {
                searchArticles(query); // Just filter if already on browse
            }
            if(browseSearchBox) browseSearchBox.value = query; // Sync with browse section's search box
        });
    }
    if(browseSearchBox) { // Search box within browse section
        browseSearchBox.addEventListener('input', () => {
            const query = browseSearchBox.value;
            searchArticles(query);
            if(searchBox) searchBox.value = query; // Sync with main header search box
        });
    }

    // Post button listener
    if(postButton) postButton.addEventListener('click', postArticle);

    // Handle initial page load based on URL hash
    const hash = window.location.hash.substring(1);
    let initialSection = 'home'; // Default section
    const validInitialSections = ['home', 'publish', 'browse', 'about', 'contact'];

    if (hash && validInitialSections.includes(hash)) {
        initialSection = hash;
    } else if (hash && !validInitialSections.includes(hash)) {
        console.warn(`Invalid section in hash: "${hash}". Defaulting to home.`);
        window.location.hash = 'home'; // Correct the hash, will trigger hashchange if different
        initialSection = 'home'; // Fallback, though hashchange might take over
    }
    showSection(initialSection); // Show the determined section

    // Set initial state of headerMenuToggle based on panel's initial state
    if (headerMenuToggle && sidePanel) {
        headerMenuToggle.classList.toggle('hidden', sidePanel.classList.contains('is-open'));
    }

    // Listen for hash changes to navigate SPA-style
    window.addEventListener('hashchange', () => {
        const newHash = window.location.hash.substring(1);
        if (newHash && validInitialSections.includes(newHash)) {
            showSection(newHash);
        } else if (!newHash) { // If hash is empty (e.g., user clears it or goes to base URL)
            showSection('home');
        } else if (newHash && !validInitialSections.includes(newHash)) {
            console.warn(`Invalid section in hash change: "${newHash}". Defaulting to home.`);
            showSection('home'); // Show home
            // window.location.hash = 'home'; // Avoid recursive hash changes if showSection doesn't set it
        }
    });
});
