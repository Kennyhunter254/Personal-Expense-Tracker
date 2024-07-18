document.addEventListener('DOMContentLoaded', () => {
    const addExpenseForm = document.getElementById('addExpenseForm');
    const deleteButton = document.getElementById('deleteButton');
    const sortOptions = document.querySelectorAll('#sortButton + .dropdown-menu a');
    const expenseChart = document.getElementById('expenseChart').getContext('2d');
    const budgetForm = document.getElementById('budgetForm');
    const budgetInput = document.getElementById('budgetInput');
    const remainingBudgetDisplay = document.getElementById('remainingBudget');

    let selectedExpenses = [];
    let expenses = [];
    let monthlyBudget = 0;

    fetchExpenses();
    displayCurrentDate();
    addExpenseForm.addEventListener('submit', handleSubmit);
    deleteButton.addEventListener('click', deleteSelectedExpenses);
    sortOptions.forEach(option => {
        option.addEventListener('click', (e) => sortExpenses(e.target.dataset.sort));
    });
    budgetForm.addEventListener('submit', handleBudgetSubmit);

    initializeChart();

    function fetchExpenses() {
        fetch('http://localhost:3000/expenses')
            .then(res => res.json())
            .then(data => {
                expenses = data; // Store the fetched data
                displayExpenses();
                updateSummary();
            })
            .catch(error => console.error(`Fetching Error: ${error}`));
    }

    function totalExpenditure(category = null) {
        return new Promise((resolve, reject) => {
            fetch('http://localhost:3000/expenses')
                .then(res => res.json())
                .then(data => {
                    let filteredExpenses = data;
                    if (category !== null) {
                        filteredExpenses = data.filter(expense => expense.category === category);
                    }
                    const total = filteredExpenses.reduce((acc, expense) => acc + parseFloat(expense.amount), 0);
                    resolve(total);
                })
                .catch(error => {
                    console.error(`Error getting total: ${error}`);
                    reject(error);
                });
        });
    }

    function updateSummary() {
        totalExpenditure().then(total => {
            document.getElementById('currentExpense').textContent = `Total expense: $${total.toFixed(2)}`;
            document.getElementById('totalSum').textContent = `Total expense: $${total.toFixed(2)}`;
            calculateRemainingBudget(total);
        });

        totalExpenditure('Groceries').then(groceriesTotal => {
            document.getElementById('groceries').textContent = `Groceries: $${groceriesTotal.toFixed(2)}`;
        });
        totalExpenditure('Transport').then(transportTotal => {
            document.getElementById('transport').textContent = `Transport: $${transportTotal.toFixed(2)}`;
        });
        totalExpenditure('Personal Care').then(personalCareTotal => {
            document.getElementById('personal-care').textContent = `Personal Care: $${personalCareTotal.toFixed(2)}`;
        });
        totalExpenditure('Entertainment').then(entertainmentTotal => {
            document.getElementById('entertainment').textContent = `Entertainment: $${entertainmentTotal.toFixed(2)}`;
        });
        totalExpenditure('Utilities').then(utilitiesTotal => {
            document.getElementById('utilities').textContent = `Utilities: $${utilitiesTotal.toFixed(2)}`;
        });
        totalExpenditure('Other').then(otherTotal => {
            document.getElementById('other').textContent = `Other: $${otherTotal.toFixed(2)}`;
        });
    }

    function calculateRemainingBudget(totalExpenses) {
        const remainingBudget = monthlyBudget - totalExpenses;
        remainingBudgetDisplay.textContent = `Remaining Budget: $${remainingBudget.toFixed(2)}`;
    }

    function sortExpenses(sortOption) {
        switch (sortOption) {
            case 'dateN':
                expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'dateO':
                expenses.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
            case 'amountL':
                expenses.sort((a, b) => a.amount - b.amount);
                break;
            case 'amountH':
                expenses.sort((a, b) => b.amount - a.amount);
                break;
            case 'category':
                expenses.sort((a, b) => a.category.localeCompare(b.category));
                break;
        }
        displayExpenses();
    }

    function displayExpenses() {
        const tbody = document.querySelector('table tbody');
        tbody.innerHTML = '';

        expenses.forEach(expense => {
            const row = createExpenseRow(expense);
            tbody.appendChild(row);
        });

        updateChart(); // Update the chart after displaying expenses
    }

    function handleSubmit(event) {
        event.preventDefault();
        const categorySelect = document.getElementById('formSelect');
        const category = categorySelect.options[categorySelect.selectedIndex].text;
        const description = document.getElementById('description').value;
        const amount = document.getElementById('amount').value;
        const date = document.getElementById('date').value;

        const newExpense = {
            category,
            description,
            amount,
            date
        };

        postExpense(newExpense);
        addExpenseForm.reset();
    }

    function postExpense(newExpense) {
        fetch('http://localhost:3000/expenses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(newExpense)
        })
            .then(res => res.json())
            .then(expense => {
                expenses.push(expense); // Add new expense to local array
                displayExpenses();
                updateSummary(); // Update summary after adding new expense
            })
            .catch(error => console.error(`Posting Error: ${error}`));
    }

    function createExpenseRow(expense) {
        const row = document.createElement('tr');
        row.dataset.id = expense.id;

        const checkboxCell = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.addEventListener('change', () => toggleExpenseSelection(expense.id, checkbox.checked));
        checkboxCell.appendChild(checkbox);
        row.appendChild(checkboxCell);

        const categoryCell = document.createElement('td');
        categoryCell.textContent = expense.category;
        categoryCell.addEventListener('dblclick', () => editCell(categoryCell, 'category', expense));
        row.appendChild(categoryCell);

        const descriptionCell = document.createElement('td');
        descriptionCell.textContent = expense.description;
        descriptionCell.addEventListener('dblclick', () => editCell(descriptionCell, 'description', expense));
        row.appendChild(descriptionCell);

        const amountCell = document.createElement('td');
        amountCell.textContent = expense.amount;
        amountCell.addEventListener('dblclick', () => editCell(amountCell, 'amount', expense));
        row.appendChild(amountCell);

        const dateCell = document.createElement('td');
        dateCell.textContent = expense.date;
        dateCell.addEventListener('dblclick', () => editCell(dateCell, 'date', expense));
        row.appendChild(dateCell);

        return row;
    }

    function editCell(cell, key, expense) {
        const oldValue = cell.textContent;
        const input = document.createElement('input');
        input.type = key === 'amount' ? 'number' : key === 'date' ? 'date' : 'text';
        input.value = oldValue;

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const newValue = input.value.trim();
                if (newValue !== oldValue) {
                    updateExpense(expense.id, { [key]: newValue });
                } else {
                    cell.textContent = newValue;
                    input.replaceWith(cell);
                }
            }
        });

        cell.textContent = '';
        cell.appendChild(input);
        input.focus();
    }

    function updateExpense(expenseId, updates) {
        fetch(`http://localhost:3000/expenses/${expenseId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(updates)
        })
            .then(res => res.json())
            .then(updatedExpense => {
                const index = expenses.findIndex(expense => expense.id === updatedExpense.id);
                if (index !== -1) {
                    expenses[index] = updatedExpense;
                    displayExpenses();
                    updateSummary(); // Update summary after updating expense
                }
            })
            .catch(error => console.error(`Error updating expense: ${error}`));
    }

    function toggleExpenseSelection(expenseId, isSelected) {
        if (isSelected) {
            selectedExpenses.push(expenseId);
        } else {
            const index = selectedExpenses.indexOf(expenseId);
            if (index !== -1) {
                selectedExpenses.splice(index, 1);
            }
        }
        deleteButton.disabled = selectedExpenses.length === 0;
    }

    function deleteSelectedExpenses() {
        selectedExpenses.forEach(expenseId => {
            deleteExpense(expenseId);
        });
        selectedExpenses = [];
        deleteButton.disabled = true;
    }

    function deleteExpense(expenseId) {
        fetch(`http://localhost:3000/expenses/${expenseId}`, {
            method: 'DELETE'
        })
            .then(() => {
                expenses = expenses.filter(expense => expense.id !== expenseId);
                displayExpenses();
                updateSummary(); // Update summary after deleting expense
            })
            .catch(error => console.error(`Error deleting expense: ${error}`));
    }

    function displayCurrentDate() {
        const currentDate = document.getElementById('currentDate');
        const date = new Date();
        const formattedDate = new Intl.DateTimeFormat('en-US').format(date);
        currentDate.textContent = `Date: ${formattedDate}`;
    }

    function handleBudgetSubmit(event) {
        event.preventDefault();
        const newBudget = parseFloat(budgetInput.value);
        if (!isNaN(newBudget) && newBudget >= 0) {
            monthlyBudget = newBudget;
            updateSummary();
        } else {
            alert('Please enter a valid monthly budget.');
        }
        budgetForm.reset();
    }

    function initializeChart() {
        const categories = ['Groceries', 'Transport', 'Personal Care', 'Entertainment', 'Utilities', 'Other'];
        const amounts = categories.map(category =>
            expenses.filter(expense => expense.category === category)
                .reduce((total, expense) => total + parseFloat(expense.amount), 0)
        );

        const chart = new Chart(expenseChart, {
            type: 'pie',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Total Expenses by Category',
                    data: amounts,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Total Expenses by Category'
                    }
                }
            }
        });
    }

    function updateChart() {
        const categories = ['Groceries', 'Transport', 'Personal Care', 'Entertainment', 'Utilities', 'Other'];
        const amounts = categories.map(category =>
            expenses.filter(expense => expense.category === category)
                .reduce((total, expense) => total + parseFloat(expense.amount), 0)
        );

        const chart = new Chart(expenseChart, {
            type: 'pie',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Total Expenses by Category',
                    data: amounts,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Total Expenses by Category'
                    }
                }
            }
        });
    }
});
