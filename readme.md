# Ellipse Solar - Sales Portal

A pure frontend web-based sales portal for Ellipse Solar EPC business that generates professional quotations with PDF downloads and WhatsApp sharing.

## 🌟 Features

- **✨ No Installation Required**: Pure HTML/CSS/JavaScript - just open and use
- **Interactive Parameter Selection**: Choose system size, panel type, inverter type, and mounting
- **Real-time Cost Calculation**: Instant quotation preview with detailed breakdown
- **Professional PDF Generation**: Beautiful, branded PDF quotations
- **WhatsApp Integration**: Direct sharing to customer's WhatsApp (via web.whatsapp.com)
- **Configurable Pricing**: JSON file for easy rate updates
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Offline Ready**: No server or internet required (except for WhatsApp sharing)

## 🚀 Quick Start

### Method 1: Double-Click (Easiest)

1. Navigate to the `public` folder
2. Double-click `index.html`
3. The portal will open in your default browser
4. Start creating quotations!

### Method 2: Local Server (Recommended for testing)

If you have Python installed:

```bash
# Navigate to the public folder
cd public

# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Then open: `http://localhost:8000`

### Method 3: VS Code Live Server

1. Install "Live Server" extension in VS Code
2. Right-click `public/index.html`
3. Select "Open with Live Server"

## 📁 Project Structure

```
ellipse-solar-sales-portal/
├── public/
│   ├── index.html          # Main application
│   ├── styles.css          # Styling
│   ├── script.js           # Application logic
│   └── rates.json          # Pricing and specifications (EDIT THIS)
├── .gitignore
└── README.md               # This file
```

## 🔧 Configuration

### Updating Prices and Rates

Edit `public/rates.json` to update pricing:


```json
{
  "solarPanels": {
    "monocrystalline": {
      "pricePerWatt": 25,      // ₹ per Watt
      "efficiency": 0.22,      // 22% efficiency
      "warranty": 25           // years
    },
    "polycrystalline": {
      "pricePerWatt": 20,
      "efficiency": 0.18,
      "warranty": 20
    },
    "bifacial": {
      "pricePerWatt": 30,
      "efficiency": 0.24,
      "warranty": 30
    }
  },
  "inverters": {
    "string": {
      "pricePerKW": 8000,      // ₹ per kW
      "efficiency": 0.97
    },
    "microinverter": {
      "pricePerKW": 12000,
      "efficiency": 0.96
    },
    "hybrid": {
      "pricePerKW": 15000,
      "efficiency": 0.95
    }
  },
  "mounting": {
    "rooftop": {
      "pricePerKW": 3000
    },
    "ground": {
      "pricePerKW": 5000
    },
    "carport": {
      "pricePerKW": 7000
    }
  },
  "installation": {
    "baseRate": 5000,          // Base installation cost
    "perKWRate": 2000          // Additional per kW
  },
  "profitMargin": 0.20,        // 20% profit margin
  "gst": 0.18,                 // 18% GST
  "subsidyPerKW": 18000,       // ₹18,000 per kW subsidy
  "maxSubsidyKW": 3            // Max 3 kW eligible
}
```

### Panel Types Available

1. **Monocrystalline**: High efficiency (22%), premium pricing
2. **Polycrystalline**: Standard efficiency (18%), economical
3. **Bifacial**: Premium efficiency (24%), highest cost

### Inverter Types

1. **String Inverter**: Standard, cost-effective
2. **Micro Inverter**: Panel-level optimization
3. **Hybrid Inverter**: Battery support capability

### Mounting Options

1. **Rooftop**: Most common, lower cost
2. **Ground Mount**: Higher installation cost
3. **Carport/Canopy**: Premium installation

## 📊 Calculation Logic

### Total Cost Calculation

```
Panel Cost = System Size (kW) × 1000 × Price per Watt
Inverter Cost = System Size × Inverter Price per kW
Mounting Cost = System Size × Mounting Price per kW
Installation = Base Rate + (System Size × Per kW Rate)

Subtotal = Panel + Inverter + Mounting + Installation
Profit = Subtotal × 20%
Total Before Tax = Subtotal + Profit
GST = Total Before Tax × 18%
Total Amount = Total Before Tax + GST

Subsidy = Min(System Size, 3 kW) × ₹18,000
Final Amount = Total Amount - Subsidy
```

### Energy Generation Estimate

```
Annual Generation (kWh) = System Size × Panel Efficiency × 
                         5 hours/day × 365 days
```

## 💡 Usage Guide

### For Sales Team

1. **Open** `public/index.html` in your browser
2. **Fill Customer Details**:
   - Customer name
   - Location
   - WhatsApp number (with country code, e.g., 919876543210)

3. **Configure System**:
   - Choose system size (1-1000 kW)
   - Select panel type
   - Select inverter type
   - Choose mounting type
4. **Preview** by clicking "Calculate Estimate"
5. **Generate** by clicking "Generate Quotation & PDF"
6. **Download** the PDF or **Share via WhatsApp**

### For Administrators

1. **Update Pricing**: Edit `public/rates.json`
2. **Adjust Margins**: Change `profitMargin` value
3. **Update Subsidies**: Modify `subsidyPerKW` and `maxSubsidyKW`
4. **Refresh Browser**: Changes take effect on page reload

## 📱 WhatsApp Integration

The WhatsApp feature uses the web API (`wa.me`) which:
- Opens WhatsApp Web or App
- Pre-fills a message with quotation details
- Lets you send directly to customer
- Works on all devices with WhatsApp

**Format**: Enter phone number with country code (no + symbol)
- Example: 919876543210 (for India +91)
- Example: 14155552671 (for USA +1)

## 🎨 Customization

### Update Company Branding

1. **Company Name**: Edit in `public/index.html` and `public/script.js`
2. **Colors**: Edit CSS variables in `public/styles.css`:
   ```css
   :root {
       --primary-color: #FF6B00;  /* Orange */
       --secondary-color: #FFE5D9; /* Light orange */
   }
   ```
3. **Contact Info**: Update footer in `public/index.html`
4. **PDF Layout**: Modify `generatePDF()` function in `public/script.js`

### Adding Your Logo

1. Add logo image to `public/` folder (e.g., `logo.png`)
2. Update header in `public/index.html`:
   ```html
   <div class="logo">
       <img src="logo.png" alt="Ellipse Solar" style="height: 60px;">
       <h1>ELLIPSE SOLAR</h1>
   </div>
   ```

## 🔒 Security & Privacy

- **No Data Storage**: All calculations happen in browser
- **No Server Required**: Complete privacy, no data transmitted
- **Local Configuration**: Rates stored locally on your computer
- **Safe Sharing**: WhatsApp only shares quotation summary

## 📦 Deployment Options

### Option 1: USB Drive

1. Copy entire folder to USB drive
2. Share with sales team
3. They can run directly from USB

### Option 2: Company Network

1. Place folder on shared network drive
2. Team accesses via network path
3. Update `public/rates.json` centrally

### Option 3: Web Hosting (Free)

#### GitHub Pages
1. Create GitHub repository
2. Upload files to repository
3. Enable GitHub Pages in settings
4. Access via: `https://yourusername.github.io/repo-name/public/`

#### Netlify/Vercel
1. Drag and drop `public` folder
2. Get instant URL
3. Free forever for static sites

### Option 4: Simple Cloud Storage

1. Upload to Google Drive / Dropbox
2. Share folder with team
3. Each person downloads and runs locally

## 🐛 Troubleshooting

### PDF Not Generating
- Ensure internet connection for jsPDF library (first load only)
- Check browser console for errors (F12)
- Try different browser (Chrome recommended)

### Config Not Loading
- Ensure `public/rates.json` exists
- Check JSON syntax (use jsonlint.com)
- Verify file path is correct

### WhatsApp Not Opening
- Ensure phone number format is correct (country code without +)
- Check if WhatsApp is installed on device
- Try WhatsApp Web on desktop

### Calculation Errors
- Verify all numeric values in `public/rates.json`
- Ensure no missing properties in config
- Check browser console for specific error

## 📈 Future Enhancements

- [ ] Multiple currency support
- [ ] Email quotation feature
- [ ] Save quotations to browser storage
- [ ] Export to Excel
- [ ] Battery storage calculations
- [ ] ROI calculator
- [ ] Financing options
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Print-friendly version

## 💾 Backup Your Data

**Important**: Always backup `public/rates.json` before updating!

```bash
# Create backup
cp public/rates.json rates_backup_2024-03-15.json
```

## 📞 Support

For questions or customization help:
- Email: support@ellipsesolar.com
- Phone: +91-XXXXXXXXXX

## 📄 License

© 2024 Ellipse Solar. All rights reserved.

---

## Quick Tips

✅ **Update rates regularly** to stay competitive
✅ **Train your sales team** on using the calculator
✅ **Test calculations** before showing to customers
✅ **Keep PDFs organized** by date/customer
✅ **Follow up** after sending quotations

Made with ☀️ for Ellipse Solar
