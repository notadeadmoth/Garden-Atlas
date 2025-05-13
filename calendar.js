document.addEventListener('DOMContentLoaded', () => {
    const calendar = document.getElementById('calendar');
    const logInput = document.getElementById('log-input');
    const saveLogButton = document.getElementById('save-log');
    const logList = document.getElementById('log-list');

    let selectedDate = null;
    const logs = {}; // Store logs by date

    // Generate a simple calendar for the current month
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const dateButton = document.createElement('button');
        dateButton.textContent = day;
        dateButton.classList.add('calendar-day');

        dateButton.addEventListener('click', () => {
            selectedDate = `${year}-${month + 1}-${day}`;
            logInput.value = logs[selectedDate] || '';
            renderLogs();
        });

        calendar.appendChild(dateButton);
    }

    // Save log for the selected date
    saveLogButton.addEventListener('click', () => {
        if (selectedDate) {
            logs[selectedDate] = logInput.value;
            renderLogs();
        } else {
            alert('Please select a date first.');
        }
    });

    // Render logs for the selected date
    function renderLogs() {
        logList.innerHTML = '';
        if (selectedDate && logs[selectedDate]) {
            const logItem = document.createElement('li');
            logItem.textContent = logs[selectedDate];
            logList.appendChild(logItem);
        }
    }
});
