document.addEventListener('DOMContentLoaded', () => {
    // Configuration
    const API_BASE_URL = '/api/v1'; // This will be relative to the current domain

    // DOM Elements
    const endpoints = document.querySelectorAll('.endpoint');
    const endpointPanes = document.querySelectorAll('.endpoint-pane');
    const requestUrlElement = document.getElementById('request-url');
    const responseTimeElement = document.getElementById('response-time');
    const outputFormatted = document.getElementById('output-formatted');
    const outputJson = document.getElementById('output-json');
    const viewButtons = document.querySelectorAll('.view-btn');
    const outputContents = document.querySelectorAll('.output-content');
    const copyButton = document.getElementById('copy-output');
    const paginationContainer = document.getElementById('pagination');

    // Current state
    let currentResponseData = null;

    // Output section element
    const outputSection = document.querySelector('.output-section');

    // Endpoint switching functionality
    endpoints.forEach(endpoint => {
        endpoint.addEventListener('click', () => {
            const endpointId = endpoint.getAttribute('data-endpoint');

            // Update active endpoint
            endpoints.forEach(e => e.classList.remove('active'));
            endpoint.classList.add('active');

            // Update active endpoint pane
            endpointPanes.forEach(pane => {
                pane.classList.remove('active');
                if (pane.id === `${endpointId}-pane`) {
                    pane.classList.add('active');
                }
            });

            // Show/hide output section based on endpoint
            if (endpointId === 'api-docs') {
                outputSection.style.display = 'none';
            } else {
                outputSection.style.display = 'flex';
            }

            // Clear output
            clearOutput();
        });
    });

    // View toggle functionality
    viewButtons.forEach(button => {
        button.addEventListener('click', () => {
            const view = button.getAttribute('data-view');

            // Update active button
            viewButtons.forEach(b => b.classList.remove('active'));
            button.classList.add('active');

            // Update active content
            outputContents.forEach(content => {
                content.classList.remove('active');
                if (content.classList.contains(view)) {
                    content.classList.add('active');
                }
            });
        });
    });

    // Copy to clipboard functionality
    copyButton.addEventListener('click', () => {
        let textToCopy;

        // Determine which view is active
        if (document.querySelector('.output-content.json.active')) {
            textToCopy = outputJson.textContent;
        } else {
            // For formatted view, we'll copy the JSON data
            textToCopy = JSON.stringify(currentResponseData, null, 2);
        }

        // Copy to clipboard
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                // Show success feedback
                const originalTitle = copyButton.getAttribute('title');
                copyButton.setAttribute('title', 'Copied!');
                copyButton.innerHTML = '<i class="fas fa-check"></i>';

                // Reset after 2 seconds
                setTimeout(() => {
                    copyButton.setAttribute('title', originalTitle);
                    copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
                copyButton.setAttribute('title', 'Failed to copy');
                setTimeout(() => {
                    copyButton.setAttribute('title', 'Copy to clipboard');
                }, 2000);
            });
    });

    // Load API metadata on page load
    loadMetadata();

    // Event listeners for form submissions
    document.getElementById('list-submit').addEventListener('click', listCodes);
    document.getElementById('search-submit').addEventListener('click', searchCodes);
    document.getElementById('code-submit').addEventListener('click', getCodeDetails);
    document.getElementById('children-submit').addEventListener('click', getCodeChildren);

    // Add enter key support for input fields
    document.getElementById('list-page').addEventListener('keypress', handleEnterKey('list-submit'));
    document.getElementById('list-limit').addEventListener('keypress', handleEnterKey('list-submit'));

    document.getElementById('search-query').addEventListener('keypress', handleEnterKey('search-submit'));
    document.getElementById('search-parent').addEventListener('keypress', handleEnterKey('search-submit'));
    document.getElementById('search-page').addEventListener('keypress', handleEnterKey('search-submit'));
    document.getElementById('search-limit').addEventListener('keypress', handleEnterKey('search-submit'));

    document.getElementById('code-value').addEventListener('keypress', handleEnterKey('code-submit'));
    document.getElementById('parent-value').addEventListener('keypress', handleEnterKey('children-submit'));

    // Helper function to handle enter key press
    function handleEnterKey(buttonId) {
        return function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                document.getElementById(buttonId).click();
            }
        };
    }

    // Event delegation for dynamically created elements
    document.addEventListener('click', function (event) {
        // Handle action-details buttons
        if (event.target.classList.contains('action-details')) {
            const codeValue = event.target.getAttribute('data-code');
            document.getElementById('code-value').value = codeValue;
            document.querySelector('.endpoint[data-endpoint="get-code"]').click();
            document.getElementById('code-submit').click();
        }

        // Handle action-children buttons
        else if (event.target.classList.contains('action-children')) {
            const codeValue = event.target.getAttribute('data-code');
            document.getElementById('parent-value').value = codeValue;
            document.querySelector('.endpoint[data-endpoint="get-children"]').click();
            document.getElementById('children-submit').click();
        }

        // Handle action-view-children buttons
        else if (event.target.classList.contains('action-view-children')) {
            const codeValue = event.target.getAttribute('data-code');
            document.getElementById('parent-value').value = codeValue;
            document.querySelector('.endpoint[data-endpoint="get-children"]').click();
            document.getElementById('children-submit').click();
        }

        // Handle parent links
        else if (event.target.classList.contains('parent-link')) {
            event.preventDefault();
            const parentCode = event.target.getAttribute('data-parent');
            document.getElementById('code-value').value = parentCode;
            document.getElementById('code-submit').click();
        }

        // Handle pagination buttons
        else if (event.target.classList.contains('pagination-btn') && !event.target.disabled) {
            const page = event.target.getAttribute('data-page');
            const inputId = event.target.getAttribute('data-input-id');
            const submitId = event.target.getAttribute('data-submit-id');

            document.getElementById(inputId).value = page;
            document.getElementById(submitId).click();
        }
    });

    // Fetch API metadata
    async function loadMetadata() {
        try {
            const url = `${API_BASE_URL}/metadata`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            // Update metadata badges
            document.getElementById('version-number').textContent = data.versionNumber;
            document.getElementById('last-updated').textContent = data.lastUpdated || 'N/A';
            document.getElementById('total-codes').textContent = data.totalCodes.toLocaleString();

        } catch (error) {
            console.error('Error fetching metadata:', error);
            // We don't need to show an error message for metadata
        }
    }

    // List codes with pagination
    async function listCodes() {
        const page = document.getElementById('list-page').value;
        const limit = document.getElementById('list-limit').value;

        clearOutput();
        showLoading();

        try {
            const startTime = performance.now();
            const url = `${API_BASE_URL}/codes?page=${page}&limit=${limit}`;
            const response = await fetch(url);
            const endTime = performance.now();

            updateRequestInfo(url, endTime - startTime);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            currentResponseData = data;

            // Update JSON view
            updateJsonView(data);

            // Create table for formatted view
            let tableHtml = `
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Description</th>
                            <th>Parent</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            data.data.forEach(code => {
                tableHtml += `
                    <tr>
                        <td>${code.codeValue}</td>
                        <td>${code.codeDescription}</td>
                        <td>${code.codeParent || '-'}</td>
                        <td>
                            <button class="btn-primary action-details" data-code="${code.codeValue}">Details</button>
                            <button class="btn-primary action-children" data-code="${code.codeValue}">Children</button>
                        </td>
                    </tr>
                `;
            });

            tableHtml += `
                    </tbody>
                </table>
            `;

            outputFormatted.innerHTML = tableHtml;

            // Create pagination controls
            createPagination(data.pagination, 'list-page', 'list-submit');

        } catch (error) {
            console.error('Error fetching codes:', error);
            showError(`Failed to load codes: ${error.message}`);
        }
    }

    // Search codes
    async function searchCodes() {
        const query = document.getElementById('search-query').value;
        const parent = document.getElementById('search-parent').value;
        const page = document.getElementById('search-page').value;
        const limit = document.getElementById('search-limit').value;

        if (!query && !parent) {
            showError('Please enter a search query or parent code.');
            return;
        }

        clearOutput();
        showLoading();

        try {
            const startTime = performance.now();
            let url = `${API_BASE_URL}/codes/search?page=${page}&limit=${limit}`;

            if (query) url += `&query=${encodeURIComponent(query)}`;
            if (parent) url += `&parent=${encodeURIComponent(parent)}`;

            const response = await fetch(url);
            const endTime = performance.now();

            updateRequestInfo(url, endTime - startTime);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            currentResponseData = data;

            // Update JSON view
            updateJsonView(data);

            // Create table for formatted view
            let tableHtml = `
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Description</th>
                            <th>Parent</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            if (data.data.length === 0) {
                tableHtml += `
                    <tr>
                        <td colspan="4" style="text-align: center;">No results found</td>
                    </tr>
                `;
            } else {
                data.data.forEach(code => {
                    tableHtml += `
                        <tr>
                            <td>${code.codeValue}</td>
                            <td>${code.codeDescription}</td>
                            <td>${code.codeParent || '-'}</td>
                            <td>
                                <button class="btn-primary action-details" data-code="${code.codeValue}">Details</button>
                                <button class="btn-primary action-children" data-code="${code.codeValue}">Children</button>
                            </td>
                        </tr>
                    `;
                });
            }

            tableHtml += `
                    </tbody>
                </table>
            `;

            outputFormatted.innerHTML = tableHtml;

            // Create pagination controls
            createPagination(data.pagination, 'search-page', 'search-submit');

        } catch (error) {
            console.error('Error searching codes:', error);
            showError(`Failed to search codes: ${error.message}`);
        }
    }

    // Get code details
    async function getCodeDetails() {
        const codeValue = document.getElementById('code-value').value;

        if (!codeValue) {
            showError('Please enter a code value.');
            return;
        }

        clearOutput();
        showLoading();

        try {
            const startTime = performance.now();
            const url = `${API_BASE_URL}/codes/${encodeURIComponent(codeValue)}`;
            const response = await fetch(url);
            const endTime = performance.now();

            updateRequestInfo(url, endTime - startTime);

            if (!response.ok) {
                if (response.status === 404) {
                    showError(`Code '${codeValue}' not found.`);
                    return;
                }
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const code = await response.json();
            currentResponseData = code;

            // Update JSON view
            updateJsonView(code);

            const detailsHtml = `
                <div class="code-details">
                    <div>
                        <strong>Code Value</strong>
                        ${code.codeValue}
                    </div>
                    <div>
                        <strong>Description</strong>
                        ${code.codeDescription}
                    </div>
                    <div>
                        <strong>Parent</strong>
                        ${code.codeParent ?
                    `<a href="#" class="parent-link" data-parent="${code.codeParent}">${code.codeParent}</a>`
                    : '-'}
                    </div>
                    <div>
                        <strong>Issue Number</strong>
                        ${code.issueNumber}
                    </div>
                    <div>
                        <strong>Modified</strong>
                        ${code.modified || '-'}
                    </div>
                    <div>
                        <strong>Notes</strong>
                        ${code.codeNotes || '-'}
                    </div>
                </div>
                <div style="margin-top: 20px;">
                    <button class="btn-primary action-view-children" data-code="${code.codeValue}">View Children</button>
                </div>
            `;

            outputFormatted.innerHTML = detailsHtml;

            // Clear pagination for single item view
            paginationContainer.innerHTML = '';

        } catch (error) {
            console.error('Error fetching code details:', error);
            showError(`Failed to load code details: ${error.message}`);
        }
    }

    // Get code children
    async function getCodeChildren() {
        const parentValue = document.getElementById('parent-value').value;

        if (!parentValue) {
            showError('Please enter a parent code value.');
            return;
        }

        clearOutput();
        showLoading();

        try {
            const startTime = performance.now();
            const url = `${API_BASE_URL}/codes/${encodeURIComponent(parentValue)}/children`;
            const response = await fetch(url);
            const endTime = performance.now();

            updateRequestInfo(url, endTime - startTime);

            if (!response.ok) {
                if (response.status === 404) {
                    showError(`Parent code '${parentValue}' not found.`);
                    return;
                }
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            currentResponseData = data;

            // Update JSON view
            updateJsonView(data);

            let childrenHtml = `
                <div style="margin-bottom: 20px;">
                    <h3>Parent: ${data.parent}</h3>
                    <p>Total children: ${data.count}</p>
                </div>
            `;

            if (data.count === 0) {
                childrenHtml += `
                    <div class="placeholder">
                        This code has no children.
                    </div>
                `;
            } else {
                childrenHtml += `
                    <table class="results-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Description</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                data.children.forEach(code => {
                    childrenHtml += `
                        <tr>
                            <td>${code.codeValue}</td>
                            <td>${code.codeDescription}</td>
                            <td>
                                <button class="btn-primary action-details" data-code="${code.codeValue}">Details</button>
                                <button class="btn-primary action-children" data-code="${code.codeValue}">Children</button>
                            </td>
                        </tr>
                    `;
                });

                childrenHtml += `
                        </tbody>
                    </table>
                `;
            }

            outputFormatted.innerHTML = childrenHtml;

            // Create pagination controls if needed
            if (data.count > 0) {
                // No pagination for children view as it returns all children
                paginationContainer.innerHTML = '';
            }

        } catch (error) {
            console.error('Error fetching children:', error);
            showError(`Failed to load children: ${error.message}`);
        }
    }

    // Helper function to create pagination controls
    function createPagination(pagination, pageInputId, submitBtnId) {
        const { total, page, limit, pages } = pagination;
        const currentPage = parseInt(page);

        let paginationHtml = `
            <div>
                <span>Total: ${total.toLocaleString()} items | Page ${currentPage} of ${pages}</span>
            </div>
            <div>
        `;

        // Previous button
        paginationHtml += `
            <button
                ${currentPage <= 1 ? 'disabled' : ''}
                class="pagination-btn"
                data-page="${currentPage - 1}"
                data-input-id="${pageInputId}"
                data-submit-id="${submitBtnId}"
            >
                &laquo; Prev
            </button>
        `;

        // Page numbers
        const maxButtons = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(pages, startPage + maxButtons - 1);

        if (endPage - startPage + 1 < maxButtons) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <button
                    class="${i === currentPage ? 'active' : ''} pagination-btn"
                    data-page="${i}"
                    data-input-id="${pageInputId}"
                    data-submit-id="${submitBtnId}"
                >
                    ${i}
                </button>
            `;
        }

        // Next button
        paginationHtml += `
            <button
                ${currentPage >= pages ? 'disabled' : ''}
                class="pagination-btn"
                data-page="${currentPage + 1}"
                data-input-id="${pageInputId}"
                data-submit-id="${submitBtnId}"
            >
                Next &raquo;
            </button>
        `;

        paginationHtml += `</div>`;
        paginationContainer.innerHTML = paginationHtml;
    }

    // Helper functions for output handling
    function clearOutput() {
        outputFormatted.innerHTML = '';
        outputJson.innerHTML = '';
        paginationContainer.innerHTML = '';
        currentResponseData = null;
    }

    function showLoading() {
        outputFormatted.innerHTML = '<div class="loading"></div>';
    }

    function showError(message) {
        outputFormatted.innerHTML = `
            <div class="error-message">
                ${message}
            </div>
        `;
        outputJson.innerHTML = JSON.stringify({ error: message }, null, 2);
    }

    function updateJsonView(data) {
        outputJson.innerHTML = JSON.stringify(data, null, 2);
    }

    // Update request information
    function updateRequestInfo(url, responseTime) {
        requestUrlElement.textContent = url;
        responseTimeElement.textContent = `${responseTime.toFixed(2)} ms`;
    }
});
