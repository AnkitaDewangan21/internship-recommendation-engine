/**
 * AI-Based Smart Internship Recommendation System
 * Frontend JavaScript
 * Handles form validation, AJAX requests, and dynamic UI updates
 */

// ============== UTILITY FUNCTIONS ==============

/**
 * Display a notification message
 */
function showNotification(message, type = 'success') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

/**
 * Clear all error messages
 */
function clearErrorMessages() {
    const errors = document.querySelectorAll('.error-message.show');
    errors.forEach(error => error.classList.remove('show'));
}

/**
 * Show an error message for a specific field
 */
function showFieldError(fieldId, message) {
    const errorElement = document.getElementById(fieldId + 'Error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }
}

/**
 * Scroll to an element smoothly
 */
function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ============== FORM VALIDATION ==============

/**
 * Validate the recommendation form
 */
function validateRecommendationForm() {
    clearErrorMessages();
    let isValid = true;
    
    // Get form values
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const academic_level = document.getElementById('academic_level').value;
    const discipline = document.getElementById('discipline').value;
    const skills = document.getElementById('skills').value.trim();
    const preferred_domain = document.getElementById('preferred_domain').value;
    const preferred_location = document.getElementById('preferred_location').value.trim();
    const internship_type = document.getElementById('internship_type').value;
    const duration_preference = document.getElementById('duration_preference').value;
    const confirmation = document.getElementById('confirmation').checked;
    
    // Validate Name
    if (!name) {
        showFieldError('name', 'Full name is required');
        isValid = false;
    } else if (name.length < 3) {
        showFieldError('name', 'Name must be at least 3 characters');
        isValid = false;
    }
    
    // Validate Email
    if (!email) {
        showFieldError('email', 'Email is required');
        isValid = false;
    } else if (!isValidEmail(email)) {
        showFieldError('email', 'Please enter a valid email address');
        isValid = false;
    }
    
    // Validate Academic Level
    if (!academic_level) {
        showFieldError('academic', 'Academic level is required');
        isValid = false;
    }
    
    // Validate Discipline
    if (!discipline) {
        showFieldError('discipline', 'Discipline is required');
        isValid = false;
    }
    
    // Validate Skills
    if (!skills) {
        showFieldError('skills', 'At least one skill is required');
        isValid = false;
    } else if (skills.split(',').length < 1) {
        showFieldError('skills', 'Please enter valid skills');
        isValid = false;
    }
    
    // Validate Preferred Domain
    if (!preferred_domain) {
        showFieldError('domain', 'Preferred domain is required');
        isValid = false;
    }
    
    // Validate Location
    if (!preferred_location) {
        showFieldError('location', 'Preferred location is required');
        isValid = false;
    }
    
    // Validate Internship Type
    if (!internship_type) {
        showFieldError('type', 'Internship type is required');
        isValid = false;
    }
    
    // Validate Duration
    if (!duration_preference) {
        showFieldError('duration', 'Duration preference is required');
        isValid = false;
    }
    
    // Validate Confirmation
    if (!confirmation) {
        showFieldError('confirm', 'You must confirm the information is correct');
        isValid = false;
    }
    
    return isValid;
}

/**
 * Check if email is valid
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ============== FORM SUBMISSION ==============

/**
 * Handle recommendation form submission
 */
function handleRecommendationSubmit(event) {
    event.preventDefault();
    
    // Validate form
    if (!validateRecommendationForm()) {
        scrollToElement('recommendationForm');
        showNotification('Please fix the validation errors', 'error');
        return;
    }
    
    // Collect form data
    const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        academic_level: document.getElementById('academic_level').value,
        discipline: document.getElementById('discipline').value,
        skills: document.getElementById('skills').value.trim(),
        preferred_domain: document.getElementById('preferred_domain').value,
        preferred_location: document.getElementById('preferred_location').value.trim(),
        internship_type: document.getElementById('internship_type').value,
        duration_preference: document.getElementById('duration_preference').value
    };
    
    // Show loading spinner
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'flex';
    
    // Disable submit button
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    
    // Send request to backend
    fetch('/recommend', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Server error: ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        // Hide spinner
        spinner.style.display = 'none';
        submitBtn.disabled = false;
        
        if (data.status === 'success') {
            displayRecommendations(data.recommendations, data.message);
            showNotification('Recommendations generated successfully!', 'success');
            scrollToElement('resultsSection');
        } else {
            showNotification(data.message || 'Error generating recommendations', 'error');
        }
    })
    .catch(error => {
        // Hide spinner
        spinner.style.display = 'none';
        submitBtn.disabled = false;
        
        console.error('Error:', error);
        showNotification('Failed to fetch recommendations. Please try again.', 'error');
    });
}

// ============== DISPLAY RECOMMENDATIONS ==============

/**
 * Display recommendation cards
 */
function displayRecommendations(recommendations, message) {
    const resultsSection = document.getElementById('resultsSection');
    const resultsContainer = document.getElementById('resultsContainer');
    
    if (recommendations.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <p>${message}</p>
                <p>Try adjusting your skills, location preference, or domain selection.</p>
            </div>
        `;
        resultsSection.style.display = 'block';
        return;
    }
    
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    // Create cards for each recommendation
    recommendations.forEach(internship => {
        const card = document.createElement('div');
        card.className = 'recommendation-card';
        
        const scorePercentage = Math.min(100, (internship.score / 12) * 100).toFixed(0);
        
        card.innerHTML = `
            <h4>${escapeHtml(internship.title)}</h4>
            <p><strong>Organization:</strong> ${escapeHtml(internship.organization)}</p>
            
            <div class="card-meta">
                <div class="meta-item">
                    <span class="meta-label">Domain</span>
                    <div class="meta-value">${escapeHtml(internship.domain)}</div>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Location</span>
                    <div class="meta-value">${escapeHtml(internship.location)}</div>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Mode</span>
                    <div class="meta-value">${escapeHtml(internship.mode)}</div>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Duration</span>
                    <div class="meta-value">${internship.duration_weeks} weeks</div>
                </div>
            </div>
            
            <p><strong>Description:</strong> ${escapeHtml(internship.description)}</p>
            
            <p><strong>Required Skills:</strong> ${internship.required_skills.join(', ')}</p>
            
            <p><strong>Eligibility:</strong> ${escapeHtml(internship.eligibility_level)}</p>        
        `;
        
        resultsContainer.appendChild(card);
    });
    
    resultsSection.style.display = 'block';
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ============== REAL-TIME FIELD VALIDATION ==============

/**
 * Add real-time validation listeners
 */
function setupFieldValidation() {
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const skillsInput = document.getElementById('skills');
    
    // Name validation
    if (nameInput) {
        nameInput.addEventListener('blur', () => {
            const name = nameInput.value.trim();
            if (name && name.length < 3) {
                showFieldError('name', 'Name must be at least 3 characters');
            } else if (name) {
                clearErrorMessages();
            }
        });
    }
    
    // Email validation
    if (emailInput) {
        emailInput.addEventListener('blur', () => {
            const email = emailInput.value.trim();
            if (email && !isValidEmail(email)) {
                showFieldError('email', 'Please enter a valid email address');
            } else if (email) {
                const errorElement = document.getElementById('emailError');
                if (errorElement) errorElement.classList.remove('show');
            }
        });
    }
    
    // Skills validation
    if (skillsInput) {
        skillsInput.addEventListener('change', () => {
            const skills = skillsInput.value.trim();
            if (skills) {
                const errorElement = document.getElementById('skillsError');
                if (errorElement) errorElement.classList.remove('show');
            }
        });
    }
}

// ============== CLEAR FORM ==============

/**
 * Clear form and reset UI
 */
function clearForm() {
    document.getElementById('recommendationForm').reset();
    clearErrorMessages();
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('resultsContainer').innerHTML = '';
}

// ============== INITIALIZATION ==============

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing AI-Based Smart Internship Recommendation System...');
    
    // Get form element
    const form = document.getElementById('recommendationForm');
    
    if (form) {
        // Attach form submission handler
        form.addEventListener('submit', handleRecommendationSubmit);
        
        // Setup real-time validation
        setupFieldValidation();
        
        console.log('✓ Form handlers initialized');
    }
    
    // Add smooth navigation for header links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Smooth scroll is handled by CSS, just close any dropdowns if needed
        });
    });
    
    console.log('✓ Application ready');
});

// ============== ADDITIONAL UTILITY FUNCTIONS ==============

/**
 * Format a date string
 */
function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-IN', options);
}

/**
 * Get skills array from input
 */
function getSkillsArray(skillsString) {
    return skillsString
        .split(',')
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0);
}

/**
 * Log analytics event (for future integration)
 */
function logEvent(eventName, eventData) {
    console.log(`Event: ${eventName}`, eventData);
    // Future: Send to analytics service
}

// Log page load
logEvent('page_load', {
    timestamp: new Date().toISOString(),
    page: 'home'
});
