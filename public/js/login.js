// Check if already logged in
(function() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  if (token && role) {
    if (role === 'admin') {
      window.location.href = '/admin';
    } else {
      window.location.href = '/attendance';
    }
  }
})();

function showAlert(elementId, message) {
  const el = document.getElementById(elementId);
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 5000);
}

function showAdminLogin(e) {
  e.preventDefault();
  document.getElementById('teacherLoginForm').style.display = 'none';
  document.getElementById('adminLoginForm').style.display = 'block';
}

function showTeacherLogin(e) {
  e.preventDefault();
  document.getElementById('adminLoginForm').style.display = 'none';
  document.getElementById('teacherLoginForm').style.display = 'block';
}

async function teacherLogin() {
  const name = document.getElementById('teacherName').value.trim();
  const password = document.getElementById('teacherPassword').value;

  if (!name || !password) {
    showAlert('alertBox', 'Please enter your name and password.');
    return;
  }

  const btn = document.getElementById('btnTeacherLogin');
  btn.disabled = true;
  btn.textContent = 'Logging in...';

  try {
    const res = await fetch('/api/auth/teacher/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showAlert('alertBox', data.error || 'Login failed.');
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('role', 'teacher');
    localStorage.setItem('userName', data.name);
    window.location.href = '/attendance';
  } catch (err) {
    showAlert('alertBox', 'Network error. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Login';
  }
}

async function adminLogin() {
  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;

  if (!username || !password) {
    showAlert('adminAlertBox', 'Please enter username and password.');
    return;
  }

  const btn = document.getElementById('btnAdminLogin');
  btn.disabled = true;
  btn.textContent = 'Logging in...';

  try {
    const res = await fetch('/api/auth/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showAlert('adminAlertBox', data.error || 'Login failed.');
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('role', 'admin');
    localStorage.setItem('userName', data.username);
    window.location.href = '/admin';
  } catch (err) {
    showAlert('adminAlertBox', 'Network error. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Admin Login';
  }
}

// Enter key support
document.getElementById('teacherPassword').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') teacherLogin();
});
document.getElementById('adminPassword').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') adminLogin();
});
