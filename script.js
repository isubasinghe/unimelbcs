// Configuration - Replace with your Airtable details
const AIRTABLE_CONFIG = {
    baseId: 'YOUR_AIRTABLE_BASE_ID',
    tableName: 'Signatures',
    apiKey: 'YOUR_AIRTABLE_API_KEY', // Use Personal Access Token
    viewName: 'Grid view' // or your view name
};

// Alternative configuration for local testing/fallback
const USE_MOCK_DATA = true; // Set to false when Airtable is configured

class SignatureManager {
    constructor() {
        this.signatures = [];
        this.displayedCount = 0;
        this.loadMoreSize = 20;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSignatures();
    }

    bindEvents() {
        const form = document.getElementById('signatureForm');
        const loadMoreBtn = document.getElementById('loadMoreBtn');

        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMoreSignatures());
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const submitBtn = form.querySelector('.submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        // Show loading state
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';

        try {
            const formData = new FormData(form);
            const signature = {
                name: formData.get('name'),
                email: formData.get('email'),
                program: formData.get('program'),
                status: formData.get('status'),
                comments: formData.get('comments'),
                publicConsent: formData.get('publicConsent') === 'on',
                timestamp: new Date().toISOString()
            };

            await this.submitSignature(signature);
            this.showSuccess();
            form.reset();
            
            // Reload signatures to show the new one
            setTimeout(() => this.loadSignatures(), 1000);

        } catch (error) {
            console.error('Error submitting signature:', error);
            this.showError('Failed to submit signature. Please try again.');
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    }

    async submitSignature(signature) {
        if (USE_MOCK_DATA) {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Add to local storage for demo
            const existing = JSON.parse(localStorage.getItem('signatures') || '[]');
            existing.unshift(signature);
            localStorage.setItem('signatures', JSON.stringify(existing));
            return;
        }

        // Airtable submission
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tableName}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    'Name': signature.name,
                    'Email': signature.email,
                    'Program': signature.program,
                    'Status': signature.status,
                    'Comments': signature.comments,
                    'Public Consent': signature.publicConsent,
                    'Timestamp': signature.timestamp
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    }

    async loadSignatures() {
        try {
            const signatures = await this.fetchSignatures();
            this.signatures = signatures.filter(sig => sig.publicConsent);
            this.displayedCount = 0;
            this.updateSignatureCount();
            this.displaySignatures();
        } catch (error) {
            console.error('Error loading signatures:', error);
            this.showSignatureError();
        }
    }

    async fetchSignatures() {
        if (USE_MOCK_DATA) {
            // Return only user-submitted signatures from localStorage
            const mockSignatures = JSON.parse(localStorage.getItem('signatures') || '[]');
            return mockSignatures;
        }

        // Airtable fetch
        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tableName}?view=${AIRTABLE_CONFIG.viewName}&sort[0][field]=Timestamp&sort[0][direction]=desc`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.records.map(record => ({
            name: record.fields.Name,
            email: record.fields.Email,
            program: record.fields.Program,
            status: record.fields.Status,
            comments: record.fields.Comments || '',
            publicConsent: record.fields['Public Consent'],
            timestamp: record.fields.Timestamp
        }));
    }

    displaySignatures() {
        const container = document.getElementById('signaturesList');
        if (!container) return;

        const signaturesHtml = this.signatures
            .slice(0, this.displayedCount + this.loadMoreSize)
            .map(signature => this.createSignatureHTML(signature))
            .join('');

        container.innerHTML = signaturesHtml;
        this.displayedCount = Math.min(this.displayedCount + this.loadMoreSize, this.signatures.length);

        // Show/hide load more button
        const loadMoreContainer = document.querySelector('.load-more-container');
        if (loadMoreContainer) {
            loadMoreContainer.style.display = 
                this.displayedCount < this.signatures.length ? 'block' : 'none';
        }
    }

    loadMoreSignatures() {
        this.displaySignatures();
    }

    createSignatureHTML(signature) {
        const date = new Date(signature.timestamp).toLocaleDateString('en-AU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const commentsHtml = signature.comments 
            ? `<div class="signature-comment">"${signature.comments}"</div>` 
            : '';

        return `
            <div class="signature-item">
                <div class="signature-name">${this.escapeHtml(signature.name)}</div>
                <div class="signature-program">${this.escapeHtml(signature.program)}</div>
                <span class="signature-status">${this.escapeHtml(signature.status)}</span>
                ${commentsHtml}
                <div class="signature-date">Signed ${date}</div>
            </div>
        `;
    }

    updateSignatureCount() {
        const countElement = document.getElementById('signatureCount');
        if (countElement) {
            countElement.textContent = this.signatures.length;
        }
    }

    showSuccess() {
        const form = document.getElementById('signatureForm');
        const successMessage = document.getElementById('successMessage');
        
        if (form && successMessage) {
            form.style.display = 'none';
            successMessage.style.display = 'block';
            
            // Auto-hide success message and show form again after 5 seconds
            setTimeout(() => {
                form.style.display = 'block';
                successMessage.style.display = 'none';
            }, 5000);
        }
    }

    showError(message) {
        // Remove existing error messages
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // Create and show error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        const form = document.getElementById('signatureForm');
        if (form) {
            form.appendChild(errorDiv);
            
            // Auto-remove error after 5 seconds
            setTimeout(() => {
                errorDiv.remove();
            }, 5000);
        }
    }

    showSignatureError() {
        const container = document.getElementById('signaturesList');
        if (container) {
            container.innerHTML = `
                <div class="loading-signatures" style="color: #dc2626;">
                    Failed to load signatures. Please refresh the page to try again.
                </div>
            `;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new SignatureManager();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SignatureManager;
} 