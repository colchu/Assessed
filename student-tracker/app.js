// The base URL of our backend server
// This allows the frontend to communicate with the Node/Express API.
const API_URL = 'http://localhost:3001/api';


// --- UNIVERSAL CODE ---
// This event ensures the JS only runs once the page's HTML is fully loaded.
document.addEventListener('DOMContentLoaded', () => {
    // If the page has an element with id="studentList", we're on the main list page.
    if (document.getElementById('studentList')) {
        runStudentListPage();

    // If the page has an element with id="studentName", we're on a student detail page.
    } else if (document.getElementById('studentName')) {
        runStudentDetailPage();
    }
});


// --- PAGE 1: STUDENT LIST LOGIC ---
// Handles displaying, filtering, and now sorting all students.
async function runStudentListPage() {
    // References to input elements for searching, filtering, and sorting.
    const searchInput = document.getElementById('searchInput');
    const blockFilter = document.getElementById('blockFilter');

    // NEW FEATURE: Sorting dropdown (you’ll need a <select id="sortOption"> in HTML)
    const sortOption = document.getElementById('sortOption');
    
    // Fetch all students from our backend API.
    // The backend should respond with an array of student objects.
    const allStudents = await fetch(`${API_URL}/students`).then(res => res.json());

    // Function to display a given list of students in the <ul> element.
    function renderStudents(studentArray) {
        const studentList = document.getElementById('studentList');
        studentList.innerHTML = ''; // Clear the list before rendering new items.

        // Show a message if no students match the search/filter.
        if (studentArray.length === 0) {
            studentList.innerHTML = '<li>No students found.</li>';
            return;
        }

        // Create a list item for each student with name and block info.
        studentArray.forEach(student => {
            const li = document.createElement('li');
            li.innerHTML = `
                <a href="student.html?id=${student.id}">${student.name}</a>
                <span>Block ${student.block}</span>
            `;
            studentList.appendChild(li);
        });
    }

    // Filters and sorts the student list by search term, block, and selected order.
    function filterSortAndSearch() {
        // Start with a copy of the full list.
        let filteredStudents = [...allStudents];

        const searchTerm = searchInput.value.toLowerCase();
        const selectedBlock = blockFilter.value;
        const sortValue = sortOption.value; // "az", "za", "block"

        // Filter by name (case-insensitive).
        if (searchTerm) {
            filteredStudents = filteredStudents.filter(s => s.name.toLowerCase().includes(searchTerm));
        }

        // Filter by block if a specific one is selected.
        if (selectedBlock !== 'all') {
            filteredStudents = filteredStudents.filter(s => s.block == selectedBlock);
        }

        // NEW FEATURE: Sorting logic
        if (sortValue === 'az') {
            filteredStudents.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortValue === 'za') {
            filteredStudents.sort((a, b) => b.name.localeCompare(a.name));
        } else if (sortValue === 'block') {
            filteredStudents.sort((a, b) => a.block - b.block);
        }

        // Display the filtered + sorted results.
        renderStudents(filteredStudents);
    }

    // Re-run filter every time user types, changes block, or selects a sort option.
    searchInput.addEventListener('input', filterSortAndSearch);
    blockFilter.addEventListener('change', filterSortAndSearch);
    sortOption.addEventListener('change', filterSortAndSearch);

    // Initial render of all students when the page loads.
    renderStudents(allStudents);
}


// --- PAGE 2: STUDENT DETAIL LOGIC ---
// Handles viewing and updating an individual student's information.
async function runStudentDetailPage() {
    // Extracts the 'id' query parameter from the page URL (e.g., student.html?id=123)
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('id');

    // Fetch all students again (simpler backend).
    // Ideally, we'd have a dedicated endpoint like `/students/:id`
    const allStudents = await fetch(`${API_URL}/students`).then(res => res.json());
    const student = allStudents.find(s => s.id === studentId);

    // If no matching student is found, show an error message.
    if (!student) {
        document.querySelector('.container').innerHTML = '<h1>Student not found.</h1><a href="index.html">Back to list</a>';
        return;
    }

    // Populate student info on the page.
    document.getElementById('studentName').textContent = student.name;
    document.getElementById('studentBlock').textContent = `Block ${student.block}`;
    document.getElementById('googleDriveButton').href = student.googleDriveUrl;

    // --- MASTERY ASSIGNMENT STATUS DROPDOWNS ---
    const maContainer = document.getElementById('ma-container');
    const maOptions = ['To be Graded', 'Graded', 'Need to Reassess'];
    maContainer.innerHTML = '';

    // Dynamically create a dropdown for each MA (mastery assignment).
    for (const maKey in student.ma_statuses) {
        const currentStatus = student.ma_statuses[maKey];
        const maItem = document.createElement('div');
        maItem.className = 'ma-item';
        
        // Build <option> elements, marking the current status as selected.
        let optionsHtml = '';
        maOptions.forEach(option => {
            const selected = (option === currentStatus) ? 'selected' : '';
            optionsHtml += `<option value="${option}" ${selected}>${option}</option>`;
        });

        // Label + dropdown for each MA.
        maItem.innerHTML = `
            <label>${maKey}</label>
            <select data-ma-key="${maKey}">${optionsHtml}</select>
        `;
        maContainer.appendChild(maItem);
    }
    
    // Listen for changes in any MA dropdown and update the backend.
    maContainer.querySelectorAll('select').forEach(selectElement => {
        selectElement.addEventListener('change', async (event) => {
            const maKey = event.target.dataset.maKey;
            const newStatus = event.target.value;
            
            // Send update to backend (POST request with JSON body).
            await fetch(`${API_URL}/students/update-ma`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: student.id,
                    maKey: maKey,
                    newStatus: newStatus
                })
            });

            // (Optional) Add user feedback, e.g., a "Saved!" notification.
        });
    });

    // --- RUBRIC CHART (VISUALIZATION) ---
    // Creates a sample bar chart using Chart.js to represent rubric mastery levels.
    const ctx = document.getElementById('rubricChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Collaboration', 'Critical Thinking', 'Communication', 'Problem Solving', 'Creativity'],
            datasets: [{
                label: 'Mastery Level (out of 4)',
                data: [1, 3, 2, 4, 3],  // Example data — replace with real scores if available.
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: { 
            scales: { 
                y: { 
                    beginAtZero: true, 
                    max: 4, 
                    ticks: { stepSize: 1 } 
                } 
            } 
        }
    });
}