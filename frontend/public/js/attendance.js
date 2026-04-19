const url = new URLSearchParams(window.location.search);
const classId = url.get("class");

async function loadStudents() {
  const data = await api.get(`/attendance/${classId}`);
  const tbody = document.querySelector("#studentTable tbody");
  tbody.innerHTML = "";
  data.students.forEach(stu => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${stu.name}</td>
      <td><input type="checkbox" data-id="${stu.id}" ${stu.present ? "checked" : ""}></td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById("attendanceForm").onsubmit = async e => {
  e.preventDefault();
  const records = [...document.querySelectorAll("input[type=checkbox]")].map(cb => ({
    id: cb.dataset.id,
    present: cb.checked,
  }));
  await api.post(`/attendance/${classId}/submit`, { records });
  alert("Attendance saved!");
};

loadStudents();
