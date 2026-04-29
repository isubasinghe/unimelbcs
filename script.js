// Signatures are pre-rendered into the HTML by build.py, so all this script
// has to do is wire up the "Copy link" button and prefer the native share
// sheet on mobile when it's available.

document.addEventListener('DOMContentLoaded', () => {
    // Hide the Sign-with-Google block until the worker URL has been wired up.
    const googleBtn = document.querySelector('.google-signin-btn');
    if (googleBtn && googleBtn.href.includes('WORKER_URL_PLACEHOLDER')) {
        const block = googleBtn.closest('.google-signin');
        const divider = block && block.nextElementSibling;
        if (block) block.style.display = 'none';
        if (divider && divider.classList.contains('signing-divider')) {
            divider.style.display = 'none';
        }
    }

    const copyBtn = document.getElementById('copyLinkBtn');
    if (!copyBtn) return;

    const url = copyBtn.dataset.url || window.location.href;
    const originalLabel = copyBtn.textContent;

    copyBtn.addEventListener('click', async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: document.title,
                    url,
                });
                return;
            } catch (err) {
                if (err && err.name === 'AbortError') return;
            }
        }

        try {
            await navigator.clipboard.writeText(url);
            copyBtn.textContent = 'Copied!';
            copyBtn.classList.add('copied');
        } catch {
            copyBtn.textContent = 'Copy failed';
        }

        setTimeout(() => {
            copyBtn.textContent = originalLabel;
            copyBtn.classList.remove('copied');
        }, 2000);
    });
});
