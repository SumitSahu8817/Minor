const classId = new URLSearchParams(window.location.search).get("class");
const list = document.getElementById("plannerList");

document.getElementById("generateBtn").onclick = async () => {
  const text = document.getElementById("prompt").value;
  const res = await api.post(`/planner/${classId}/save`, { prompt: text });
  render(res.plan);
};

async function load() {
  const res = await api.get(`/planner/${classId}`);
  if (res.plan) render(res.plan);
}

function render(plan) {
  list.innerHTML = "";
  plan.forEach((day, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <label>
        <input type="checkbox" data-day="${index}" ${day.done ? "checked" : ""}>
        <strong>Day ${index + 1}:</strong> ${day.topic}
      </label>
    `;
    list.appendChild(li);
  });

  list.querySelectorAll("input").forEach(cb => {
    cb.onchange = () => api.patch(`/planner/${classId}/toggle/${cb.dataset.day}`, { done: cb.checked });
  });
}

load();
