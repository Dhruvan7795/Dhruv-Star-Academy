// Auth check
const token = localStorage.getItem('token');
const role = localStorage.getItem('role');
const userName = localStorage.getItem('userName');

if (!token || role !== 'admin') {
  window.location.href = '/';
}

document.getElementById('userInfo').textContent = `Admin: ${userName}`;

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

let editingStudentId = null;
let editingTeacherId = null;

function logout() {
  localStorage.clear();
  window.location.href = '/';
}

function showAlertEl(elId, message) {
  const el = document.getElementById(elId);
  el.textContent = message;
  el.className = 'alert alert-error show';
  setTimeout(() => el.classList.remove('show'), 5000);
}

function showSuccessEl(elId, message) {
  const el = document.getElementById(elId);
  el.textContent = message;
  el.className = 'alert alert-success show';
  setTimeout(() => el.classList.remove('show'), 4000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== TABS ====================

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

  event.target.classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');

  if (tabName === 'students') loadStudents();
  if (tabName === 'teachers') loadTeachers();
  if (tabName === 'attendance') {
    document.getElementById('historyDate').value = new Date().toISOString().split('T')[0];
    loadAttendanceHistory();
  }
}

// ==================== STUDENTS ====================

function onAddClassChange() {
  const cls = document.getElementById('addStudentClass').value;
  document.getElementById('addBoardGroup').style.display = parseInt(cls) >= 8 ? 'block' : 'none';
}

function onFilterClassChange() {
  const cls = document.getElementById('filterClass').value;
  document.getElementById('filterBoardGroup').style.display = parseInt(cls) >= 8 ? 'block' : 'none';
  loadStudents();
}

async function loadStudents() {
  const cls = document.getElementById('filterClass').value;
  const board = document.getElementById('filterBoard')?.value || '';

  let url = '/api/students';
  const params = [];
  if (cls) params.push(`class=${encodeURIComponent(cls)}`);
  if (board) params.push(`board=${encodeURIComponent(board)}`);
  if (params.length) url += '?' + params.join('&');

  try {
    const res = await fetch(url, { headers: API_HEADERS });
    if (res.status === 401 || res.status === 403) { logout(); return; }
    const students = await res.json();

    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';

    if (students.length === 0) {
      document.getElementById('studentsEmpty').style.display = 'block';
    } else {
      document.getElementById('studentsEmpty').style.display = 'none';
      students.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${s.sl_no}</td>
          <td><strong>${escapeHtml(s.name)}</strong></td>
          <td>${escapeHtml(s.contact_number)}</td>
          <td>Class ${s.class}</td>
          <td>${s.board}</td>
          <td>
            <div class="action-btns">
              <button class="btn btn-primary btn-sm" onclick="editStudent(${s.id})">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteStudent(${s.id}, '${escapeHtml(s.name)}')">Delete</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    showAlertEl('studentAlert', 'Failed to load students.');
  }
}

async function addStudent() {
  const sl_no = document.getElementById('addStudentSlNo').value;
  const name = document.getElementById('addStudentName').value.trim();
  const contact_number = document.getElementById('addStudentContact').value.trim();
  const studentClass = document.getElementById('addStudentClass').value;
  const board = document.getElementById('addStudentBoard')?.value || '';

  if (!sl_no || !name || !contact_number || !studentClass) {
    showAlertEl('studentAlert', 'Please fill all required fields.');
    return;
  }

  try {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ sl_no: parseInt(sl_no), name, contact_number, class: studentClass, board })
    });

    const data = await res.json();

    if (!res.ok) {
      showAlertEl('studentAlert', data.error);
      return;
    }

    showSuccessEl('studentSuccess', 'Student added successfully!');
    // Clear form
    document.getElementById('addStudentSlNo').value = '';
    document.getElementById('addStudentName').value = '';
    document.getElementById('addStudentContact').value = '';
    document.getElementById('addStudentClass').value = '';
    document.getElementById('addBoardGroup').style.display = 'none';
    loadStudents();
  } catch (err) {
    showAlertEl('studentAlert', 'Network error.');
  }
}

async function editStudent(id) {
  editingStudentId = id;
  try {
    const res = await fetch(`/api/students/${id}`, { headers: API_HEADERS });
    const student = await res.json();

    document.getElementById('editStudentSlNo').value = student.sl_no;
    document.getElementById('editStudentName').value = student.name;
    document.getElementById('editStudentContact').value = student.contact_number;
    document.getElementById('editStudentClass').value = student.class;

    onEditClassChange();
    document.getElementById('editStudentBoard').value = student.board;

    document.getElementById('editStudentModal').classList.add('show');
  } catch (err) {
    showAlertEl('studentAlert', 'Failed to load student details.');
  }
}

function onEditClassChange() {
  const cls = document.getElementById('editStudentClass').value;
  document.getElementById('editBoardGroup').style.display = parseInt(cls) >= 8 ? 'block' : 'none';
}

async function saveStudent() {
  const sl_no = parseInt(document.getElementById('editStudentSlNo').value);
  const name = document.getElementById('editStudentName').value.trim();
  const contact_number = document.getElementById('editStudentContact').value.trim();
  const studentClass = document.getElementById('editStudentClass').value;
  const board = document.getElementById('editStudentBoard').value;

  try {
    const res = await fetch(`/api/students/${editingStudentId}`, {
      method: 'PUT',
      headers: API_HEADERS,
      body: JSON.stringify({ sl_no, name, contact_number, class: studentClass, board })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error);
      return;
    }

    closeModal('editStudentModal');
    showSuccessEl('studentSuccess', 'Student updated successfully!');
    loadStudents();
  } catch (err) {
    alert('Failed to update student.');
  }
}

async function deleteStudent(id, name) {
  if (!confirm(`Are you sure you want to delete student "${name}"? This cannot be undone.`)) return;

  try {
    const res = await fetch(`/api/students/${id}`, {
      method: 'DELETE',
      headers: API_HEADERS
    });

    if (!res.ok) {
      const data = await res.json();
      showAlertEl('studentAlert', data.error);
      return;
    }

    showSuccessEl('studentSuccess', 'Student deleted.');
    loadStudents();
  } catch (err) {
    showAlertEl('studentAlert', 'Failed to delete student.');
  }
}

// ==================== TEACHERS ====================

async function loadTeachers() {
  try {
    const res = await fetch('/api/teachers', { headers: API_HEADERS });
    if (res.status === 401 || res.status === 403) { logout(); return; }
    const teachers = await res.json();

    const tbody = document.getElementById('teachersTableBody');
    tbody.innerHTML = '';

    if (teachers.length === 0) {
      document.getElementById('teachersEmpty').style.display = 'block';
    } else {
      document.getElementById('teachersEmpty').style.display = 'none';
      teachers.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${t.id}</td>
          <td><strong>${escapeHtml(t.name)}</strong></td>
          <td>${new Date(t.created_at).toLocaleDateString('en-IN')}</td>
          <td>
            <div class="action-btns">
              <button class="btn btn-primary btn-sm" onclick="editTeacher(${t.id}, '${escapeHtml(t.name)}')">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteTeacher(${t.id}, '${escapeHtml(t.name)}')">Delete</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    showAlertEl('teacherAlert', 'Failed to load teachers.');
  }
}

async function addTeacher() {
  const name = document.getElementById('addTeacherName').value.trim();
  const password = document.getElementById('addTeacherPassword').value;

  if (!name || !password) {
    showAlertEl('teacherAlert', 'Name and password are required.');
    return;
  }

  try {
    const res = await fetch('/api/teachers', {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ name, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showAlertEl('teacherAlert', data.error);
      return;
    }

    showSuccessEl('teacherSuccess', 'Teacher added successfully!');
    document.getElementById('addTeacherName').value = '';
    document.getElementById('addTeacherPassword').value = '';
    loadTeachers();
  } catch (err) {
    showAlertEl('teacherAlert', 'Network error.');
  }
}

function editTeacher(id, name) {
  editingTeacherId = id;
  document.getElementById('editTeacherName').value = name;
  document.getElementById('editTeacherPassword').value = '';
  document.getElementById('editTeacherModal').classList.add('show');
}

async function saveTeacher() {
  const name = document.getElementById('editTeacherName').value.trim();
  const password = document.getElementById('editTeacherPassword').value;

  try {
    const res = await fetch(`/api/teachers/${editingTeacherId}`, {
      method: 'PUT',
      headers: API_HEADERS,
      body: JSON.stringify({ name, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error);
      return;
    }

    closeModal('editTeacherModal');
    showSuccessEl('teacherSuccess', 'Teacher updated successfully!');
    loadTeachers();
  } catch (err) {
    alert('Failed to update teacher.');
  }
}

async function deleteTeacher(id, name) {
  if (!confirm(`Are you sure you want to delete teacher "${name}"? This cannot be undone.`)) return;

  try {
    const res = await fetch(`/api/teachers/${id}`, {
      method: 'DELETE',
      headers: API_HEADERS
    });

    if (!res.ok) {
      const data = await res.json();
      showAlertEl('teacherAlert', data.error);
      return;
    }

    showSuccessEl('teacherSuccess', 'Teacher deleted.');
    loadTeachers();
  } catch (err) {
    showAlertEl('teacherAlert', 'Failed to delete teacher.');
  }
}

// ==================== ATTENDANCE HISTORY ====================

async function loadAttendanceHistory() {
  const date = document.getElementById('historyDate').value;
  const cls = document.getElementById('historyClass').value;

  const params = [];
  if (date) params.push(`date=${date}`);
  if (cls) params.push(`class=${encodeURIComponent(cls)}`);

  const url = '/api/attendance/history' + (params.length ? '?' + params.join('&') : '');

  try {
    const res = await fetch(url, { headers: API_HEADERS });
    const records = await res.json();

    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';

    if (records.length === 0) {
      document.getElementById('historyEmpty').style.display = 'block';
    } else {
      document.getElementById('historyEmpty').style.display = 'none';
      records.forEach(r => {
        const badgeClass = r.status === 'Present' ? 'badge-present' : r.status === 'Absent' ? 'badge-absent' : 'badge-late';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${r.sl_no}</td>
          <td>${escapeHtml(r.student_name)}</td>
          <td>Class ${r.class}</td>
          <td>${r.board}</td>
          <td><span class="badge ${badgeClass}">${r.status}</span></td>
          <td>${escapeHtml(r.teacher_name)}</td>
          <td>${r.date}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error('Failed to load attendance history:', err);
  }
}

// ==================== MODALS ====================

function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('show');
    }
  });
});

// ==================== INIT ====================
loadStudents();
