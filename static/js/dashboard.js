document.addEventListener('DOMContentLoaded', function () {
    console.log("DOM content loaded");
    initializeBadges();

    const ctx = document.getElementById('performanceChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Correct', 'Incorrect'],
            datasets: [{
                data: [correct_count, incorrect_count],
                backgroundColor: ['#4CAF50', '#FF9800'],
                borderColor: ['#45a049', '#e68a00'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                title: {
                    display: true,
                    text: 'Your Performance'
                }
            }
        }
    });

    gsap.from(".dashboard-section", {
        duration: 1,
        y: 50,
        opacity: 0,
        stagger: 0.2,
        ease: "power3.out"
    });

    gsap.from(".badge", {
        duration: 0.5,
        scale: 0,
        opacity: 0,
        stagger: 0.1,
        ease: "back.out(1.7)"
    });

    createCategoryChart();
    startBadgeFlipAnimation();
});

function initializeBadges() {
    const correctAnswersElement = document.querySelector('.performance-stat .number');
    const correct_count = parseInt(correctAnswersElement.textContent);
    console.log("Initializing badges, current correct count:", correct_count);

    const badges = document.querySelectorAll('.badge');
    badges.forEach(badge => {
        const requiredCount = parseInt(badge.dataset.required);
        console.log(`Badge ${badge.dataset.level} requires ${requiredCount}`);
        if (correct_count >= requiredCount) {
            console.log(`Activating badge ${badge.dataset.level}`);
            badge.classList.add('active');
            badge.style.opacity = '1';
            badge.style.transform = 'scale(1.1)';
        } else {
            console.log(`Deactivating badge ${badge.dataset.level}`);
            badge.classList.remove('active');
            badge.style.opacity = '0.5';
            badge.style.transform = 'scale(1)';
        }
    });
}

function startBadgeFlipAnimation() {
    const badges = document.querySelectorAll('.badge');
    badges.forEach(badge => {
        setInterval(() => {
            if (Math.random() < 0.3) {
                flipBadge(badge);
            }
        }, 2000 + Math.random() * 3000);
    });
}

function flipBadge(badge) {
    gsap.to(badge, {
        rotationY: 180,
        duration: 0.5,
        ease: "power2.inOut",
        onComplete: () => {
            gsap.to(badge, {
                rotationY: 0,
                duration: 0.5,
                ease: "power2.inOut"
            });
        }
    });
}

let isParentMode = false;
const modal = document.getElementById("passwordModal");
const modalTitle = document.getElementById("modalTitle");
const passwordForm = document.getElementById("passwordForm");
const closeBtn = document.getElementsByClassName("close")[0];

function toggleParentMode() {
    if (!isParentMode) {
        modalTitle.textContent = "Enter Parent Mode Password";
        modal.style.display = "block";
    } else {
        document.getElementById("parentDashboard").style.display = "none";
        isParentMode = false;
    }
}

passwordForm.onsubmit = function(event) {
    event.preventDefault();
    const password = document.getElementById("parentPassword").value;
    fetch("/verify_parent_password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: password }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            modal.style.display = "none";
            document.getElementById("parentDashboard").style.display = "block";
            isParentMode = true;
            updateParentDashboard();
        } else {
            alert("Incorrect password. Please try again.");
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert("An error occurred. Please try again.");
    });
};

closeBtn.onclick = function() {
    modal.style.display = "none";
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

function createCategoryChart() {
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    const categoryCorrect = JSON.parse(document.getElementById('categoryCorrectData').textContent);
    const categoryIncorrect = JSON.parse(document.getElementById('categoryIncorrectData').textContent);
    
    new Chart(categoryCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(categoryCorrect),
            datasets: [{
                label: 'Correct',
                data: Object.values(categoryCorrect),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }, {
                label: 'Incorrect',
                data: Object.values(categoryIncorrect),
                backgroundColor: 'rgba(255, 99, 132, 0.6)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                },
                y: {
                    stacked: true
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Performance by Category'
                }
            }
        }
    });
}

function updateParentDashboard() {
    const strengths = document.getElementById("strengths");
    const improvements = document.getElementById("improvements");
    strengths.innerHTML = "";
    improvements.innerHTML = "";

    const categoryCorrect = JSON.parse(document.getElementById('categoryCorrectData').textContent);
    const categoryIncorrect = JSON.parse(document.getElementById('categoryIncorrectData').textContent);

    const categories = Object.keys(categoryCorrect);
    categories.forEach(category => {
        const correct = categoryCorrect[category];
        const incorrect = categoryIncorrect[category];
        const total = correct + incorrect;
        const percentage = total > 0 ? (correct / total) * 100 : 0;

        const listItem = document.createElement("li");
        listItem.textContent = `${category}: ${percentage.toFixed(2)}% correct`;

        if (percentage >= 70) {
            strengths.appendChild(listItem);
        } else {
            improvements.appendChild(listItem);
        }
    });
}

document.getElementById("goalSettingForm").onsubmit = function(event) {
    event.preventDefault();
    const dailyTarget = document.getElementById("dailyTarget").value;
    const weeklyTarget = document.getElementById("weeklyTarget").value;
    const monthlyTarget = document.getElementById("monthlyTarget").value;

    fetch("/update_goals", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            daily_target: dailyTarget,
            weekly_target: weeklyTarget,
            monthly_target: monthlyTarget
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("Goals updated successfully!");
        } else {
            alert("Failed to update goals. Please try again.");
        }
    });
};

function changeStudentPassword() {
    modalTitle.textContent = "Change Student Dashboard Password";
    modal.style.display = "block";
    passwordForm.onsubmit = function(event) {
        event.preventDefault();
        const newPassword = document.getElementById("parentPassword").value;
        fetch("/change_student_password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ new_password: newPassword }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Student dashboard password changed successfully!");
                modal.style.display = "none";
            } else {
                alert("Failed to change password. Please try again.");
            }
        });
    };
}

function changeParentPassword() {
    modalTitle.textContent = "Change Parent Mode Password";
    modal.style.display = "block";
    passwordForm.onsubmit = function(event) {
        event.preventDefault();
        const newPassword = document.getElementById("parentPassword").value;
        fetch("/change_parent_password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ new_password: newPassword }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Parent mode password changed successfully!");
                modal.style.display = "none";
            } else {
                alert("Failed to change password. Please try again.");
            }
        });
    };
}

function startTest() {
    window.location.href = "/start_test/" + studentId;
}

function updateAfterAnswer(isCorrect) {
    console.log("Updating after answer");
    const correctAnswersElement = document.querySelector('.performance-stat .number');
    let correct_count = parseInt(correctAnswersElement.textContent);
    
    if (isCorrect) {
        correct_count++;
        correctAnswersElement.textContent = correct_count;
    }
    
    console.log("New correct count:", correct_count);
    initializeBadges();
    updateCharts();
}

function updateCharts() {
    const correctAnswersElement = document.querySelector('.performance-stat .number');
    const correct_count = parseInt(correctAnswersElement.textContent);
    const incorrectAnswersElement = document.querySelector('.performance-stat:nth-child(3) .number');
    const incorrect_count = parseInt(incorrectAnswersElement.textContent);

    if (window.performanceChart) {
        window.performanceChart.data.datasets[0].data = [correct_count, incorrect_count];
        window.performanceChart.update();
    }

    if (window.categoryChart) {
        // Kategori verilerini güncelleme kodu buraya gelecek
        // Bu, backend'den yeni veriler almayı gerektirebilir
    }
}