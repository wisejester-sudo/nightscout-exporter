// Nightscout Data Exporter
// Free tool by Mieru Health

let fetchedData = [];
let fetchedTreatments = [];

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
    const includeTreatments = document.getElementById('include-treatments')?.checked || false;
    
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
        
        updateProgress(20);
        
        // Fetch entries from Nightscout API using token query param (avoids CORS issues)
        const apiUrl = `${baseUrl}/api/v1/entries.json?count=${count}&token=${apiSecretHash}`;
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        updateProgress(50);
        
        // Fetch treatments if checkbox is checked
        if (includeTreatments) {
            showStatus('Fetching treatments (insulin, carbs, exercise)...', 'loading');
            const treatmentsUrl = `${baseUrl}/api/v1/treatments.json?count=${count}&token=${apiSecretHash}`;
            
            const treatmentsResponse = await fetch(treatmentsUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (treatmentsResponse.ok) {
                fetchedTreatments = await treatmentsResponse.json();
                console.log(`Fetched ${fetchedTreatments.length} treatments`);
            } else {
                console.warn('Could not fetch treatments');
                fetchedTreatments = [];
            }
        } else {
            fetchedTreatments = [];
        }
        
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
    
    let html = '';
    
    // Show CGM entries preview
    if (data.length > 0) {
        html += '<h4>CGM Entries</h4>';
        html += '<table>';
        html += '<thead><tr><th>Date</th><th>Time</th><th>Glucose (mg/dL)</th><th>Device</th></tr></thead>';
        html += '<tbody>';
        
        data.slice(0, 5).forEach(entry => {
            const date = new Date(entry.dateString || entry.date);
            const dateStr = date.toLocaleDateString();
            const timeStr = date.toLocaleTimeString();
            const glucose = entry.sgv || entry.mbg || 'N/A';
            const device = entry.device || 'Unknown';
            
            html += `<tr><td>${dateStr}</td><td>${timeStr}</td><td>${glucose}</td><td>${device}</td></tr>`;
        });
        
        html += '</tbody></table>';
    }
    
    // Show treatments preview
    if (fetchedTreatments.length > 0) {
        html += '<h4>Treatments (Insulin, Carbs, Exercise)</h4>';
        html += '<table>';
        html += '<thead><tr><th>Date</th><th>Time</th><th>Type</th><th>Insulin (U)</th><th>Carbs (g)</th></tr></thead>';
        html += '<tbody>';
        
        fetchedTreatments.slice(0, 5).forEach(treatment => {
            const date = new Date(treatment.dateString || treatment.created_at || treatment.timestamp);
            const dateStr = date.toLocaleDateString();
            const timeStr = date.toLocaleTimeString();
            const type = treatment.eventType || 'Note';
            const insulin = treatment.insulin || '-';
            const carbs = treatment.carbs || '-';
            
            html += `<tr><td>${dateStr}</td><td>${timeStr}</td><td>${type}</td><td>${insulin}</td><td>${carbs}</td></tr>`;
        });
        
        html += '</tbody></table>';
    }
    
    dataPreview.innerHTML = html;
}

// Export to CSV
function exportCSV() {
    if (fetchedData.length === 0) {
        showStatus('No data to export. Fetch data first.', 'error');
        return;
    }
    
    let csv = '';
    
    // Entries section
    if (fetchedData.length > 0) {
        csv += '# CGM ENTRIES\n';
        csv += 'Date,Time,Glucose (mg/dL),Type,Device,Trend,ID\n';
        
        fetchedData.forEach(entry => {
            const date = new Date(entry.dateString || entry.date);
            const row = [
                date.toLocaleDateString(),
                date.toLocaleTimeString(),
                entry.sgv || entry.mbg || '',
                entry.type || '',
                entry.device || '',
                entry.trend || '',
                entry._id || ''
            ].map(field => `"${field}"`).join(',');
            csv += row + '\n';
        });
    }
    
    // Treatments section
    if (fetchedTreatments.length > 0) {
        csv += '\n# TREATMENTS (Insulin, Carbs, Exercise)\n';
        csv += 'Date,Time,Event Type,Insulin (U),Carbs (g),Notes,ID\n';
        
        fetchedTreatments.forEach(treatment => {
            const date = new Date(treatment.dateString || treatment.created_at || treatment.timestamp);
            const row = [
                date.toLocaleDateString(),
                date.toLocaleTimeString(),
                treatment.eventType || '',
                treatment.insulin || '',
                treatment.carbs || '',
                (treatment.notes || '').replace(/"/g, '""'),
                treatment._id || ''
            ].map(field => `"${field}"`).join(',');
            csv += row + '\n';
        });
    }
    
    // Download
    const filename = fetchedTreatments.length > 0 ? 'nightscout-data-with-treatments.csv' : 'nightscout-data.csv';
    downloadFile(csv, filename, 'text/csv');
    showStatus(`CSV file downloaded! (${fetchedData.length} entries${fetchedTreatments.length > 0 ? ', ' + fetchedTreatments.length + ' treatments' : ''})`, 'success');
}

// Export to JSON
function exportJSON() {
    if (fetchedData.length === 0) {
        showStatus('No data to export. Fetch data first.', 'error');
        return;
    }
    
    const exportData = {
        entries: fetchedData,
        treatments: fetchedTreatments,
        exportDate: new Date().toISOString(),
        totalEntries: fetchedData.length,
        totalTreatments: fetchedTreatments.length
    };
    
    const filename = fetchedTreatments.length > 0 ? 'nightscout-data-with-treatments.json' : 'nightscout-data.json';
    const json = JSON.stringify(exportData, null, 2);
    downloadFile(json, filename, 'application/json');
    showStatus(`JSON file downloaded! (${fetchedData.length} entries${fetchedTreatments.length > 0 ? ', ' + fetchedTreatments.length + ' treatments' : ''})`, 'success');
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
