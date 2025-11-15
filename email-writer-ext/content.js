console.log("Email Writer Extension - Content Script Loaded");

// --- Create AI Button ---
function createAIButton() {
    const button = document.createElement('div');
    button.className = 'T-I J-J5-Ji aoO v7 T-I-atl L3';
    button.style.marginRight = '8px';
    button.innerHTML = 'AI Reply';
    button.setAttribute('role', 'button');
    button.setAttribute('data-tooltip', 'Generate AI Reply');
    return button;
}

// --- Create Tone Selector Dropdown ---
function createToneSelector() {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.marginRight = '8px';
    wrapper.style.zIndex = '99999';

    const select = document.createElement('select');
    select.className = 'ai-tone-selector';
    select.style.padding = '4px 6px';
    select.style.borderRadius = '6px';
    select.style.border = '1px solid #ccc';
    select.style.cursor = 'pointer';
    select.style.outline = 'none';
    select.style.background = '#fff';
    select.style.color = '#000';
    select.style.zIndex = '99999';
    select.style.position = 'relative';
    select.style.fontSize = '13px';
    select.style.maxHeight = '32px';
    select.style.userSelect = 'auto';
    select.style.pointerEvents = 'auto';

    const tones = [
        { value: 'professional', label: 'Professional' },
        { value: 'friendly', label: 'Friendly' },
        { value: 'casual', label: 'Casual' },
        { value: 'empathetic', label: 'Empathetic' },
        { value: 'polite', label: 'Polite' },
        { value: 'concise', label: 'Concise' },
        { value: 'apologetic', label: 'Apologetic' }
    ];

    // Load last selected tone (if stored)
    const savedTone = localStorage.getItem('selectedTone') || 'professional';

    tones.forEach(t => {
        const option = document.createElement('option');
        option.value = t.value;
        option.textContent = t.label;
        if (t.value === savedTone) option.selected = true;
        select.appendChild(option);
    });

    // Save selected tone for next time
    select.addEventListener('change', () => {
        localStorage.setItem('selectedTone', select.value);
    });

    wrapper.appendChild(select);
    return wrapper;
}

// --- Extract email content ---
function getEmailContent() {
    const selectors = [
        '.h7',
        '.a3s.aiL',
        '.gmail_quote',
        '[role="presentation"]'
    ];
    for (const selector of selectors) {
        const content = document.querySelector(selector);
        if (content) {
            return content.innerText.trim();
        }
    }
    return '';
}

// --- Find compose toolbar ---
function findComposeToolbar() {
    const selectors = [
        '.btC',
        '.aDh',
        '[role="toolbar"]',
        '.gU.Up'
    ];
    for (const selector of selectors) {
        const toolbar = document.querySelector(selector);
        if (toolbar) {
            return toolbar;
        }
    }
    return null;
}

// --- Inject the tone selector and button ---
function injectButton() {
    const existingButton = document.querySelector('.ai-reply-button');
    if (existingButton) existingButton.remove();

    const existingTone = document.querySelector('.ai-tone-selector');
    if (existingTone) existingTone.parentElement.remove();

    const toolbar = findComposeToolbar();
    if (!toolbar) {
        console.log("Toolbar not found");
        return;
    }

    console.log("Toolbar found, creating AI button and tone selector");

    const toneSelectorWrapper = createToneSelector();
    const toneSelector = toneSelectorWrapper.querySelector('select');
    const button = createAIButton();
    button.classList.add('ai-reply-button');

    // Prevent Gmail from blocking dropdown click
    toneSelector.addEventListener('mousedown', e => e.stopPropagation());
    toneSelector.addEventListener('click', e => e.stopPropagation());

    toolbar.insertBefore(button, toolbar.firstChild);
    toolbar.insertBefore(toneSelectorWrapper, button);

    button.addEventListener('click', async () => {
        try {
            const selectedTone = toneSelector.value;
            button.innerHTML = 'Generating...';
            button.disabled = true;

            const emailContent = getEmailContent();
            console.log("Extracted Email Content:", emailContent);

            const response = await fetch('http://localhost:8080/api/email/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    emailContent: emailContent,
                    tone: selectedTone
                })
            });

            if (!response.ok) {
                throw new Error('API Request Failed');
            }

            const generatedReply = await response.text();
            const composeBox = document.querySelector('[role="textbox"][g_editable="true"]');

            if (composeBox) {
                composeBox.focus();
                document.execCommand('insertText', false, generatedReply);
            } else {
                console.error('Compose box not found');
            }
        } catch (error) {
            console.error("Error generating AI reply:", error);
            alert('Failed to generate reply');
        } finally {
            button.innerHTML = 'AI Reply';
            button.disabled = false;
        }
    });
}

// --- Observe DOM changes (detect compose window) ---
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        const addedNodes = Array.from(mutation.addedNodes);
        const hasComposeElement = addedNodes.some(node =>
            node.nodeType === Node.ELEMENT_NODE &&
            (node.matches('.aDh,.btC,[role="dialog"]') ||
                node.querySelector?.('.aDh,.btC,[role="dialog"]'))
        );
        if (hasComposeElement) {
            console.log("Compose Window Detected");
            setTimeout(injectButton, 500);
        }
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
