/*
 * Ridgeback Ragnar - Premium Interactive Script
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- Scroll Effect for Header ---
    const header = document.querySelector('header');
    const handleScroll = () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Trigger initially in case of refresh down-page

    // --- Mobile Navigation ---
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
            // Prevent background scrolling when menu is open
            document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : 'auto';
        });

        // Close mobile menu on link click
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.style.overflow = 'auto';
            });
        });
    }

    // --- Interactive Gallery & Lightbox ---
    const galleryItems = document.querySelectorAll('.gallery-item');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');
    
    let currentImgIndex = -1;
    let activeImages = []; // Stores only currently visible/active gallery images

    const updateActiveImagesList = () => {
        activeImages = Array.from(document.querySelectorAll('.gallery-item'))
            .filter(item => item.style.display !== 'none')
            .map(item => ({
                src: item.getAttribute('data-src') || item.querySelector('.gallery-img').getAttribute('src'),
                caption: item.getAttribute('data-caption') || (item.querySelector('h4') ? item.querySelector('h4').textContent : "")
            }));
    };

    const showImageAtIndex = (index) => {
        if (index < 0 || index >= activeImages.length) return;
        currentImgIndex = index;
        
        // Add subtle transition out
        lightboxImg.style.opacity = 0;
        lightboxImg.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            lightboxImg.setAttribute('src', activeImages[index].src);
            lightboxCaption.textContent = activeImages[index].caption;
            
            // Transition back in
            lightboxImg.style.opacity = 1;
            lightboxImg.style.transform = 'scale(1)';
        }, 200);
    };

    // --- Lightbox Setup ---
    if (lightbox) {
        // Close Lightbox function
        const closeLightbox = () => {
            lightbox.classList.remove('active');
            document.body.style.overflow = 'auto';
        };

        if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
        
        // Close on clicking outside the image
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox || e.target.classList.contains('lightbox-content')) {
                closeLightbox();
            }
        });

        // Next/Prev Buttons (only slide if we have multiple images)
        if (lightboxPrev && lightboxNext) {
            lightboxPrev.addEventListener('click', (e) => {
                e.stopPropagation();
                if (activeImages.length <= 1) return;
                let prevIndex = currentImgIndex - 1;
                if (prevIndex < 0) prevIndex = activeImages.length - 1;
                showImageAtIndex(prevIndex);
            });

            lightboxNext.addEventListener('click', (e) => {
                e.stopPropagation();
                if (activeImages.length <= 1) return;
                let nextIndex = currentImgIndex + 1;
                if (nextIndex >= activeImages.length) nextIndex = 0;
                showImageAtIndex(nextIndex);
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('active')) return;
            
            if (e.key === 'Escape') {
                closeLightbox();
            } else if (e.key === 'ArrowLeft' && activeImages.length > 1) {
                lightboxPrev.click();
            } else if (e.key === 'ArrowRight' && activeImages.length > 1) {
                lightboxNext.click();
            }
        });

        // --- Gallery Grid Bindings (If on gallery page) ---
        if (galleryItems.length > 0) {
            // Prepare list of images
            updateActiveImagesList();

            // Attach click handlers to gallery items
            galleryItems.forEach(item => {
                item.addEventListener('click', () => {
                    updateActiveImagesList();
                    const itemSrc = item.getAttribute('data-src') || item.querySelector('.gallery-img').getAttribute('src');
                    currentImgIndex = activeImages.findIndex(img => img.src === itemSrc);
                    
                    if (currentImgIndex !== -1) {
                        // Make sure navigation arrows are visible
                        if (lightboxPrev) lightboxPrev.style.display = 'block';
                        if (lightboxNext) lightboxNext.style.display = 'block';
                        
                        showImageAtIndex(currentImgIndex);
                        lightbox.classList.add('active');
                        document.body.style.overflow = 'hidden';
                    }
                });
            });
        }

        // --- Hero Poster Bindings (If on index/home page) ---
        const heroPoster = document.getElementById('hero-poster-trigger');
        if (heroPoster) {
            heroPoster.addEventListener('click', () => {
                // Setup activeImages with just this single poster image
                activeImages = [{
                    src: heroPoster.getAttribute('src'),
                    caption: "Blues For Ragnar by Reggynka – Prestižní výstavní plakát"
                }];
                currentImgIndex = 0;
                
                // Hide navigation arrows since there's only 1 image
                if (lightboxPrev) lightboxPrev.style.display = 'none';
                if (lightboxNext) lightboxNext.style.display = 'none';
                
                showImageAtIndex(0);
                lightbox.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        }
    }

    // --- Gallery Filtering ---
    const filterButtons = document.querySelectorAll('.filter-btn');
    if (filterButtons.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Toggle active button class
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                const category = button.getAttribute('data-filter');
                
                galleryItems.forEach(item => {
                    const itemCategory = item.getAttribute('data-category');
                    if (category === 'all' || itemCategory === category) {
                        item.style.display = 'block';
                        // Keep staggered sizes if any
                    } else {
                        item.style.display = 'none';
                    }
                });
                
                // Update lightbox mapping list to skip filtered-out images
                updateActiveImagesList();
            });
        });
    }

    // --- Contact Form Handling ---
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get form fields
            const name = document.getElementById('form-name').value;
            const email = document.getElementById('form-email').value;
            const message = document.getElementById('form-message').value;
            
            // Simple validation
            if (!name || !email || !message) {
                alert('Prosím, vyplňte všechna pole.');
                return;
            }
            
            // Visual success indicator
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.style.pointerEvents = 'none';
            submitBtn.style.opacity = '0.8';
            submitBtn.innerHTML = 'Odesílám...';
            
            // Real background AJAX email sending using FormSubmit.co
            fetch('https://formsubmit.co/ajax/macinek1@seznam.cz', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    "Jméno": name,
                    "E-mail": email,
                    "Zpráva": message,
                    "_subject": "Nová zpráva z webu ridgebackragnar.cz"
                })
            })
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('Sítové odesílání selhalo');
            })
            .then(data => {
                submitBtn.innerHTML = 'Zpráva odeslána!';
                submitBtn.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
                submitBtn.style.boxShadow = '0 4px 20px rgba(46, 204, 113, 0.3)';
                contactForm.reset();
                
                setTimeout(() => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.style.pointerEvents = 'auto';
                    submitBtn.style.opacity = '1';
                    submitBtn.style.background = '';
                    submitBtn.style.boxShadow = '';
                }, 3000);
            })
            .catch(error => {
                console.error('Error submitting form:', error);
                submitBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Chyba!';
                submitBtn.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
                submitBtn.style.boxShadow = '0 4px 20px rgba(231, 76, 60, 0.3)';
                
                setTimeout(() => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.style.pointerEvents = 'auto';
                    submitBtn.style.opacity = '1';
                    submitBtn.style.background = '';
                    submitBtn.style.boxShadow = '';
                }, 3000);
            });
        });
    }
});
