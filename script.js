// Nightscout Data Exporter
// Free tool by Mieru Health

let fetchedData = [];

// DOM Elements
const nightscoutUrlInput = document.getElementById('nightscout-url');
const apiSecretInput = document.getElementById('api-secret');
const entryCountInput = document.getElementById('entry-count');
const fetchBtn = document.getElementById('fetch-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const exportJsonBtn = document.getElementById('export-json-btn');
const statusSection = document.getElementById('status-section');
const statusMessage = document.getElementById('status-message');
const progressBar = document.getElementById('progress-bar');
const progressFill = document.querySelector('.progress-fill');
const previewSection = document.getElementById('preview-section');
const dataPreview = document.getElementById('data-preview');

// SHA1 Hash function
async function sha1(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Show status message
function showStatus(message, type) {
    statusSection.classList.remove('hidden');
    statusMessage.textContent = message;
    statusMessage.className = 'status-message ' + type;
}

// Show/hide progress bar
function showProgress(show) {
    progressBar.classList.toggle('hidden', !show);
}

function updateProgress(percent) {
    progressFill.style.width = percent + '%';
}

// Fetch data from Nightscout
async function fetchData() {
    const url = nightscoutUrlInput.value.trim();
    const apiSecret = apiSecretInput.value.trim();
    const count = parseInt(entryCountInput.value) || 100;
    
    // Validation
    if (!url) {
        showStatus('Please enter your Nightscout URL', 'error');
        return;
    }
    
    if (!apiSecret) {
        showStatus('Please enter your API Secret', 'error');
        return;
    }
    
    // Normalize URL
    let baseUrl = url;
    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
    }
    
    // Disable buttons
    fetchBtn.disabled = true;
    exportCsvBtn.disabled = true;
    exportJsonBtn.disabled = true;
    
    showStatus('Fetching data from Nightscout...', 'loading');
    showProgress(true);
    updateProgress(10);
    
    try {
        // Generate SHA1 hash of API secret
        const apiSecretHash = await sha1(apiSecret);
        
        updateProgress(30);
        
        // Fetch entries from Nightscout API
        const apiUrl = `${baseUrl}/api/v1/entries.json?count=${count}`;
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'api-secret': apiSecretHash
            }
        });
        
        updateProgress(70);
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Authentication failed. Please check your API Secret.');
            } else if (response.status === 404) {
                throw new Error('Nightscout URL not found. Please check the URL.');
            } else {
                throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }
        }
        
        fetchedData = await response.json();
        
        updateProgress(100);
        
        if (!fetchedData || fetchedData.length === 0) {
            showStatus('No data found in your Nightscout instance.', 'error');
            return;
        }
        
        // Success!
        showStatus(`Successfully fetched ${fetchedData.length} entries from Nightscout!`, 'success');
        
        // Enable export buttons
        exportCsvBtn.disabled = false;
        exportJsonBtn.disabled = false;
        
        // Show preview
        displayPreview(fetchedData);
        
    } catch (error) {
        console.error('Error fetching data:', error);
        showStatus('Error: ' + error.message, 'error');
    } finally {
        fetchBtn.disabled = false;
        showProgress(false);
    }
}

// Display preview of data
function displayPreview(data) {
    previewSection.classList.remove('hidden');
    
    // Show first 10 entries
    const previewData = data.slice(0, 10);
    
    let html = '<table>';
    html += '<thead><tr><th>Date</th><th>Time</th><th>Glucose (mg/dL)</th><th>Device</th></tr></thead>';
    html += '<tbody>';
    
    previewData.forEach(entry => {
        const date = new Date(entry.dateString || entry.date);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString();
        const glucose = entry.sgv || entry.mbg || 'N/A';
        const device = entry.device || 'Unknown';
        
        html += `<tr>`;
        html += `<td>${dateStr}</td>`;
        html += `<td>${timeStr}</td>`;
        html += `<td>${glucose}</td>`;
        html += `<td>${device}</td>`;
        html += `</tr>`;
    });
    
    html += '</tbody></table>';
    dataPreview.innerHTML = html;
}

// Export to CSV
function exportCSV() {
    if (fetchedData.length === 0) {
        showStatus('No data to export. Fetch data first.', 'error');
        return;
    }
    
    // CSV Header
    const headers = ['Date', 'Time', 'Glucose (mg/dL)', 'Type', 'Device', 'Trend', 'ID'];
    
    // CSV Rows
    const rows = fetchedData.map(entry => {
        const date = new Date(entry.dateString || entry.date);
        return [
            date.toLocaleDateString(),
            date.toLocaleTimeString(),
            entry.sgv || entry.mbg || '',
            entry.type || '',
            entry.device || '',
            entry.trend || '',
            entry._id || ''
        ].map(field => `"${field}"`).join(',');
    });
    
    // Combine
    const csv = [headers.join(','), ...rows].join('\n');
    
    // Download
    downloadFile(csv, 'nightscout-data.csv', 'text/csv');
    showStatus('CSV file downloaded!', 'success');
}

// Export to JSON
function exportJSON() {
    if (fetchedData.length === 0) {
        showStatus('No data to export. Fetch data first.', 'error');
        return;
    }
    
    const json = JSON.stringify(fetchedData, null, 2);
    downloadFile(json, 'nightscout-data.json', 'application/json');
    showStatus('JSON file downloaded!', 'success');
}

// Download file
function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Event Listeners
fetchBtn.addEventListener('click', fetchData);
exportCsvBtn.addEventListener('click', exportCSV);
exportJsonBtn.addEventListener('click', exportJSON);

// Allow Enter key to submit
nightscoutUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') fetchData();
});

apiSecretInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') fetchData();
});

// Clear status when typing
nightscoutUrlInput.addEventListener('input', () => {
    statusSection.classList.add('hidden');
});

apiSecretInput.addEventListener('input', () => {
    statusSection.classList.add('hidden');
});

console.log('Nightscout Data Exporter loaded - Free tool by Mieru Health');
