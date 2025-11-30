import type { PlasmoCSConfig } from 'plasmo';

export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'],
  run_at: 'document_idle',
};

// Content script for autofill functionality
// This runs on every page and detects login forms

interface FormField {
  element: HTMLInputElement;
  type: 'username' | 'password' | 'email';
}

function findLoginForms(): FormField[] {
  const fields: FormField[] = [];

  // Find password fields
  const passwordInputs = document.querySelectorAll<HTMLInputElement>(
    'input[type="password"]'
  );

  passwordInputs.forEach((passwordInput) => {
    fields.push({ element: passwordInput, type: 'password' });

    // Look for username/email field before the password field
    const form = passwordInput.closest('form');
    if (form) {
      const usernameInput = form.querySelector<HTMLInputElement>(
        'input[type="text"], input[type="email"], input[name*="user"], input[name*="email"], input[id*="user"], input[id*="email"]'
      );
      if (usernameInput) {
        fields.push({
          element: usernameInput,
          type: usernameInput.type === 'email' ? 'email' : 'username',
        });
      }
    }
  });

  return fields;
}

function addAutofillIcon(field: FormField) {
  // Add a small icon next to the input field for autofill
  const icon = document.createElement('div');
  icon.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b39272" stroke-width="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  `;
  icon.style.cssText = `
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    z-index: 9999;
    opacity: 0.7;
    transition: opacity 0.2s;
  `;
  icon.addEventListener('mouseenter', () => {
    icon.style.opacity = '1';
  });
  icon.addEventListener('mouseleave', () => {
    icon.style.opacity = '0.7';
  });
  icon.addEventListener('click', () => {
    // TODO: Open popup or fill from vault
    console.log('BirchVault: Autofill requested for', field.type);
  });

  // Position the icon relative to the input
  const inputRect = field.element.getBoundingClientRect();
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position: relative; display: inline-block;';
  
  field.element.parentNode?.insertBefore(wrapper, field.element);
  wrapper.appendChild(field.element);
  wrapper.appendChild(icon);
}

// Initialize autofill detection
function init() {
  const fields = findLoginForms();
  
  if (fields.length > 0) {
    console.log('BirchVault: Found', fields.length, 'login fields');
    // For now, just log - full implementation would add icons
    // fields.forEach(addAutofillIcon);
  }
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Watch for dynamic forms
const observer = new MutationObserver(() => {
  // Debounce
  setTimeout(init, 500);
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});







