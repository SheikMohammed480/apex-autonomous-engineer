const tasks = [];

function addTask(taskName) {
  tasks.push({ name: taskName, completed: false });
}

function updateStatsBar() {
  const statsContainer = document.getElementById('stats-container');
  statsContainer.innerHTML = `Tasks: ${tasks.length}`;
}

window.onload = function() {
  addTask('Create new Task');
  updateStatsBar();
};
