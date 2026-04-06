# Nightscout Data Exporter

A free, open-source tool to export your CGM data from Nightscout to CSV or JSON format.

**Live Tool:** https://wisejester-sudo.github.io/nightscout-exporter/  
**Built by:** [Mieru Health](https://mieru.health)

---

## Features

✅ **Secure** - Your API secret is SHA1 hashed and never stored  
✅ **Private** - All processing happens in your browser (no data sent to servers)  
✅ **Free** - No account required, completely free to use  
✅ **Open Source** - View and contribute to the code  
✅ **Easy** - Simple interface, export in seconds

---

## How to Use

1. **Enter your Nightscout URL** (e.g., `https://your-site.herokuapp.com`)
2. **Enter your API Secret** (found in Nightscout settings)
3. **Select number of entries** to export (default: 100)
4. **Click "Fetch Data"**
5. **Export** to CSV or JSON

---

## Technical Details

### Authentication
Nightscout requires the API secret to be SHA1 hashed before sending. This tool automatically:
1. Takes your API secret
2. Generates SHA1 hash using browser's native crypto API
3. Sends hashed value to Nightscout API
4. Your raw API secret never leaves your browser

### Data Processing
- All API calls are made directly from your browser to your Nightscout instance
- No data passes through our servers
- No tracking or analytics
- Completely client-side processing

---

## For Developers

### Local Development

```bash
git clone https://github.com/wisejester-sudo/nightscout-exporter.git
cd nightscout-exporter
# Open index.html in your browser
```

### Project Structure
```
nightscout-exporter/
├── index.html      # Main HTML interface
├── style.css       # Styling
├── script.js       # Core functionality
├── README.md       # This file
└── LICENSE         # MIT License
```

### API Endpoints Used

**Fetch Entries:**
```
GET https://your-nightscout.com/api/v1/entries.json?count=100
Headers:
  api-secret: <sha1-hash>
```

**Response Format:**
```json
[
  {
    "_id": "...",
    "type": "sgv",
    "sgv": 120,
    "date": 1712345678000,
    "dateString": "2024-04-05T20:00:00.000Z",
    "trend": "Flat",
    "device": "DexcomG6"
  }
]
```

---

## About Mieru Health

This tool was built by [Mieru Health](https://mieru.health) — a marketplace where diabetics can monetize their CGM data while contributing to diabetes research.

**How it works:**
- Diabetics upload their CGM data
- Data is anonymized and listed on marketplace
- Researchers purchase datasets for studies
- Users earn $50-300 per dataset

[Join the waitlist](https://mieru.health) to be among the first to monetize your glucose data.

---

## License

MIT License - See [LICENSE](LICENSE) file

---

## Support

- **Issues:** [GitHub Issues](https://github.com/wisejester-sudo/nightscout-exporter/issues)
- **Email:** support@mieru.health
- **Twitter:** [@mieruhealth](https://twitter.com/mieruhealth)

---

**Made with ❤️ for the Nightscout community**
