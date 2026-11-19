import { login, register, getMe } from './api.js';
import { initNav } from './nav.js';

const form = document.getElementById('auth-form');
const errorBox = document.getElementById('form-error');
const submitBtn = document.getElementById('submit-btn');
const isRegister = form.dataset.mode === 'register';

// Where to go after success. Only local paths are allowed (prevents open redirects).
function destination() {
  const next = new URLSearchParams(window.location.search).get('next');
  if (next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')) {
    return next;
  }
  return '/';
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = !message;
}

// Quick checks before calling the server (the server validates again)
function validate(d) {
  if (isRegister && !d.name) return 'Please enter your name.';
  if (!/^\S+@\S+\.\S+$/.test(d.email)) return 'Please enter a valid email address.';
  if (!d.password) return 'Please enter your password.';
  if (isRegister && d.password.length < 8) return 'Password must be at least 8 characters.';
  if (isRegister && d.password.length > 72) return 'Password must be at most 72 characters.';
  if (isRegister && d.password !== d.confirm) return 'Passwords do not match.';
  return '';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('');

  const fields = new FormData(form);
  const data = {
    name: (fields.get('name') || '').trim(),
    email: (fields.get('email') || '').trim(),
    password: fields.get('password') || '',
    confirm: fields.get('confirm') || '',
  };

  const problem = validate(data);
  if (problem) {
    showError(problem);
    return;
  }

  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = 'Please wait...';

  try {
    if (isRegister) {
      await register({ email: data.email, name: data.name, password: data.password });
    } else {
      await login({ email: data.email, password: data.password });
    }
    window.location.href = destination();
  } catch (err) {
    showError(err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});

// Keep the "next" target when switching between login and register
const altLink = document.getElementById('alt-link');
const nextParam = new URLSearchParams(window.location.search).get('next');
if (altLink && nextParam) {
  altLink.href += `?next=${encodeURIComponent(nextParam)}`;
}

// Already logged in? Nothing to do here.
initNav();
getMe()
  .then((user) => {
    if (user) window.location.replace(destination());
  })
  .catch(() => {});
  