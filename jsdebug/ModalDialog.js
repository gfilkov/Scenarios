class ModalDialog {
    constructor(config = {}) {
        // Default configuration
        this.config = {
            title: config.title || 'Modal Title',
            message: config.message || 'This is a modal dialog message.',
            buttons: config.buttons || [
                { text: 'Share', type: 'primary', action: null },
                { text: 'Save', type: 'secondary', action: null },
                { text: 'Done', type: 'default', action: null }
            ],
            onClose: config.onClose || null,
            overlayClose: config.overlayClose !== undefined ? config.overlayClose : true
        };
        
        this.modal = null;
        this.overlay = null;
        this.init();
    }
    
    init() {
        this.createOverlay();
        this.createModal();
        this.setupEventListeners();
        this.show();
    }
    
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'modal-overlay';
        
        // Apply overlay styles
        Object.assign(this.overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '1000',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        });
        
        document.body.appendChild(this.overlay);
    }
    
    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal-dialog';
        
        // Apply modal styles
        Object.assign(this.modal.style, {
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            width: '400px',
            maxWidth: '90%',
            maxHeight: '90vh',
            overflow: 'hidden',
            transform: 'translateY(-20px)',
            opacity: '0',
            transition: 'all 0.3s ease'
        });
        
        // Create modal content structure
        this.modal.innerHTML = `
            <div class="modal-header"></div>
            <div class="modal-body"></div>
            <div class="modal-footer"></div>
        `;
        
        // Add modal to overlay
        this.overlay.appendChild(this.modal);
        
        // Populate content
        this.populateContent();
    }
    
    populateContent() {
        // Header
        const header = this.modal.querySelector('.modal-header');
        Object.assign(header.style, {
            padding: '20px 24px 16px',
            borderBottom: '1px solid #eaeaea'
        });
        
        const title = document.createElement('h3');
        title.textContent = this.config.title;
        Object.assign(title.style, {
            margin: '0',
            fontSize: '18px',
            fontWeight: '600',
            color: '#333'
        });
        header.appendChild(title);
        
        // Body
        const body = this.modal.querySelector('.modal-body');
        Object.assign(body.style, {
            padding: '24px',
            fontSize: '14px',
            lineHeight: '1.5',
            color: '#555'
        });
        
        const message = document.createElement('p');
        message.textContent = this.config.message;
        message.style.margin = '0';
		
		// add multi-line support
		message.style.cssText = `
			white-space: pre-wrap; /* Preserve line breaks and wrap text */
			margin: '0';
		`;
		
        body.appendChild(message);
        
        // Footer
        const footer = this.modal.querySelector('.modal-footer');
        Object.assign(footer.style, {
            padding: '16px 24px',
            borderTop: '1px solid #eaeaea',
            display: 'flex',
            // justifyContent: 'flex-end',
			// justifyContent: 'center',
			justifyContent: 'space-around',
			
            gap: '12px'
        });
        
        // Create buttons
        this.config.buttons.forEach((btnConfig, index) => {
            const button = document.createElement('button');
            button.textContent = btnConfig.text;
            button.type = 'button';
            button.className = `modal-btn modal-btn-${btnConfig.type}`;
            
            // Apply button styles
            Object.assign(button.style, {
                padding: '8px 16px',
                borderRadius: '4px',
                border: '1px solid',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
            });
            
            // Style based on button type
            switch(btnConfig.type) {
                case 'primary':
                    Object.assign(button.style, {
                        backgroundColor: '#007bff',
                        borderColor: '#007bff',
                        color: 'white'
                    });
                    break;
                case 'secondary':
                    Object.assign(button.style, {
                        backgroundColor: '#6c757d',
                        borderColor: '#6c757d',
                        color: 'white'
                    });
                    break;
                default: // default
                    Object.assign(button.style, {
                        backgroundColor: 'transparent',
                        borderColor: '#dee2e6',
                        color: '#333'
                    });
            }
            
            // Hover effects
            button.addEventListener('mouseenter', () => {
                const currentStyles = { ...button.style };
                switch(btnConfig.type) {
                    case 'primary':
                        button.style.backgroundColor = '#0056b3';
                        button.style.borderColor = '#0056b3';
                        break;
                    case 'secondary':
                        button.style.backgroundColor = '#545b62';
                        button.style.borderColor = '#545b62';
                        break;
                    default:
                        button.style.backgroundColor = '#f8f9fa';
                }
            });
            
            button.addEventListener('mouseleave', () => {
                switch(btnConfig.type) {
                    case 'primary':
                        button.style.backgroundColor = '#007bff';
                        button.style.borderColor = '#007bff';
                        break;
                    case 'secondary':
                        button.style.backgroundColor = '#6c757d';
                        button.style.borderColor = '#6c757d';
                        break;
                    default:
                        button.style.backgroundColor = 'transparent';
                }
            });
            
            // Button click handler
            button.addEventListener('click', () => {
                if (btnConfig.action && typeof btnConfig.action === 'function') {
                    btnConfig.action();
                }
                // For Done button, close by default
                if (btnConfig.text === 'Done') {
                    this.close();
                }
            });
            
            footer.appendChild(button);
        });
    }
    
    setupEventListeners() {
        // Close on overlay click
        if (this.config.overlayClose) {
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) {
                    this.close();
                }
            });
        }
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal) {
                this.close();
            }
        });
    }
    
    show() {
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // Trigger animation
        setTimeout(() => {
            this.overlay.style.opacity = '1';
            this.modal.style.opacity = '1';
            this.modal.style.transform = 'translateY(0)';
        }, 10);
    }
    
    close() {
        // Animate out
        this.overlay.style.opacity = '0';
        this.modal.style.opacity = '0';
        this.modal.style.transform = 'translateY(-20px)';
        
        // Remove elements after animation
        setTimeout(() => {
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }
            document.body.style.overflow = ''; // Restore scrolling
            
            if (this.config.onClose && typeof this.config.onClose === 'function') {
                this.config.onClose();
            }
            
            this.modal = null;
            this.overlay = null;
        }, 300);
    }
    
    // Utility method for quick usage
    static show(config) {
        return new ModalDialog(config);
    }
}
