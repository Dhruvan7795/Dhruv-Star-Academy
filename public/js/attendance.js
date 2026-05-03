// Auth check
const token = localStorage.getItem('token');
const role = localStorage.getItem('role');
const userName = localStorage.getItem('userName');

if (!token || (role !== 'teacher' && role !== 'admin')) {
  window.location.href = '/';
}

document.getElementById('userInfo').textContent = `Welcome, ${userName}`;

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

let currentStudents = [];
let attendanceData = {};

function logout() {
  localStorage.clear();
  window.location.href = '/';
}

function showAlert(msg) {
  const el = document.getElementById('alertBox');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 5000);
}

function onClassChange() {
  const cls = document.getElementById('selectClass').value;
  const boardGroup = document.getElementById('boardGroup');
  if (cls === '8' || cls === '9' || cls === '10') {
    boardGroup.style.display = 'block';
  } else {
    boardGroup.style.display = 'none';
    document.getElementById('selectBoard').value = '';
  }
}

async function loadStudents() {
  const cls = document.getElementById('selectClass').value;
  const board = document.getElementById('selectBoard').value;

  if (!cls) {
    alert('Please select a class.');
    return;
  }

  if ((cls === '8' || cls === '9' || cls === '10') && !board) {
    alert('Please select a board for classes 8-10.');
    return;
  }

  let url = `/api/students?class=${encodeURIComponent(cls)}`;
  if (board) url += `&board=${encodeURIComponent(board)}`;

  try {
    const res = await fetch(url, { headers: API_HEADERS });

    if (res.status === 401 || res.status === 403) {
      logout();
      return;
    }

    currentStudents = await res.json();
    attendanceData = {};

    const tbody = document.getElementById('studentTableBody');
    tbody.innerHTML = '';

    const classLabel = `Class ${cls}` + (board ? ` - ${board}` : '');
    document.getElementById('classLabel').textContent = classLabel;
    document.getElementById('dateLabel').textContent = `(${new Date().toLocaleDateString('en-IN')})`;

    if (currentStudents.length === 0) {
      document.getElementById('emptyState').style.display = 'block';
      document.getElementById('submitSection').style.display = 'none';
    } else {
      document.getElementById('emptyState').style.display = 'none';
      document.getElementById('submitSection').style.display = 'block';

      currentStudents.forEach((student, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${student.sl_no}</td>
          <td><strong>${escapeHtml(student.name)}</strong></td>
          <td>
            <div class="attendance-options">
              <label class="present">
                <input type="radio" name="att_${student.id}" value="Present" onchange="markAttendance(${student.id}, 'Present')">
                <span>Present</span>
              </label>
              <label class="absent">
                <input type="radio" name="att_${student.id}" value="Absent" onchange="markAttendance(${student.id}, 'Absent')">
                <span>Absent</span>
              </label>
              <label class="late">
                <input type="radio" name="att_${student.id}" value="Late" onchange="markAttendance(${student.id}, 'Late')">
                <span>Late</span>
              </label>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    document.getElementById('attendanceCard').style.display = 'block';
    document.getElementById('resultsCard').style.display = 'none';
    document.getElementById('btnSubmit').disabled = true;

  } catch (err) {
    alert('Failed to load students. Please try again.');
  }
}

function markAttendance(studentId, status) {
  attendanceData[studentId] = status;
  // Enable submit only when all students are marked
  const allMarked = currentStudents.every(s => attendanceData[s.id]);
  document.getElementById('btnSubmit').disabled = !allMarked;
}

async function submitAttendance() {
  const cls = document.getElementById('selectClass').value;
  const board = document.getElementById('selectBoard').value;

  const attendance = currentStudents.map(s => ({
    student_id: s.id,
    status: attendanceData[s.id]
  }));

  const btn = document.getElementById('btnSubmit');
  btn.disabled = true;
  btn.textContent = '⏳ Submitting & Sending Messages...';

  try {
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ attendance, class: cls, board: board || 'N/A' })
    });

    const data = await res.json();

    if (!res.ok) {
      showAlert(data.error || 'Failed to submit attendance.');
      btn.disabled = false;
      btn.textContent = '✅ Submit Attendance & Send SMS';
      return;
    }

    // Show results
    const summary = document.getElementById('resultsSummary');
    summary.innerHTML = '';

    data.results.forEach(r => {
      const badgeClass = r.status === 'Present' ? 'badge-present' : r.status === 'Absent' ? 'badge-absent' : 'badge-late';
      const div = document.createElement('div');
      div.className = 'result-item';
      div.innerHTML = `
        <span>${escapeHtml(r.student)}</span>
        <div>
          <span class="badge ${badgeClass}">${r.status}</span>
          <span class="badge badge-sent">${r.demo ? '📱 Demo' : '📱 SMS Sent'}</span>
        </div>
      `;
      summary.appendChild(div);
    });

    document.getElementById('attendanceCard').style.display = 'none';
    document.getElementById('resultsCard').style.display = 'block';

  } catch (err) {
    showAlert('Network error. Please try again.');
    btn.disabled = false;
    btn.textContent = '✅ Submit Attendance & Send SMS';
  }
}

function resetPage() {
  document.getElementById('selectClass').value = '';
  document.getElementById('selectBoard').value = '';
  document.getElementById('boardGroup').style.display = 'none';
  document.getElementById('attendanceCard').style.display = 'none';
  document.getElementById('resultsCard').style.display = 'none';
  currentStudents = [];
  attendanceData = {};
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
