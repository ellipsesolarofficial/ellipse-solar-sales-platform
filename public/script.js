const form = document.getElementById('quotationForm');
const calculateBtn = document.getElementById('calculateBtn');
const resultContainer = document.getElementById('resultContainer');
const loading = document.getElementById('loading');

// Configuration loaded from rates.json (single source of truth)
let rates = null;

// Load rates - try fetch first (works on server), fallback to XMLHttpRequest
function loadRates() {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'rates.json', true);
        xhr.onload = function() {
            if (xhr.status === 200 || xhr.status === 0) { // status 0 for file:// protocol
                try {
                    rates = JSON.parse(xhr.responseText);
                    console.log('Configuration loaded from rates.json successfully');
                    resolve(rates);
                } catch(e) {
                    reject(e);
                }
            } else {
                reject(new Error('Failed to load rates.json'));
            }
        };
        xhr.onerror = function() {
            reject(new Error('Network error loading rates.json'));
        };
        xhr.send();
    });
}

loadRates().then(() => {
    initializeUI();
}).catch(err => {
    console.error('Failed to load rates.json:', err);
    alert('Error loading configuration. Please refresh the page.');
});

function initializeUI() {
    if (!rates) return;
    updatePanelCapacityByType();
    updateMixedSplitVisibility(false);
    updateInverterBrands();
    updateBatteryOptions(true);
    updatePanelCount();
}

console.log('Script loaded, fetching configuration...');

// JVVNL Domestic Tariff Slabs (FY 2025-26)
const jvvnlTariff = {
    slabs: [
        { uptoUnits: 50, ratePerUnit: 4.75, fixedCharge: 150 },
        { uptoUnits: 150, ratePerUnit: 6.00, fixedCharge: 150 },
        { uptoUnits: 300, ratePerUnit: 7.25, fixedCharge: 200 },
        { uptoUnits: 500, ratePerUnit: 7.95, fixedCharge: 250 },
        { uptoUnits: 99999, ratePerUnit: 8.50, fixedCharge: 300 }
    ],
    surchargePerUnit: 1.0,  // Regulatory asset surcharge
    unitsPerKWPerDay: 5.15     // 1 kW system generates 5.45 units/day
};

// Calculate monthly units from bill amount (reverse calculation)
function calculateUnitsFromBill(billAmount, freeUnits) {
    // Try each slab to find which one matches the bill
    let totalUnits = 0;
    let prevSlabLimit = 0;
    
    for (const slab of jvvnlTariff.slabs) {
        const slabUnits = slab.uptoUnits - prevSlabLimit;
        const effectiveRate = slab.ratePerUnit + jvvnlTariff.surchargePerUnit;
        const slabCost = slabUnits * effectiveRate;
        const fixedCharge = slab.fixedCharge;
        
        // Check if remaining bill fits in this slab
        const remainingBill = billAmount - fixedCharge;
        if (remainingBill <= 0) break;
        
        // Calculate how many units at this slab rate would give this bill
        const unitsAtThisRate = remainingBill / effectiveRate;
        
        if (unitsAtThisRate <= slab.uptoUnits) {
            totalUnits = unitsAtThisRate;
            break;
        }
        
        prevSlabLimit = slab.uptoUnits;
    }
    
    // More accurate: iterative approach
    // Calculate bill for increasing units until we match
    totalUnits = 0;
    for (let units = 1; units <= 5000; units++) {
        const calculatedBill = calculateBillFromUnits(units, freeUnits);
        if (calculatedBill >= billAmount) {
            totalUnits = units;
            break;
        }
    }
    
    return totalUnits;
}

// Calculate bill from units consumed
function calculateBillFromUnits(totalUnits, freeUnits) {
    let billableUnits = totalUnits;
    if (freeUnits) {
        billableUnits = Math.max(0, totalUnits - 100);
    }
    
    let energyCharge = 0;
    let fixedCharge = 0;
    let remaining = billableUnits;
    let prevLimit = 0;
    
    // Determine which slab the total consumption falls in (for fixed charge)
    for (const slab of jvvnlTariff.slabs) {
        if (billableUnits <= slab.uptoUnits) {
            fixedCharge = slab.fixedCharge;
            break;
        }
    }
    
    // Calculate energy charges slab-wise
    for (const slab of jvvnlTariff.slabs) {
        if (remaining <= 0) break;
        const slabUnits = Math.min(remaining, slab.uptoUnits - prevLimit);
        energyCharge += slabUnits * slab.ratePerUnit;
        remaining -= slabUnits;
        prevLimit = slab.uptoUnits;
    }
    
    // Add surcharge
    const surcharge = billableUnits * jvvnlTariff.surchargePerUnit;
    
    return energyCharge + fixedCharge + surcharge;
}

// Calculate recommended system size from bill
function calculateRecommendedSystem(billAmount, freeUnits) {
    const monthlyUnits = calculateUnitsFromBill(billAmount, freeUnits);
    const dailyUnits = monthlyUnits / 30;
    const recommendedKW = dailyUnits / jvvnlTariff.unitsPerKWPerDay;
    
    return {
        monthlyUnits: Math.round(monthlyUnits),
        dailyUnits: Math.round(dailyUnits * 10) / 10,
        recommendedKW: Math.ceil(recommendedKW),
        exactKW: Math.round(recommendedKW * 10) / 10
    };
}

// Bill recommendation UI handler
function updateBillRecommendation() {
    const billInput = document.getElementById('monthlyBill');
    const freeUnitsSelect = document.getElementById('freeUnits');
    const recommendationDiv = document.getElementById('billRecommendation');
    const recommendationText = document.getElementById('billRecommendationText');
    
    const bill = parseFloat(billInput.value) || 0;
    const freeUnits = freeUnitsSelect.value === 'yes';
    
    if (bill <= 0) {
        recommendationDiv.style.display = 'none';
        return;
    }
    
    const result = calculateRecommendedSystem(bill, freeUnits);
    
    recommendationDiv.style.display = 'block';
    recommendationText.innerHTML = `
        <div style="margin-bottom: 6px;">Monthly consumption: <strong>${result.monthlyUnits} units</strong></div>
        <div style="margin-bottom: 6px;">Daily consumption: <strong>${result.dailyUnits} units/day</strong></div>
        <div style="margin-bottom: 6px;">Recommended system: <strong>${result.recommendedKW} kW</strong> (exact: ${result.exactKW} kW)</div>
        <div style="margin-top: 10px;">
            <button type="button" onclick="applyRecommendation(${result.recommendedKW})" style="background: #00D09C; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                ✓ Use ${result.recommendedKW} kW
            </button>
        </div>
    `;
}

// Apply recommendation to system size dropdown
function applyRecommendation(kw) {
    const systemSizeSelect = document.getElementById('systemSize');
    const targetValue = String(kw);
    
    // Check if value exists in dropdown
    const optionExists = Array.from(systemSizeSelect.options).some(opt => opt.value === targetValue);
    
    if (optionExists) {
        systemSizeSelect.value = targetValue;
    } else {
        // Add the option if it doesn't exist
        const option = document.createElement('option');
        option.value = targetValue;
        option.textContent = `${kw} kW`;
        systemSizeSelect.appendChild(option);
        systemSizeSelect.value = targetValue;
    }
    
    // Trigger change events
    systemSizeSelect.dispatchEvent(new Event('change'));
    updatePanelCount();
    
    // Update inverter capacity to match
    const inverterCapInput = document.getElementById('inverterCapacity');
    if (inverterCapInput) {
        inverterCapInput.value = kw;
    }
}

// Loan & Subsidy Calculator
const loanConfig = {
    maxLoanAmount: 200000,
    interestRate: 5.75, // annual %
    loanTenureMonths: 120, // 10 years default
    centerSubsidy: { 1: 30000, 2: 60000, '3+': 78000 },
    stateSubsidy: 17000,
    systemLifeYears: 30,
    unitsPerKWPerDay: 5.15,
    avgElectricityRate: 7.5, // avg ₹/unit saved (when using yourself)
    govtBuybackRate: 3.26   // govt buys exported units at ₹3.26/unit
};

function calculateLoanDetails(finalAmount, systemSize, availStateSubsidy, monthlyConsumption) {
    // Calculate center subsidy
    let centerSubsidy = 0;
    if (systemSize >= 3) {
        centerSubsidy = loanConfig.centerSubsidy['3+'];
    } else if (systemSize >= 2) {
        centerSubsidy = loanConfig.centerSubsidy[2];
    } else if (systemSize >= 1) {
        centerSubsidy = loanConfig.centerSubsidy[1];
    }
    
    // State subsidy
    const stateSubsidy = availStateSubsidy ? loanConfig.stateSubsidy : 0;
    
    // Total subsidy
    const totalSubsidy = centerSubsidy + stateSubsidy;
    
    // Amount after subsidy (loan amount needed)
    const amountAfterSubsidy = finalAmount - totalSubsidy;
    const loanAmount = Math.min(amountAfterSubsidy, loanConfig.maxLoanAmount);
    const outOfPocket = Math.max(0, amountAfterSubsidy - loanConfig.maxLoanAmount);
    
    // EMI calculation (reducing balance)
    const monthlyRate = loanConfig.interestRate / 100 / 12;
    const tenure = loanConfig.loanTenureMonths;
    const emi = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenure) / (Math.pow(1 + monthlyRate, tenure) - 1);
    const totalPayable = emi * tenure;
    const totalInterest = totalPayable - loanAmount;
    
    // Monthly savings from solar
    const monthlyUnitsGenerated = systemSize * loanConfig.unitsPerKWPerDay * 30;
    
    // Customer uses some units, govt buys only leftover
    const leftoverUnits = Math.max(0, monthlyUnitsGenerated - monthlyConsumption);
    
    // Govt buys leftover at ₹3.26/unit
    const monthlyGovtBuyback = leftoverUnits * loanConfig.govtBuybackRate;
    
    // Effective EMI = EMI - money from selling excess units
    const effectiveCost = emi - monthlyGovtBuyback;
    
    const monthlySaving = 0; // not used in this logic
    const totalMonthlyBenefit = monthlyGovtBuyback;
    
    // Payback period = principal paid off by (bill saved + govt buyback) per month
    // Bill saved = customer's monthly bill amount (they no longer pay it)
    // Govt buyback = excess units sold
    const monthlyBillSaved = monthlyConsumption * loanConfig.avgElectricityRate;
    const monthlyTotalReturn = monthlyBillSaved + monthlyGovtBuyback;
    const paybackMonths = Math.ceil(amountAfterSubsidy / (monthlyTotalReturn || 1));
    const paybackYears = (paybackMonths / 12).toFixed(1);
    
    // 30-year savings (bill saved + govt buyback over 30 years, minus principal)
    const totalSavings30Years = monthlyTotalReturn * 12 * loanConfig.systemLifeYears;
    const netSavings30Years = totalSavings30Years - totalPayable - outOfPocket;
    
    return {
        systemCost: finalAmount,
        centerSubsidy,
        stateSubsidy,
        totalSubsidy,
        amountAfterSubsidy,
        loanAmount,
        outOfPocket,
        emi: Math.round(emi),
        totalPayable: Math.round(totalPayable),
        totalInterest: Math.round(totalInterest),
        monthlySaving: Math.round(monthlySaving),
        monthlyGovtBuyback: Math.round(monthlyGovtBuyback),
        effectiveCost: Math.round(effectiveCost),
        monthlyUnitsGenerated: Math.round(monthlyUnitsGenerated),
        leftoverUnits: Math.round(leftoverUnits),
        monthlyConsumption: Math.round(monthlyConsumption),
        paybackMonths,
        paybackYears,
        totalSavings30Years: Math.round(totalSavings30Years),
        netSavings30Years: Math.round(netSavings30Years),
        exceedsLimit: amountAfterSubsidy > loanConfig.maxLoanAmount
    };
}

function renderLoanChart(loanData) {
    const totalYears = 30;
    const paybackYears = parseFloat(loanData.paybackYears);
    const paybackPercent = Math.min((paybackYears / totalYears) * 100, 100);
    const savingsPercent = 100 - paybackPercent;
    
    let chartHTML = `
        <div style="font-size: 0.85em;">
            <div style="margin-bottom: 8px; font-weight: 600;">Payback Period (out of 30-year system life):</div>
            <div style="background: #e8e8e8; border-radius: 6px; height: 36px; overflow: hidden; display: flex; position: relative;">
                <div style="background: #e67e22; height: 100%; width: ${paybackPercent}%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.8em; font-weight: 600;">
                    ${paybackYears} yrs
                </div>
                <div style="background: #9E9E9E; height: 100%; width: ${savingsPercent}%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.8em; font-weight: 600;">
                    ${(totalYears - paybackYears).toFixed(1)} yrs FREE
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 0.8em; color: #666;">
                <span><span style="display:inline-block;width:10px;height:10px;background:#e67e22;border-radius:2px;margin-right:4px;"></span>Payback period</span>
                <span><span style="display:inline-block;width:10px;height:10px;background:#00D09C;border-radius:2px;margin-right:4px;"></span>Pure savings period</span>
            </div>
            <div style="background: #f0fff4; padding: 10px; border-radius: 6px; text-align: center; margin-top: 12px;">
                <div style="font-size: 0.85em;">30-Year Net Savings: <strong style="color: #00895e; font-size: 1.1em;">₹${loanData.netSavings30Years.toLocaleString('en-IN')}</strong></div>
            </div>
        </div>
    `;
    
    return chartHTML;
}

function showLoanDetails(finalAmount) {
    const availLoan = document.getElementById('availLoan').value;
    const availStateSubsidy = document.getElementById('availStateSubsidy').value === 'yes';
    const loanDuration = parseInt(document.getElementById('loanDuration').value) || 10;
    const loanDetailsDiv = document.getElementById('loanDetails');
    const systemSize = parseFloat(document.getElementById('systemSize').value) || 3;
    
    if (availLoan !== 'yes') {
        loanDetailsDiv.style.display = 'none';
        return;
    }
    
    // Get monthly consumption from bill input
    const monthlyBill = parseFloat(document.getElementById('monthlyBill').value) || 0;
    const freeUnits = document.getElementById('freeUnits').value === 'yes';
    const monthlyConsumption = monthlyBill > 0 ? calculateUnitsFromBill(monthlyBill, freeUnits) : 0;
    
    loanConfig.loanTenureMonths = loanDuration * 12;
    const loanData = calculateLoanDetails(finalAmount, systemSize, availStateSubsidy, monthlyConsumption);
    
    let summaryHTML = `
        <table style="width: 100%; font-size: 0.9em; border-collapse: collapse;">
            <tr><td style="padding: 4px 0;">System Cost:</td><td style="text-align: right; font-weight: 600;">₹${loanData.systemCost.toLocaleString('en-IN')}</td></tr>
            <tr><td style="padding: 4px 0;">Center Subsidy:</td><td style="text-align: right; color: green;">- ₹${loanData.centerSubsidy.toLocaleString('en-IN')}</td></tr>
            ${loanData.stateSubsidy > 0 ? `<tr><td style="padding: 4px 0;">State Subsidy:</td><td style="text-align: right; color: green;">- ₹${loanData.stateSubsidy.toLocaleString('en-IN')}</td></tr>` : ''}
            <tr style="border-top: 1px solid #ccc;"><td style="padding: 4px 0; font-weight: 600;">Amount After Subsidy:</td><td style="text-align: right; font-weight: 600;">₹${loanData.amountAfterSubsidy.toLocaleString('en-IN')}</td></tr>
            ${loanData.exceedsLimit ? `<tr><td style="padding: 4px 0; color: #e74c3c;">⚠️ Exceeds ₹2L loan limit:</td><td style="text-align: right; color: #e74c3c; font-weight: 600;">₹${loanData.outOfPocket.toLocaleString('en-IN')} out-of-pocket</td></tr>` : ''}
            <tr><td style="padding: 4px 0;">Loan Amount:</td><td style="text-align: right;">₹${loanData.loanAmount.toLocaleString('en-IN')}</td></tr>
            <tr><td style="padding: 4px 0;">EMI (${loanConfig.loanTenureMonths} months @ ${loanConfig.interestRate}%):</td><td style="text-align: right; font-weight: 600; color: #e67e22;">₹${loanData.emi.toLocaleString('en-IN')}/month</td></tr>
            <tr><td style="padding: 4px 0;">Total Interest:</td><td style="text-align: right;">₹${loanData.totalInterest.toLocaleString('en-IN')}</td></tr>
            <tr style="border-top: 1px solid #ccc;"><td style="padding: 4px 0;">Units Generated/month:</td><td style="text-align: right;">${loanData.monthlyUnitsGenerated} units</td></tr>
            <tr><td style="padding: 4px 0;">Units Used by Customer:</td><td style="text-align: right;">${loanData.monthlyConsumption} units</td></tr>
            <tr><td style="padding: 4px 0;">Excess Units Sold to Govt:</td><td style="text-align: right; color: #00895e;">${loanData.leftoverUnits} units</td></tr>
            <tr><td style="padding: 4px 0;">Money from Govt (₹3.26/unit):</td><td style="text-align: right; color: #00895e; font-weight: 600;">₹${loanData.monthlyGovtBuyback.toLocaleString('en-IN')}/month</td></tr>
            <tr><td style="padding: 4px 0;">EMI:</td><td style="text-align: right; color: #e67e22;">₹${loanData.emi.toLocaleString('en-IN')}/month</td></tr>
            <tr style="border-top: 1px solid #ccc; background: #fff5f0;"><td style="padding: 6px 0; font-weight: 600;">You Actually Pay (EMI - Govt Money):</td><td style="text-align: right; font-weight: 700; font-size: 1.1em; color: #e67e22;">₹${loanData.effectiveCost.toLocaleString('en-IN')}/month</td></tr>
            <tr><td style="padding: 4px 0;">Payback Period:</td><td style="text-align: right; font-weight: 600;">${loanData.paybackYears} years</td></tr>
            <tr><td style="padding: 4px 0;">30-Year Net Savings:</td><td style="text-align: right; color: #00895e; font-weight: 600;">₹${loanData.netSavings30Years.toLocaleString('en-IN')}</td></tr>
        </table>
    `;
    
    document.getElementById('loanSummaryContent').innerHTML = summaryHTML;
    document.getElementById('loanChart').innerHTML = renderLoanChart(loanData);
    loanDetailsDiv.style.display = 'block';
}

// Available wattages for the selected brand + panel technology
function getBrandCapacityConfig(panelBrand, panelType) {
    const techKey = panelType === 'monoperc_bifacial' ? 'monoperc' : 'topcon';
    const brandConfig = (rates.solarPanels && rates.solarPanels[panelBrand]) || rates.solarPanels.ina;
    const tech = brandConfig[techKey] || {};
    const capacities = Array.isArray(tech.capacities) && tech.capacities.length
        ? tech.capacities
        : (techKey === 'topcon' ? [600, 610, 615, 620] : [540, 545, 550]);
    const defaultCapacity = capacities.includes(tech.defaultCapacity)
        ? tech.defaultCapacity
        : capacities[0];
    return { capacities, defaultCapacity, techKey };
}

// Function to update panel capacity options based on brand and panel type
function updatePanelCapacityByType() {
    const panelType = document.getElementById('panelType').value;
    const panelBrand = document.getElementById('panelBrand').value;
    const panelCapacitySelect = document.getElementById('panelCapacity');
    const previous = parseInt(panelCapacitySelect.value, 10);
    const { capacities, defaultCapacity } = getBrandCapacityConfig(panelBrand, panelType);
    
    panelCapacitySelect.innerHTML = '';
    
    const selectedWatt = capacities.includes(previous) ? previous : defaultCapacity;
    
    capacities.forEach(watt => {
        const option = document.createElement('option');
        option.value = watt;
        option.textContent = `${watt}W`;
        if (watt === selectedWatt) option.selected = true;
        panelCapacitySelect.appendChild(option);
    });
    
    updatePanelCount();
}

// Legacy function - now delegates to updatePanelCapacityByType
function updatePanelCapacityOptions() {
    updatePanelCapacityByType();
}

// Populate inverter brands for the selected system type
function updateInverterBrands() {
    const systemType = document.getElementById('systemType').value;
    const select = document.getElementById('inverterBrand');
    const brands = rates.inverters[systemType] || {};
    const previous = select.value;
    
    select.innerHTML = '';
    Object.keys(brands).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = brands[key].name;
        select.appendChild(option);
    });
    
    // Keep the current brand selected when it also exists for the new system type
    if (brands[previous]) select.value = previous;
    
    const typeConfig = rates.systemTypes[systemType];
    document.getElementById('inverterBrandHint').textContent =
        `${typeConfig ? typeConfig.name : 'On-Grid'} inverter pricing`;
}

function getBatteryChemistryConfig(key) {
    const chemistries = rates.batteryChemistries || {};
    return chemistries[key] || { name: 'Lead-Acid', usableFactor: rates.batteryUsableFactor || 0.8333 };
}

function getBatteriesForChemistry(chemistry) {
    return Object.entries(rates.batteries || {}).filter(([, config]) =>
        (config.chemistry || 'lead_acid') === chemistry
    );
}

function batteryUsableFactor(chemistry) {
    const chem = getBatteryChemistryConfig(chemistry);
    return chem.usableFactor || rates.batteryUsableFactor || 0.8333;
}

// Usable kWh for a battery: AH × V, kept at the chemistry's usable share
function batteryKwh(ah, voltage, quantity, chemistry) {
    const factor = batteryUsableFactor(chemistry);
    const kwh = (ah * voltage * (quantity || 1) * factor) / 1000;
    return Math.round(kwh * 100) / 100;
}

function batteryOptionLabel(opt, chemistry) {
    const kwh = batteryKwh(opt.ah, opt.voltage, 1, chemistry);
    return opt.model ? `${opt.label} · ${opt.model} (${kwh} kWh)` : `${opt.label} (${kwh} kWh)`;
}

// Populate chemistry, brand, and capacity pickers, and show/hide the battery section
function updateBatteryOptions(resetBrand) {
    const backupRequired = document.getElementById('batteryBackup').value === 'yes';
    const chemistrySelect = document.getElementById('batteryChemistry');
    const brandSelect = document.getElementById('batteryBrand');
    const optionSelect = document.getElementById('batteryOption');
    
    document.getElementById('batteryOptionsGroup').style.display = backupRequired ? 'block' : 'none';
    
    const defaultChemistries = {
        lead_acid: { name: 'Lead-Acid' },
        lithium_ion: { name: 'Lithium-Ion (LiFePO4)' }
    };
    const chemistries = rates.batteryChemistries || defaultChemistries;
    
    if (chemistrySelect && (resetBrand || !chemistrySelect.options.length)) {
        const previousChem = chemistrySelect.value;
        chemistrySelect.innerHTML = '';
        Object.entries(chemistries).forEach(([key, config]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = config.name;
            chemistrySelect.appendChild(option);
        });
        if (previousChem && chemistries[previousChem]) chemistrySelect.value = previousChem;
    }
    
    const chemistry = (chemistrySelect && chemistrySelect.value) || 'lead_acid';
    const brands = getBatteriesForChemistry(chemistry);
    
    const previousBrand = brandSelect.value;
    brandSelect.innerHTML = '';
    brands.forEach(([key, config]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = config.name;
        brandSelect.appendChild(option);
    });
    if (brands.some(([key]) => key === previousBrand)) brandSelect.value = previousBrand;
    
    const brandConfig = rates.batteries[brandSelect.value] || (brands[0] && brands[0][1]);
    const previousOption = optionSelect.value;
    
    optionSelect.innerHTML = '';
    ((brandConfig && brandConfig.options) || []).forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.id;
        option.textContent = batteryOptionLabel(opt, chemistry);
        optionSelect.appendChild(option);
    });
    
    const stillAvailable = ((brandConfig && brandConfig.options) || []).some(o => o.id === previousOption);
    if (stillAvailable) optionSelect.value = previousOption;
    
    updateBatteryTotalHint();
    updateBatteryInverterOptions(resetBrand);
}

// On-grid + battery backup needs a separate inverter for the battery bank
function updateBatteryInverterOptions(resetBrand) {
    const group = document.getElementById('batteryInverterGroup');
    if (!group || !rates.batteryInverters) return;
    
    const backupRequired = document.getElementById('batteryBackup').value === 'yes';
    const isOnGrid = document.getElementById('systemType').value === 'ongrid';
    const show = backupRequired && isOnGrid;
    
    group.style.display = show ? 'block' : 'none';
    if (!show) return;
    
    const brandSelect = document.getElementById('batteryInverterBrand');
    const optionSelect = document.getElementById('batteryInverterOption');
    
    if (resetBrand || !brandSelect.options.length) {
        const previousBrand = brandSelect.value;
        brandSelect.innerHTML = '';
        Object.keys(rates.batteryInverters).forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = rates.batteryInverters[key].name;
            brandSelect.appendChild(option);
        });
        if (rates.batteryInverters[previousBrand]) brandSelect.value = previousBrand;
    }
    
    const brandConfig = rates.batteryInverters[brandSelect.value] || Object.values(rates.batteryInverters)[0];
    const previousOption = optionSelect.value;
    
    optionSelect.innerHTML = '';
    (brandConfig.options || []).forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.id;
        option.textContent = opt.label;
        optionSelect.appendChild(option);
    });
    
    const stillAvailable = (brandConfig.options || []).some(o => o.id === previousOption);
    if (stillAvailable) optionSelect.value = previousOption;
}

// Show the running battery bank total under the quantity input
function updateBatteryTotalHint() {
    const hint = document.getElementById('batteryTotalHint');
    const selected = getSelectedBattery();
    const quantity = parseInt(document.getElementById('batteryQuantity').value) || 0;
    
    if (!selected || quantity <= 0) {
        hint.textContent = 'Total usable capacity of the battery bank';
        return;
    }
    
    hint.innerHTML = `<span style="color: #00895e;">${quantity} × ${selected.label} = ${batteryKwh(selected.ah, selected.voltage, quantity, selected.chemistryKey)} kWh total</span>`;
}

// Resolve the currently selected battery option from the form
function getSelectedBattery() {
    const brandKey = document.getElementById('batteryBrand').value;
    const optionId = document.getElementById('batteryOption').value;
    const chemistryKey = document.getElementById('batteryChemistry')
        ? document.getElementById('batteryChemistry').value
        : 'lead_acid';
    const brandConfig = rates.batteries[brandKey];
    if (!brandConfig) return null;
    
    const option = (brandConfig.options || []).find(o => o.id === optionId);
    if (!option) return null;
    
    const chemistry = getBatteryChemistryConfig(brandConfig.chemistry || chemistryKey);
    return {
        ...option,
        brandKey,
        brandName: brandConfig.name,
        warranty: brandConfig.warranty,
        chemistryKey: brandConfig.chemistry || chemistryKey,
        chemistryName: chemistry.name
    };
}

// Nearest whole-panel count for a target capacity (floor/round/ceil, closest wins)
function nearestPanelCount(targetKW, panelWattage) {
    const targetWatts = targetKW * 1000;
    const exactPanels = targetWatts / panelWattage;
    
    const candidates = [Math.floor(exactPanels), Math.round(exactPanels), Math.ceil(exactPanels)];
    
    let best = candidates[0];
    let bestDiff = Infinity;
    candidates.forEach(count => {
        const diff = Math.abs(targetWatts - count * panelWattage);
        if (diff < bestDiff) {
            bestDiff = diff;
            best = count;
        }
    });
    
    // Ensure minimum of 1 panel
    return best < 1 ? 1 : best;
}

// Read the DCR / Non-DCR selection, including a mixed capacity split
function getPanelCategorySelection(systemSize) {
    const category = document.getElementById('panelCategory').value;
    
    if (category !== 'mixed') {
        return { category, segments: [{ key: category, kW: systemSize }] };
    }
    
    const dcrKW = parseFloat(document.getElementById('dcrCapacity').value) || 0;
    const nonDcrKW = parseFloat(document.getElementById('nonDcrCapacity').value) || 0;
    
    return {
        category,
        dcrKW,
        nonDcrKW,
        segments: [
            { key: 'dcr', kW: dcrKW },
            { key: 'nonDcr', kW: nonDcrKW }
        ].filter(s => s.kW > 0)
    };
}

// Show/hide the split inputs and keep them in step with the system size
function updateMixedSplitVisibility(rebalance) {
    const category = document.getElementById('panelCategory').value;
    const group = document.getElementById('mixedSplitGroup');
    const systemSize = parseFloat(document.getElementById('systemSize').value) || 0;
    const dcrInput = document.getElementById('dcrCapacity');
    const nonDcrInput = document.getElementById('nonDcrCapacity');
    
    if (category !== 'mixed') {
        group.style.display = 'none';
        return;
    }
    
    group.style.display = 'block';
    dcrInput.max = systemSize;
    nonDcrInput.max = systemSize;
    
    // Prefill a roughly even split when opening the section or changing system size
    if (rebalance) {
        const dcrShare = Math.ceil(systemSize / 2);
        dcrInput.value = dcrShare;
        nonDcrInput.value = systemSize - dcrShare;
    }
    
    validateMixedSplit();
}

// Validate that the split adds up, and report it in the hint line
function validateMixedSplit() {
    const hint = document.getElementById('mixedSplitHint');
    const systemSize = parseFloat(document.getElementById('systemSize').value) || 0;
    const dcrKW = parseFloat(document.getElementById('dcrCapacity').value) || 0;
    const nonDcrKW = parseFloat(document.getElementById('nonDcrCapacity').value) || 0;
    const total = dcrKW + nonDcrKW;
    
    if (Math.abs(total - systemSize) < 0.001) {
        hint.innerHTML = `<span style="color: #00895e;">✓ ${dcrKW} kW DCR + ${nonDcrKW} kW Non-DCR = ${systemSize} kW</span>`;
        return true;
    }
    
    const diff = (systemSize - total).toFixed(2).replace(/\.00$/, '');
    hint.innerHTML = `<span style="color: #E55D00;">Split totals ${total} kW but system is ${systemSize} kW (${diff > 0 ? diff + ' kW short' : Math.abs(diff) + ' kW over'})</span>`;
    return false;
}

// Dynamic panel count calculation with alternatives
function updatePanelCount() {
    const systemSize = parseFloat(document.getElementById('systemSize').value) || 0;
    const panelCapacity = parseFloat(document.getElementById('panelCapacity').value) || 545;
    
    if (systemSize > 0 && panelCapacity > 0) {
        const systemWatts = systemSize * 1000;
        const selection = getPanelCategorySelection(systemSize);
        
        // Mixed split gets its own per-segment summary instead of ± alternatives
        if (selection.category === 'mixed') {
            const segments = selection.segments.map(s => ({
                label: s.key === 'nonDcr' ? 'Non-DCR' : 'DCR',
                requestedKW: s.kW,
                panels: nearestPanelCount(s.kW, panelCapacity)
            }));
            
            const totalPanels = segments.reduce((sum, s) => sum + s.panels, 0);
            const totalW = totalPanels * panelCapacity;
            const diffW = totalW - systemWatts;
            
            let mixedText = `${totalPanels} panels = ${totalW.toLocaleString()} W`;
            if (Math.abs(diffW) > 10) {
                mixedText += diffW > 0
                    ? ` <span style="font-size: 0.9em; color: #0088CC;">(+${diffW.toLocaleString()} W extra)</span>`
                    : ` <span style="font-size: 0.9em; color: #E55D00;">(${diffW.toLocaleString()} W less)</span>`;
            } else {
                mixedText += ` <span style="font-size: 0.9em; color: #00D09C;">✓ Perfect match!</span>`;
            }
            
            document.getElementById('panelCountValue').innerHTML = mixedText;
            document.getElementById('panelAlternatives').innerHTML = segments.map(s => `
                <div style="margin-bottom: 4px;">
                    <span style="color: #0088CC;">${s.label}: ${s.panels} panels = ${(s.panels * panelCapacity).toLocaleString()} W</span>
                    <span style="font-size: 0.85em;">(for ${s.requestedKW} kW)</span>
                </div>
            `).join('');
            return;
        }
        
        const recommendedPanels = nearestPanelCount(systemSize, panelCapacity);
        
        // Calculate capacities in watts
        const recommendedCapacityW = recommendedPanels * panelCapacity;
        const minusPanels = Math.max(1, recommendedPanels - 1);
        const plusPanels = recommendedPanels + 1;
        
        const minusCapacityW = minusPanels * panelCapacity;
        const plusCapacityW = plusPanels * panelCapacity;
        
        const minusDiffW = systemWatts - minusCapacityW;
        const plusDiffW = plusCapacityW - systemWatts;
        const recommendedDiffW = recommendedCapacityW - systemWatts;
        
        // Update main recommendation
        let mainText = `${recommendedPanels} panels = ${recommendedCapacityW.toLocaleString()} W`;
        if (Math.abs(recommendedDiffW) > 10) { // Changed threshold to 10W instead of 0.01kW
            if (recommendedDiffW > 0) {
                mainText += ` <span style="font-size: 0.9em; color: #0088CC;">(+${recommendedDiffW.toLocaleString()} W extra)</span>`;
            } else {
                mainText += ` <span style="font-size: 0.9em; color: #E55D00;">(${recommendedDiffW.toLocaleString()} W less)</span>`;
            }
        } else {
            mainText += ` <span style="font-size: 0.9em; color: #00D09C;">✓ Perfect match!</span>`;
        }
        
        document.getElementById('panelCountValue').innerHTML = mainText;
        
        // Update alternatives
        let alternativesHTML = '';
        
        // Show -1 panel option if it makes sense
        if (minusPanels !== recommendedPanels) {
            const minusStatus = minusDiffW >= 0 
                ? `<span style="font-size: 0.85em; color: #E55D00;">(${minusDiffW.toLocaleString()} W less)</span>`
                : `<span style="font-size: 0.85em; color: #0088CC;">(${Math.abs(minusDiffW).toLocaleString()} W extra)</span>`;
            
            alternativesHTML += `
                <div style="margin-bottom: 4px;">
                    <span style="color: #E55D00;">↓ ${minusPanels} panels = ${minusCapacityW.toLocaleString()} W</span> ${minusStatus}
                </div>
            `;
        }
        
        // Show +1 panel option
        const plusStatus = plusDiffW >= 0 
            ? `<span style="font-size: 0.85em; color: #0088CC;">(${plusDiffW.toLocaleString()} W extra)</span>`
            : `<span style="font-size: 0.85em; color: #E55D00;">(${Math.abs(plusDiffW).toLocaleString()} W less)</span>`;
        
        alternativesHTML += `
            <div>
                <span style="color: #0088CC;">↑ ${plusPanels} panels = ${plusCapacityW.toLocaleString()} W</span> ${plusStatus}
            </div>
        `;
        
        document.getElementById('panelAlternatives').innerHTML = alternativesHTML;
    }
}

// Calculate earthing wire length based on number of floors
function calculateEarthingWireLength(numberOfFloors) {
    // Base calculation: 50m base + 15m per additional floor
    const baseLength = 50;
    const perFloorLength = 15;
    return baseLength + (parseInt(numberOfFloors) - 1) * perFloorLength;
}

// Add event listeners for dynamic updates
document.addEventListener('DOMContentLoaded', function() {
    const systemSizeSelect = document.getElementById('systemSize');
    const panelCapacitySelect = document.getElementById('panelCapacity');
    const inverterCapacityInput = document.getElementById('inverterCapacity');
    const panelBrandSelect = document.getElementById('panelBrand');
    const panelTypeSelect = document.getElementById('panelType');
    
    // Update panel count when system size or panel capacity changes
    if (systemSizeSelect) {
        systemSizeSelect.addEventListener('change', function() {
            // Re-split a mixed selection across the new system size
            updateMixedSplitVisibility(true);
            updatePanelCount();
            
            // Also update inverter capacity to match system size
            if (inverterCapacityInput) {
                inverterCapacityInput.value = this.value;
            }
        });
    }
    
    const panelCategorySelect = document.getElementById('panelCategory');
    if (panelCategorySelect) {
        panelCategorySelect.addEventListener('change', function() {
            updateMixedSplitVisibility(this.value === 'mixed');
            updatePanelCount();
        });
    }
    
    ['dcrCapacity', 'nonDcrCapacity'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', function() {
                validateMixedSplit();
                updatePanelCount();
            });
        }
    });
    
    const systemTypeSelect = document.getElementById('systemType');
    if (systemTypeSelect) {
        systemTypeSelect.addEventListener('change', function() {
            updateInverterBrands();
            updateBatteryInverterOptions(false);
        });
    }
    
    const batteryBackupSelect = document.getElementById('batteryBackup');
    if (batteryBackupSelect) {
        batteryBackupSelect.addEventListener('change', () => updateBatteryOptions(false));
    }
    
    const batteryChemistrySelect = document.getElementById('batteryChemistry');
    if (batteryChemistrySelect) {
        batteryChemistrySelect.addEventListener('change', () => updateBatteryOptions(false));
    }
    
    const batteryBrandSelect = document.getElementById('batteryBrand');
    if (batteryBrandSelect) {
        batteryBrandSelect.addEventListener('change', () => updateBatteryOptions(false));
    }
    
    const batteryInverterBrandSelect = document.getElementById('batteryInverterBrand');
    if (batteryInverterBrandSelect) {
        batteryInverterBrandSelect.addEventListener('change', () => updateBatteryInverterOptions(false));
    }
    
    const batteryOptionSelect = document.getElementById('batteryOption');
    if (batteryOptionSelect) {
        batteryOptionSelect.addEventListener('change', updateBatteryTotalHint);
    }
    
    const batteryQuantityInput = document.getElementById('batteryQuantity');
    if (batteryQuantityInput) {
        batteryQuantityInput.addEventListener('input', updateBatteryTotalHint);
    }
    
    if (panelCapacitySelect) {
        panelCapacitySelect.addEventListener('change', updatePanelCount);
    }
    
    if (panelBrandSelect) {
        panelBrandSelect.addEventListener('change', updatePanelCapacityOptions);
    }
    
    if (panelTypeSelect) {
        panelTypeSelect.addEventListener('change', updatePanelCapacityByType);
    }
    
    // Initial setup - populate capacities based on default panel type
    if (rates) {
        initializeUI();
    }
    // If rates not yet loaded, initializeUI() will be called after fetch completes
    
    // Bill recommendation listeners
    const monthlyBillInput = document.getElementById('monthlyBill');
    const freeUnitsSelect = document.getElementById('freeUnits');
    
    if (monthlyBillInput) {
        monthlyBillInput.addEventListener('input', updateBillRecommendation);
    }
    if (freeUnitsSelect) {
        freeUnitsSelect.addEventListener('change', updateBillRecommendation);
    }
    
    // Loan section listeners
    const availLoanSelect = document.getElementById('availLoan');
    const availStateSubsidySelect = document.getElementById('availStateSubsidy');
    if (availLoanSelect) {
        availLoanSelect.addEventListener('change', function() {
            if (this.value === 'no') {
                document.getElementById('loanDetails').style.display = 'none';
            }
        });
    }
});

// Fixed profit for this brand + system size. The table value is used as-is.
function getBrandProfit(brandConfig, systemSize) {
    const table = brandConfig && brandConfig.profitByCapacity;
    const key = String(Math.round(systemSize));
    if (table && table[key] != null) {
        return Number(table[key]) || 0;
    }
    return 0;
}

function formatCurrency(amount) {
    return '₹' + amount.toLocaleString('en-IN');
}

// Capitalize first letter
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Get inverter price - supports both flat pricePerKW and tier-based pricing (e.g., Polycab)
function getInverterPrice(inverterConfig, capacityKW, phaseType) {
    // If inverter has simple pricePerKW, use that
    if (inverterConfig.pricePerKW) {
        return capacityKW * inverterConfig.pricePerKW;
    }
    
    // If inverter has tier-based pricing (like Polycab)
    if (inverterConfig.pricingTiers) {
        const tiers = inverterConfig.pricingTiers;
        // Up to 4kW always use 1 Phase inverter
        let phase = (phaseType === '3phase' || phaseType === '3ph') ? '3Ph' : '1Ph';
        if (capacityKW <= 4) {
            phase = '1Ph';
        }
        
        // Build a list of matching tiers for the given phase
        const matchingTiers = [];
        for (const [key, tier] of Object.entries(tiers)) {
            if (tier.phase === phase) {
                // Extract numeric kW from the key (e.g., "6_3ph_1mppt" -> 6, "10_2mppt" -> 10)
                const kwMatch = key.match(/^(\d+\.?\d*)/);
                if (kwMatch) {
                    matchingTiers.push({
                        key: key,
                        kw: parseFloat(kwMatch[1]),
                        price: tier.price,
                        mppt: tier.mppt
                    });
                }
            }
        }
        
        // Sort by kW ascending
        matchingTiers.sort((a, b) => a.kw - b.kw);
        
        // Find exact match first
        const exactMatch = matchingTiers.find(t => t.kw === capacityKW);
        if (exactMatch) {
            return exactMatch.price;
        }
        
        // Find closest tier that is >= requested capacity
        const closestHigher = matchingTiers.find(t => t.kw >= capacityKW);
        if (closestHigher) {
            return closestHigher.price;
        }
        
        // If requested capacity is larger than all tiers, use the largest available
        if (matchingTiers.length > 0) {
            return matchingTiers[matchingTiers.length - 1].price;
        }
        
        // Fallback: try all tiers regardless of phase
        const allTiers = [];
        for (const [key, tier] of Object.entries(tiers)) {
            const kwMatch = key.match(/^(\d+\.?\d*)/);
            if (kwMatch) {
                allTiers.push({ kw: parseFloat(kwMatch[1]), price: tier.price });
            }
        }
        allTiers.sort((a, b) => a.kw - b.kw);
        
        const fallbackMatch = allTiers.find(t => t.kw >= capacityKW);
        if (fallbackMatch) return fallbackMatch.price;
        if (allTiers.length > 0) return allTiers[allTiers.length - 1].price;
    }
    
    // Ultimate fallback
    return capacityKW * 44450;
}

// Calculate quotation
function calculateQuotation(params) {
    if (!rates) {
        throw new Error('Configuration not loaded');
    }
    
    const { 
        systemSize, 
        panelBrand, 
        panelCapacity, 
        panelType,
        panelCategory,
        dcrCapacity,
        nonDcrCapacity,
        inverterCapacity, 
        inverterBrand, 
        systemType,
        batteryBackup,
        batteryChemistry,
        batteryBrand,
        batteryOption,
        batteryQuantity,
        batteryInverterBrand,
        batteryInverterOption,
        structureBrand,
        phaseType,
        siteType,
        numberOfFloors,
        commission,
        discount,
        customerName, 
        location 
    } = params;
    
    // Ensure numeric values are properly parsed
    const numSystemSize = parseFloat(systemSize) || 0;
    const { capacities: brandCapacities, defaultCapacity: brandDefaultCapacity } = getBrandCapacityConfig(panelBrand, panelType);
    const parsedCapacity = parseInt(panelCapacity, 10);
    const numPanelCapacity = brandCapacities.includes(parsedCapacity) ? parsedCapacity : brandDefaultCapacity;
    const numInverterCapacity = parseFloat(inverterCapacity) || numSystemSize;
    const numCommission = parseFloat(commission) || 0;
    const numDiscount = parseFloat(discount) || 0;
    const numFloors = parseInt(numberOfFloors) || 1;
    
    // Resolve system type (on-grid / off-grid / hybrid)
    const systemTypeKey = rates.systemTypes[systemType] ? systemType : 'ongrid';
    const systemTypeConfig = rates.systemTypes[systemTypeKey];
    
    // Determine technology key (monoperc or topcon)
    const techKey = panelType === 'monoperc_bifacial' ? 'monoperc' : 'topcon';
    
    // Get panel brand config
    const brandConfig = rates.solarPanels[panelBrand] || rates.solarPanels['ina'];
    const rateFor = key => brandConfig[techKey]?.[key]?.pricePerWatt || 24;
    
    // Split the requested capacity into DCR / Non-DCR parts (one part unless mixed)
    const isMixed = panelCategory === 'mixed';
    let requestedSegments;
    if (isMixed) {
        requestedSegments = [
            { key: 'dcr', kW: parseFloat(dcrCapacity) || 0 },
            { key: 'nonDcr', kW: parseFloat(nonDcrCapacity) || 0 }
        ].filter(s => s.kW > 0);
        
        if (!requestedSegments.length) {
            throw new Error('Enter a DCR and/or Non-DCR capacity for the mixed split');
        }
        
        const splitTotal = requestedSegments.reduce((sum, s) => sum + s.kW, 0);
        if (Math.abs(splitTotal - numSystemSize) > 0.001) {
            throw new Error(`DCR + Non-DCR split is ${splitTotal} kW but the system is ${numSystemSize} kW`);
        }
    } else {
        const singleKey = panelCategory === 'nonDcr' ? 'nonDcr' : 'dcr';
        requestedSegments = [{ key: singleKey, kW: numSystemSize }];
    }
    
    // Resolve each part into whole panels at its own rate
    const panelSegments = requestedSegments.map(s => {
        const panels = nearestPanelCount(s.kW, numPanelCapacity);
        const pricePerWatt = rateFor(s.key);
        const capacityW = panels * numPanelCapacity;
        return {
            key: s.key,
            label: s.key === 'nonDcr' ? 'Non-DCR' : 'DCR',
            requestedKW: s.kW,
            panels,
            capacityW,
            pricePerWatt,
            cost: Math.round(pricePerWatt * capacityW)
        };
    });
    
    const categoryLabel = isMixed
        ? panelSegments.map(s => `${s.requestedKW}kW ${s.label}`).join(' + ')
        : panelSegments[0].label;
    
    const panelCount = panelSegments.reduce((sum, s) => sum + s.panels, 0);
    const totalPanelWatts = panelSegments.reduce((sum, s) => sum + s.capacityW, 0);
    
    // Blended rate, for display when the split mixes two prices
    const blendedPricePerWatt = totalPanelWatts > 0
        ? panelSegments.reduce((sum, s) => sum + s.pricePerWatt * s.capacityW, 0) / totalPanelWatts
        : rateFor('dcr');
    
    // Build panel config
    const adjustedPanelConfig = {
        name: `${brandConfig.name} (Bifacial, ${categoryLabel})`,
        pricePerWatt: Math.round(blendedPricePerWatt * 100) / 100,
        wattage: numPanelCapacity,
        warranty: brandConfig.warranty || 25
    };
    
    // Get inverter config for this system type
    const inverterSet = rates.inverters[systemTypeKey] || rates.inverters.ongrid;
    const inverterConfig = inverterSet[inverterBrand] || Object.values(inverterSet)[0];
    
    // Get structure brand config
    const structureConfig = rates.structureBrands[structureBrand] || rates.structureBrands.tata;
    
    // Calculate actual system capacity based on panel count
    const actualSystemCapacity = totalPanelWatts / 1000;
    
    // 1. PANELS - Calculate base cost (no per-item GST)
    const panelBaseCost = panelSegments.reduce((sum, s) => sum + s.cost, 0);
    
    // 2. INVERTER - Calculate base cost (no per-item GST)
    const inverterBaseCost = getInverterPrice(inverterConfig, numInverterCapacity, phaseType);
    
    // 2b. BATTERY BANK - added when the salesperson says backup is required
    const numBatteryQuantity = parseInt(batteryQuantity) || 0;
    let batteryDetails = null;
    let batteryBaseCost = 0;
    
    if (batteryBackup === 'yes' && numBatteryQuantity > 0) {
        const chemistryKey = batteryChemistry || (rates.batteries[batteryBrand] && rates.batteries[batteryBrand].chemistry) || 'lead_acid';
        const chemistryBrands = getBatteriesForChemistry(chemistryKey);
        const requestedBrand = rates.batteries[batteryBrand];
        const batteryBrandConfig = (requestedBrand && (requestedBrand.chemistry || 'lead_acid') === chemistryKey)
            ? requestedBrand
            : (chemistryBrands[0] && chemistryBrands[0][1]) || Object.values(rates.batteries)[0];
        const selectedOption = (batteryBrandConfig.options || []).find(o => o.id === batteryOption)
            || (batteryBrandConfig.options || [])[0];
        
        if (selectedOption) {
            const chemistryConfig = getBatteryChemistryConfig(batteryBrandConfig.chemistry || chemistryKey);
            batteryBaseCost = selectedOption.price * numBatteryQuantity;
            batteryDetails = {
                brand: batteryBrandConfig.name,
                chemistry: chemistryConfig.name,
                chemistryKey,
                model: selectedOption.model || null,
                label: selectedOption.label,
                ah: selectedOption.ah,
                voltage: selectedOption.voltage,
                unitPrice: selectedOption.price,
                quantity: numBatteryQuantity,
                kwhPerUnit: batteryKwh(selectedOption.ah, selectedOption.voltage, 1, chemistryKey),
                kwhTotal: batteryKwh(selectedOption.ah, selectedOption.voltage, numBatteryQuantity, chemistryKey),
                warranty: batteryBrandConfig.warranty,
                total: Math.round(batteryBaseCost)
            };
        }
    }
    
    // On-grid + backup needs a dedicated battery inverter in addition to the solar inverter
    let batteryInverterDetails = null;
    let batteryInverterCost = 0;
    
    if (batteryBackup === 'yes' && systemTypeKey === 'ongrid') {
        const biBrands = rates.batteryInverters || {};
        const biBrandConfig = biBrands[batteryInverterBrand] || Object.values(biBrands)[0];
        const selectedInverter = biBrandConfig && ((biBrandConfig.options || []).find(o => o.id === batteryInverterOption)
            || (biBrandConfig.options || [])[0]);
        
        if (selectedInverter) {
            batteryInverterCost = selectedInverter.price;
            batteryInverterDetails = {
                brand: biBrandConfig.name,
                label: selectedInverter.label,
                capacityKW: selectedInverter.capacityKW,
                unitPrice: selectedInverter.price,
                warranty: biBrandConfig.warranty,
                total: Math.round(batteryInverterCost)
            };
        }
    }
    
    // 3. Calculate all component costs (no per-item GST)
    const componentCosts = {};
    let totalComponentsCost = 0;
    
    Object.keys(rates.components).forEach(key => {
        const comp = { ...rates.components[key] }; // Clone to avoid modifying original
        
        // Structure is priced by system capacity (kW)
        if (key === 'structure') {
            const capacityKey = String(Math.round(numSystemSize));
            const structureCost = comp.pricingByCapacity[capacityKey] || comp.pricingByCapacity['10'] || 25099.6;
            componentCosts[key] = {
                name: comp.description || 'Structure',
                brand: comp.brand,
                rate: structureCost,
                quantity: 1,
                baseCost: Math.round(structureCost),
                total: Math.round(structureCost)
            };
            totalComponentsCost += structureCost;
            return;
        }
        
        // ACDB + DCDB combo - price depends on phase and system size
        if (key === 'acdb-dcdb-combo') {
            let comboPrice = 2000; // default 1ph
            const phase = (phaseType === '3phase' || phaseType === '3ph') ? '3ph' : '1ph';
            if (phase === '1ph') {
                comboPrice = comp.pricing['1ph_1_6'];
            } else if (numSystemSize <= 10) {
                comboPrice = comp.pricing['3ph_5_10'];
            } else {
                comboPrice = comp.pricing['3ph_10_20'];
            }
            componentCosts[key] = {
                name: comp.description || 'ACDB + DCDB Combo',
                brand: comp.brand,
                rate: comboPrice,
                quantity: 1,
                baseCost: Math.round(comboPrice),
                total: Math.round(comboPrice)
            };
            totalComponentsCost += comboPrice;
            return;
        }
        
        // Earthing Wire - depends on phase and floors
        if (key === 'earthingWire') {
            const phase = (phaseType === '3phase' || phaseType === '3ph') ? '3ph' : '1ph';
            const wireConfig = comp.pricing[phase];
            const length = comp.baseLength + (numFloors - 1) * comp.perFloorExtra;
            const cost = wireConfig.ratePerMeter * length;
            componentCosts[key] = {
                name: `${comp.description} (${wireConfig.size}, ${length}m)`,
                brand: comp.brand,
                rate: wireConfig.ratePerMeter,
                quantity: length,
                baseCost: Math.round(cost),
                total: Math.round(cost)
            };
            totalComponentsCost += cost;
            return;
        }
        
        // DC Wire - depends on floors
        if (key === 'dcWire') {
            const length = comp.baseLength + (numFloors - 1) * comp.perFloorExtra;
            const cost = comp.ratePerMeter * length;
            componentCosts[key] = {
                name: `${comp.description} (${length}m)`,
                brand: comp.brand,
                rate: comp.ratePerMeter,
                quantity: length,
                baseCost: Math.round(cost),
                total: Math.round(cost)
            };
            totalComponentsCost += cost;
            return;
        }
        
        // Black Pipe - same length as earthing wire
        if (key === 'blackPipe') {
            const phase = (phaseType === '3phase' || phaseType === '3ph') ? '3ph' : '1ph';
            const earthingComp = rates.components['earthingWire'];
            const length = earthingComp.baseLength + (numFloors - 1) * earthingComp.perFloorExtra;
            const cost = comp.ratePerMeter * length;
            componentCosts[key] = {
                name: `${comp.description} (${length}m)`,
                brand: comp.brand,
                rate: comp.ratePerMeter,
                quantity: length,
                baseCost: Math.round(cost),
                total: Math.round(cost)
            };
            totalComponentsCost += cost;
            return;
        }
        
        // AC Wire (Armoured Cable) - depends on phase
        if (key === 'acWire') {
            const phase = (phaseType === '3phase' || phaseType === '3ph') ? '3ph' : '1ph';
            const wireConfig = comp.pricing[phase];
            const length = comp.length;
            const cost = wireConfig.ratePerMeter * length;
            componentCosts[key] = {
                name: `${comp.description} (${wireConfig.size}, ${length}m)`,
                brand: comp.brand,
                rate: wireConfig.ratePerMeter,
                quantity: length,
                baseCost: Math.round(cost),
                total: Math.round(cost)
            };
            totalComponentsCost += cost;
            return;
        }
        
        // Solar Meter - phase-based pricing
        if (key === 'solarMeter' && comp.pricing) {
            const phase = (phaseType === '3phase' || phaseType === '3ph') ? '3ph' : '1ph';
            const price = comp.pricing[phase];
            componentCosts[key] = {
                name: 'Solar Meter',
                brand: comp.brand,
                rate: price,
                quantity: 1,
                baseCost: Math.round(price),
                total: Math.round(price)
            };
            totalComponentsCost += price;
            return;
        }
        
        // MC4 Connector quantity = number of panels + 4
        if (key === 'mc4Connector') {
            comp.quantity = panelCount + 4;
        }
        
        // Drain clips: 2 per panel (30mm universal)
        if (key === 'drainClip') {
            comp.quantity = panelCount * (comp.quantityPerPanel || 2);
        }
        
        const baseCost = (comp.rate || 0) * (comp.quantity || 0);
        const total = baseCost;
        
        componentCosts[key] = {
            name: comp.description || key,
            brand: comp.brand,
            rate: comp.rate,
            quantity: comp.quantity,
            baseCost: Math.round(baseCost),
            total: Math.round(total)
        };
        
        totalComponentsCost += baseCost;
    });
    
    // 4. Additional charges
    const additionalCharges = { ...rates.additionalCharges };
    
    // Calculate civil work material as per kW rate × system size
    additionalCharges.civilWorkMaterial = Math.round(additionalCharges.civilWorkMaterialPerKW * numSystemSize);
    delete additionalCharges.civilWorkMaterialPerKW;
    
    const totalAdditionalCharges = Object.values(additionalCharges).reduce((sum, val) => sum + val, 0);
    
    // 5. Profit for this brand at this system size
    const profitAmount = getBrandProfit(brandConfig, numSystemSize);
    
    // 6. Calculate totals - GST applied on overall price (material + profit + additional + commission - discount)
    const totalMaterialCost = panelBaseCost + inverterBaseCost + batteryBaseCost + batteryInverterCost + totalComponentsCost;
    
    // 7. Apply commission and discount
    const commissionAmount = numCommission;
    const discountAmount = numDiscount;
    
    // Total before GST = material + profit + additional charges + commission - discount
    const totalBeforeGST = totalMaterialCost + profitAmount + totalAdditionalCharges + commissionAmount - discountAmount;
    const totalGSTAmount = totalBeforeGST * rates.gstRate;
    const totalAmount = totalBeforeGST + totalGSTAmount;
    const finalAmount = totalAmount;
    
    // 9. Calculate annual generation
    const panelEfficiency = 0.20; // Standard efficiency estimate
    const averageSunHours = 5;
    const annualGeneration = numSystemSize * panelEfficiency * averageSunHours * 365;
    
    return {
        customerName,
        location,
        systemSize: numSystemSize,
        actualSystemCapacity,
        capacityDifference: actualSystemCapacity - numSystemSize,
        phaseType,
        panelBrand,
        panelCapacity: numPanelCapacity,
        panelType: `${brandConfig.name} (Bifacial, ${categoryLabel})`,
        panelCategory,
        panelCategoryLabel: categoryLabel,
        panelSegments,
        inverterCapacity: numInverterCapacity,
        inverterBrand,
        systemType: systemTypeKey,
        systemTypeName: systemTypeConfig.name,
        systemTypeDocumentLabel: systemTypeConfig.documentLabel,
        batteryDetails,
        batteryInverterDetails,
        structureBrand: structureConfig.name,
        siteType,
        numberOfFloors: numFloors,
        panelCount,
        panelConfig: adjustedPanelConfig,
        inverterConfig,
        structureConfig,
        breakdown: {
            // Panel costs
            panelBaseCost: Math.round(panelBaseCost),
            
            // Inverter costs
            inverterBaseCost: Math.round(inverterBaseCost),
            
            // Battery bank (0 unless off-grid / hybrid with quantity)
            batteryBaseCost: Math.round(batteryBaseCost),
            batteryInverterCost: Math.round(batteryInverterCost),
            
            // Component costs breakdown
            componentCosts,
            totalComponentsCost: Math.round(totalComponentsCost),
            
            // Additional charges
            vendorLoginCharges: additionalCharges.vendorLoginCharges,
            transportation: additionalCharges.transportation,
            miscellaneous: additionalCharges.miscellaneous,
            discom: additionalCharges.discom,
            civilWorkMaterial: additionalCharges.civilWorkMaterial,
            totalAdditionalCharges: Math.round(totalAdditionalCharges),
            
            // Summary totals
            totalMaterialCost: Math.round(totalMaterialCost),
            profitAmount: Math.round(profitAmount),
            totalBeforeGST: Math.round(totalBeforeGST),
            totalGSTAmount: Math.round(totalGSTAmount),
            totalAmount: Math.round(totalAmount),
            commissionAmount: Math.round(commissionAmount),
            discountAmount: Math.round(discountAmount),
            finalAmount: Math.round(finalAmount)
        },
        technicalDetails: {
            panelWarranty: adjustedPanelConfig.warranty,
            inverterWarranty: inverterConfig.warranty,
            panelEfficiency: 0.20,
            estimatedAnnualGeneration: Math.round(annualGeneration)
        },
        date: new Date().toLocaleDateString('en-IN'),
        quotationId: 'ELS-' + Date.now()
    };
}

// Display quotation
function displayQuotation(data) {
    const q = data.quotation;
    
    // Update summary card
    document.getElementById('quoteFinalAmountSummary').textContent = formatCurrency(q.breakdown.finalAmount);
    
    document.getElementById('quoteCustomerName').textContent = q.customerName;
    document.getElementById('quoteDate').textContent = `Date: ${q.date} | Quote ID: ${q.quotationId}`;
    
    // Show both requested and actual capacity
    let sizeText = `${q.actualSystemCapacity.toFixed(2)} kW ${q.phaseType.toUpperCase()} ${q.systemTypeName} (${q.panelCount} Panels)`;
    if (Math.abs(q.capacityDifference) > 0.01) {
        if (q.capacityDifference > 0) {
            sizeText += ` <span style="font-size: 0.85em; color: #0088CC;">+${q.capacityDifference.toFixed(2)}kW from ${q.systemSize}kW requested</span>`;
        } else {
            sizeText += ` <span style="font-size: 0.85em; color: #E55D00;">${q.capacityDifference.toFixed(2)}kW from ${q.systemSize}kW requested</span>`;
        }
    }
    document.getElementById('quoteSize').innerHTML = sizeText;
    document.getElementById('quotePanelType').textContent = `${q.panelConfig.name}`;
    document.getElementById('quoteInverterType').textContent = `${q.inverterConfig.name} ${q.inverterCapacity}kW`
        + (q.batteryInverterDetails ? ` + ${q.batteryInverterDetails.brand} ${q.batteryInverterDetails.label} battery inverter` : '');
    document.getElementById('quoteMountingType').textContent = `${q.structureBrand} Structure - ${q.numberOfFloors} Floor(s)`;
    document.getElementById('quoteGeneration').textContent = 
        `${q.technicalDetails.estimatedAnnualGeneration.toLocaleString('en-IN')} kWh/year`;
    document.getElementById('quoteWarranty').textContent = 
        `Panel: ${q.technicalDetails.panelWarranty}Y | Inverter: ${q.technicalDetails.inverterWarranty}Y`
        + (q.batteryDetails ? ` | Battery: ${q.batteryDetails.warranty}Y` : '')
        + (q.batteryInverterDetails ? ` | Battery Inverter: ${q.batteryInverterDetails.warranty}Y` : '');
    
    // Bill of Material - fetched from rates.json displayNames
    const phaseKey = (q.phaseType === '3ph' || q.phaseType === '3phase') ? '3ph' : '1ph';
    const getDisplayName = (comp, key) => {
        if (!comp || !comp.displayName) return key;
        if (typeof comp.displayName === 'object') return comp.displayName[phaseKey] || key;
        return comp.displayName;
    };
    
    const rc = rates.components;
    const panelSummary = q.panelSegments.length > 1
        ? q.panelSegments.map(s => `${s.panels} ${s.label}`).join(' + ') + ` = ${q.panelCount} Panels`
        : `${q.panelCount} Panels`;
    
    const materialRows = [
        ['Solar Panels', `${q.panelConfig.name} - ${panelSummary}`],
        ['Inverter', `${q.inverterConfig.name} ${q.inverterCapacity}kW WiFi Enabled`],
        ...(q.batteryInverterDetails ? [['Inverter for Batteries', `${q.batteryInverterDetails.brand} ${q.batteryInverterDetails.label}`]] : []),
        ...(q.batteryDetails ? [['Battery Bank', `${q.batteryDetails.brand} ${q.batteryDetails.chemistry}${q.batteryDetails.model ? ' · ' + q.batteryDetails.model : ''} ${q.batteryDetails.label} (${q.batteryDetails.kwhPerUnit} kWh) × ${q.batteryDetails.quantity}`
            + (q.batteryDetails.quantity > 1 ? ` = ${q.batteryDetails.kwhTotal} kWh` : '')]] : []),
        ['Structure', `${getDisplayName(rc.structure, 'Structure')} - ${q.structureBrand}`],
        ['ACDB + DCDB', getDisplayName(rc['acdb-dcdb-combo'], 'Polycab')],
        ['Earthing', getDisplayName(rc.earthing1mtr, 'Chemical Earthing')],
        ['Earthing Wire', getDisplayName(rc.earthingWire, 'Earthing Wire')],
        ['DC Wire', getDisplayName(rc.dcWire, 'DC Wire')],
        ['AC Cable', getDisplayName(rc.acWire, 'AC Cable')],
        ['MC4 Connectors', `${getDisplayName(rc.mc4Connector, 'MC4 Connectors')} - ${q.panelCount + 4} Pairs`],
        ['Drain Clip', `${getDisplayName(rc.drainClip, 'Universal Drain Clip (30 MM)')} - ${q.panelCount * ((rc.drainClip && rc.drainClip.quantityPerPanel) || 2)} Pcs`],
        ['Lightning Arrester', getDisplayName(rc.lightningArrester, 'Lightning Arrester')],
        ['Solar Meter', getDisplayName(rc.solarMeter, 'L&T / HPL')]
    ];
    
    const materialListHTML = `
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85em;">
            ${materialRows.map((row, i) => `
            <tr${i < materialRows.length - 1 ? ' style="border-bottom: 1px solid #eee;"' : ''}><td style="padding: 6px 0;"><strong>${i + 1}.</strong> ${row[0]}</td><td style="text-align: right;">${row[1]}</td></tr>`).join('')}
        </table>
    `;
    document.getElementById('quoteMaterialList').innerHTML = materialListHTML;
    
    // Build breakdown HTML - check passcode for internal view
    const adminCode = document.getElementById('adminCode') ? document.getElementById('adminCode').value : '';
    const showInternal = adminCode === 'racecar';
    
    let breakdownHTML = '';
    
    if (showInternal) {
        // INTERNAL VIEW - full component breakdown
        breakdownHTML += q.panelSegments.map(s => `
            <tr>
                <td><strong>Solar Panels${q.panelSegments.length > 1 ? ' - ' + s.label : ''}</strong> (${s.panels} × ${q.panelConfig.wattage}W = ${s.capacityW}W × ₹${s.pricePerWatt}/W)</td>
                <td>${formatCurrency(s.cost)}</td>
            </tr>
        `).join('');
        
        breakdownHTML += `
            <tr>
                <td><strong>Inverter</strong> (${q.inverterCapacity}kW ${q.inverterConfig.name} - tier price)</td>
                <td>${formatCurrency(q.breakdown.inverterBaseCost)}</td>
            </tr>
        `;
        
        if (q.batteryInverterDetails) {
            breakdownHTML += `
                <tr>
                    <td><strong>Inverter for Batteries</strong> (${q.batteryInverterDetails.brand} ${q.batteryInverterDetails.label} × ₹${q.batteryInverterDetails.unitPrice})</td>
                    <td>${formatCurrency(q.breakdown.batteryInverterCost)}</td>
                </tr>
            `;
        }
        
        if (q.batteryDetails) {
            breakdownHTML += `
                <tr>
                    <td><strong>Battery Bank</strong> (${q.batteryDetails.quantity} × ${q.batteryDetails.brand} ${q.batteryDetails.chemistry} ${q.batteryDetails.label}${q.batteryDetails.model ? ' · ' + q.batteryDetails.model : ''} × ₹${q.batteryDetails.unitPrice})</td>
                    <td>${formatCurrency(q.breakdown.batteryBaseCost)}</td>
                </tr>
            `;
        }
        
        Object.keys(q.breakdown.componentCosts).forEach(key => {
            const comp = q.breakdown.componentCosts[key];
            if (comp && comp.total > 0) {
                breakdownHTML += `
                    <tr>
                        <td>${comp.name || key} (${comp.quantity} × ₹${comp.rate})</td>
                        <td>${formatCurrency(comp.total)}</td>
                    </tr>
                `;
            }
        });
        
        breakdownHTML += `
            <tr class="subtotal">
                <td><strong>Total Material Cost</strong></td>
                <td><strong>${formatCurrency(q.breakdown.totalMaterialCost)}</strong></td>
            </tr>
            <tr>
                <td>Profit (${q.panelConfig.name.split(' (')[0]}, ${q.systemSize}kW)</td>
                <td>${formatCurrency(q.breakdown.profitAmount)}</td>
            </tr>
            <tr>
                <td>Transportation</td>
                <td>${formatCurrency(q.breakdown.transportation)}</td>
            </tr>
            <tr>
                <td>Miscellaneous</td>
                <td>${formatCurrency(q.breakdown.miscellaneous)}</td>
            </tr>
            <tr>
                <td>DISCOM</td>
                <td>${formatCurrency(q.breakdown.discom)}</td>
            </tr>
            <tr>
                <td>Civil Work Material</td>
                <td>${formatCurrency(q.breakdown.civilWorkMaterial)}</td>
            </tr>
            <tr>
                <td>Sales Category (S)</td>
                <td>+ ${formatCurrency(q.breakdown.commissionAmount)}</td>
            </tr>
            <tr>
                <td>Discount (D)</td>
                <td>- ${formatCurrency(q.breakdown.discountAmount)}</td>
            </tr>
            <tr class="subtotal">
                <td><strong>Total Before GST</strong></td>
                <td><strong>${formatCurrency(q.breakdown.totalBeforeGST)}</strong></td>
            </tr>
            <tr>
                <td>GST (8.9%)</td>
                <td>${formatCurrency(q.breakdown.totalGSTAmount)}</td>
            </tr>
            <tr class="final-amount">
                <td><strong>Final Amount</strong></td>
                <td><strong>${formatCurrency(q.breakdown.finalAmount)}</strong></td>
            </tr>
        `;
    } else {
        // CUSTOMER VIEW - only price + GST + discount
        const displayPrice = q.breakdown.totalBeforeGST;
        breakdownHTML = `
            <tr>
                <td>System Price (${q.actualSystemCapacity.toFixed(2)} kW ${q.systemTypeDocumentLabel})</td>
                <td>${formatCurrency(displayPrice)}</td>
            </tr>
            <tr>
                <td>GST (8.9%)</td>
                <td>${formatCurrency(q.breakdown.totalGSTAmount)}</td>
            </tr>
            ${q.breakdown.discountAmount > 0 ? `
            <tr class="subsidy">
                <td>Discount</td>
                <td>- ${formatCurrency(q.breakdown.discountAmount)}</td>
            </tr>` : ''}
            <tr class="final-amount">
                <td><strong>Final Amount</strong></td>
                <td><strong>${formatCurrency(q.breakdown.finalAmount)}</strong></td>
            </tr>
        `;
    }
    
    document.querySelector('.breakdown-table tbody').innerHTML = breakdownHTML;
    
    resultContainer.style.display = 'block';
    resultContainer.scrollIntoView({ behavior: 'smooth' });
}


// Generate PDF using jsPDF
function generatePDF(quotation) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const q = quotation;
    
    const darkColor = [44, 51, 69];
    const blueColor = [52, 73, 166];
    const greenColor = [0, 150, 50];
    
    let y = 15;
    
    // Company Header - Logo left, Name centered, orange & black theme
    // Add logo
    try {
        const logoImg = document.querySelector('.company-logo');
        if (logoImg && logoImg.complete) {
            const canvas = document.createElement('canvas');
            canvas.width = logoImg.naturalWidth;
            canvas.height = logoImg.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(logoImg, 0, 0);
            const imgData = canvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', 15, 10, 30, 17);
        }
    } catch(e) { console.log('Logo not added to PDF'); }
    
    // Company name - centered, orange and black
    const orangeColor = [232, 98, 31];
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('ELLIPSE', 85, y + 3);
    doc.setTextColor(...orangeColor);
    doc.text(' SOLAR', 118, y + 3);
    
    y += 12;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text('Add.- Plot NO. 14, AB Heights, Baba Market, Teachers Colony, DCM, Ajmer Road, Jaipur - 302021', 105, y, { align: 'center' });
    y += 4;
    doc.text('GSTIN: 08GSYPM5879P1Z0 | Mob.- 9216054155, 9216054156', 105, y, { align: 'center' });
    
    y += 8;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.line(15, y, 195, y);
    
    y += 10;
    
    // Date
    doc.setFontSize(10);
    doc.text('Date: ' + q.date, 195, y, { align: 'right' });
    
    y += 10;
    
    // To section
    doc.setFont('helvetica', 'bold');
    doc.text('To,', 15, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    if (q.customerName) {
        doc.text(q.customerName + ' ji', 15, y);
        y += 5;
    }
    if (q.location) {
        doc.text(q.location, 15, y);
        y += 5;
    }
    
    y += 5;
    
    // Phase text
    const phaseText = (q.phaseType === '3ph' || q.phaseType === '3phase') ? '3Ph' : '1Ph';
    
    // Subject
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const subText = 'Sub: Proposal for Design, Erection & Commissioning of ' + q.systemSize + ' KW (' + phaseText + ') ' + q.systemTypeDocumentLabel + ' Power Plant.';
    doc.text(subText, 15, y, { maxWidth: 180 });
    
    y += 10;
    
    // Opening
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('With reference to our discussion, we are very pleased to offer you our best proposal for', 15, y);
    y += 4;
    doc.text('Roof top ' + q.systemTypeDocumentLabel + ' Power plant as follows:', 15, y);
    
    y += 10;
    
    // BOM Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Bill Of Material ' + q.systemTypeDocumentLabel + ' System', 15, y);
    
    y += 8;
    
    // BOM Table Header
    doc.setFontSize(8);
    doc.setFillColor(230, 230, 230);
    doc.rect(15, y, 180, 7, 'F');
    doc.text('Sr.No.', 17, y + 5);
    doc.text('Technical Details', 32, y + 5);
    doc.text('Makes', 85, y + 5);
    doc.text('Capacity', 125, y + 5);
    doc.text('Quantity', 165, y + 5);
    y += 7;
    
    doc.setFont('helvetica', 'normal');
    
    // Get panel brand name and DC/AC wire details
    const brandConfig = rates.solarPanels[q.panelBrand] || { name: 'INA' };
    const brandName = brandConfig.name;
    const dcWireSpec = '1C x 4 SQmm Copper';
    const acWireSpec = phaseText === '1Ph' ? '2C x 6 SQmm Aluminium' : '4C x 10 SQmm Copper';
    const drainClipQty = q.panelCount * ((rates.components.drainClip && rates.components.drainClip.quantityPerPanel) || 2);
    
    // BOM rows - modules always collapse into a single row; DCR/Non-DCR split is internal only
    const panelCapacityLabel = q.systemSize + ' kW';
    const bomItems = [
        ['Solar Module', brandName + ' (Bifacial)', panelCapacityLabel, String(q.panelCount)],
        ['PCU/Inverter', q.inverterConfig.name, q.inverterCapacity + 'kW (' + phaseText + ')', '1'],
        ...(q.batteryInverterDetails ? [['Battery Inverter', q.batteryInverterDetails.brand, q.batteryInverterDetails.label, '1']] : []),
        ...(q.batteryDetails ? [['Battery', `${q.batteryDetails.brand} (${q.batteryDetails.chemistry})`, q.batteryDetails.model ? `${q.batteryDetails.label} · ${q.batteryDetails.model}` : q.batteryDetails.label, String(q.batteryDetails.quantity)]] : []),
        ['Complete Set of Structure', 'G.I Standard (Tata/Apollo)', 'As per MNRE Standards', '1 Set'],
        ['DC Cable', 'Polycab', dcWireSpec, 'As per Site'],
        ['Armoured Cable', 'Polycab', acWireSpec, 'As per Site'],
        ['Drain Clip', 'Universal 30mm', '30 MM', String(drainClipQty)],
        ['Earthing Set with LA', 'Standard', 'Set', '3'],
        ['DCDB', 'Polycab', 'Set', '1'],
        ['ACDB', 'Polycab', 'Set', '1'],
        ['Balance of system', 'Standard', 'Set', 'As per System'],
        ['Solar Meter', 'L&T / HPL', 'Set', '1']
    ].map((row, index) => [String(index + 1), ...row]);
    
    bomItems.forEach(item => {
        if (y > 265) { doc.addPage(); y = 20; }
        doc.text(item[0], 17, y + 5);
        doc.text(item[1], 32, y + 5);
        doc.text(item[2], 85, y + 5);
        doc.text(String(item[3]), 125, y + 5, { maxWidth: 35 });
        doc.text(String(item[4]), 165, y + 5);
        doc.setDrawColor(200, 200, 200);
        doc.line(15, y + 7, 195, y + 7);
        y += 8;
    });
    
    // Page 2 - Commercial Offer
    doc.addPage();
    y = 20;
    
    // Commercial Offer Header
    doc.setFillColor(40, 40, 40);
    doc.rect(15, y, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Commercial Offer', 105, y + 5.5, { align: 'center' });
    
    y += 12;
    doc.setTextColor(...darkColor);
    doc.setFontSize(9);
    
    // 1. Project Cost
    doc.setFont('helvetica', 'bold');
    doc.text('1', 17, y);
    doc.text('Project Cost', 25, y);
    doc.setFont('helvetica', 'normal');
    y += 7;
    doc.text('Plant Size', 30, y); doc.text(q.systemSize + ' KW (' + phaseText + ')', 80, y);
    y += 5;
    doc.text('System Cost', 30, y); doc.text('INR ' + q.breakdown.finalAmount.toLocaleString('en-IN') + '/- (GST PAID)', 80, y);
    y += 5;
    doc.text('Extra As', 30, y); doc.text('NIL', 80, y);
    y += 5;
    doc.text('Discom Charge', 30, y); doc.text('Included', 80, y);
    y += 8;
    doc.setDrawColor(200, 200, 200); doc.line(15, y, 195, y); y += 5;
    
    // 2. Payment Terms
    doc.setFont('helvetica', 'bold');
    doc.text('2', 17, y); doc.text('Payment Terms', 25, y);
    doc.setFont('helvetica', 'normal');
    y += 7;
    doc.text('• 10%-Mobilization advance against Work Order.', 30, y); y += 5;
    doc.text('• 85%-Before delivery of material', 30, y); y += 5;
    doc.text('• 5%-After successful Commissioning of plant.', 30, y); y += 8;
    doc.line(15, y, 195, y); y += 5;
    
    // 3. Project Completion
    doc.setFont('helvetica', 'bold');
    doc.text('3', 17, y); doc.text('Project Completion', 25, y);
    doc.setFont('helvetica', 'normal');
    y += 7;
    doc.text('10-15 Days from the Clear order and Advance Payment.', 30, y); y += 8;
    doc.line(15, y, 195, y); y += 5;
    
    // 4. Validity
    doc.setFont('helvetica', 'bold');
    doc.text('4', 17, y); doc.text('Validity of Offer', 25, y);
    doc.setFont('helvetica', 'normal');
    y += 7;
    doc.text('2 Days from the date of offer. After this period a confirmation must be Taken.', 30, y); y += 8;
    doc.line(15, y, 195, y); y += 5;
    
    // 5. Client Scope
    doc.setFont('helvetica', 'bold');
    doc.text('5', 17, y); doc.text('Client Scope', 25, y);
    doc.setFont('helvetica', 'normal');
    y += 7;
    const clientScope = [
        'Cleaning of solar modules in your scope.',
        'One Person from client side for basic training of operation of Solar PV system.',
        'Roof to be arranged and provided by the client.',
        'Electricity & Water shall be provided by client during the construction.',
        'Provide safe storage space for the material being used for solar power plant.',
        'Provide Electricity supply to synchronize the inverter on commissioning.',
        'Provide connection space in the LT panel to connect the Inverter Output.',
        'Internet Connection to be provided by the client for remote Monitoring.'
    ];
    clientScope.forEach(item => {
        if (y > 265) { doc.addPage(); y = 20; }
        doc.text('• ' + item, 30, y, { maxWidth: 160 }); y += 5;
    });
    y += 3;
    doc.line(15, y, 195, y); y += 5;
    
    // 6. Transportation
    doc.setFont('helvetica', 'bold');
    doc.text('6', 17, y); doc.text('Transportation', 25, y);
    doc.setFont('helvetica', 'normal');
    y += 7;
    doc.text('• All Transportation Included of abovementioned BOM up to site of installation.', 30, y); y += 8;
    doc.line(15, y, 195, y); y += 5;
    
    // 7. Official Fees
    doc.setFont('helvetica', 'bold');
    doc.text('7', 17, y); doc.text('Official Fees', 25, y);
    doc.setFont('helvetica', 'normal');
    y += 7;
    doc.text('Included', 30, y); y += 8;
    doc.line(15, y, 195, y); y += 5;
    
    // 8. Warranty
    doc.setFont('helvetica', 'bold');
    doc.text('8', 17, y); doc.text('Solar System Warranty', 25, y);
    doc.setFont('helvetica', 'normal');
    y += 7;
    doc.text('5 Year Complete System warranty.', 30, y); y += 5;
    doc.text('Solar Module Performance Warranty 30 Years (as per MNRE Norms)', 30, y); y += 5;
    doc.text('Solar Inverter 10 Years.', 30, y); y += 10;
    
    // Space requirement
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.text('SPACE REQUIREMENT:', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(' Shadow free space for installation of Solar Module.', 60, y);
    
    y += 10;
    doc.text('Hope the above will be in line with your requirements, however if you require further', 15, y); y += 4;
    doc.text('information please feel free to contact us.', 15, y);
    y += 8;
    doc.text('Thanking you and assuring you of our very best & prompt attention at all times.', 15, y);
    
    y += 10;
    doc.text('Yours Faithfully', 15, y);
    y += 8;
    doc.text('Thanks & regards,', 15, y);
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('For, ELLIPSE SOLAR', 15, y);
    
    y += 15;
    
    // Bank Details
    doc.setFont('helvetica', 'bold');
    doc.text("Company's Bank Details", 15, y);
    doc.text('ELLIPSE SOLAR', 120, y);
    y += 7;
    doc.setDrawColor(180, 180, 180);
    doc.line(15, y, 195, y); y += 7;
    doc.setFont('helvetica', 'normal');
    doc.text('Bank Name', 15, y); doc.text('', 120, y); y += 7;
    doc.line(15, y, 195, y); y += 7;
    doc.text('A/c no.', 15, y); doc.text('', 120, y); y += 7;
    doc.line(15, y, 195, y); y += 7;
    doc.text('Branch & IFSC Code', 15, y); doc.text('', 120, y);
    
    return doc;
}


// Helper function to calculate panel count
function calculatePanelCount(systemSize, wattage = 600) {
    const panelCount = Math.ceil((systemSize * 1000) / wattage);
    return `${panelCount} Nos`;
}

// Send WhatsApp message
function sendWhatsApp(phoneNumber, quotation) {
    const greeting = quotation.customerName ? `Hello ${quotation.customerName}!` : 'Hello!';
    const message = `${greeting}

Thank you for your interest in Ellipse Solar. Your quotation for a ${quotation.systemSize}kW solar system is ready.

*Final Amount:* ₹${quotation.breakdown.finalAmount.toLocaleString('en-IN')}

*System Details:*
- Panel Type: ${quotation.panelType}
- Inverter: ${capitalize(quotation.inverterType)}
- Est. Annual Generation: ${quotation.technicalDetails.estimatedAnnualGeneration.toLocaleString('en-IN')} kWh/year

For queries, contact us at info@ellipsesolar.com`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
}

// Send quotation summary via WhatsApp (triggered from Calculate button)
function sendQuotationWhatsApp(phoneNumber) {
    const customerName = document.getElementById('customerName').value || '';
    const systemSize = document.getElementById('systemSize').value || '3';
    const finalAmountEl = document.getElementById('quoteFinalAmountSummary');
    const finalAmount = finalAmountEl ? finalAmountEl.textContent : '';
    
    const greeting = customerName ? `Hello ${customerName}!` : 'Hello!';
    const message = `${greeting}

Thank you for your interest in *Ellipse Solar*. Here's your solar system quotation:

⚡ *System:* ${systemSize} kW Solar On-Grid
💰 *Total Price:* ${finalAmount} (GST Included)

🏦 *Subsidy:*
• Central Govt. Subsidy: ₹78,000
• State Govt. Subsidy: ₹17,000

✅ *What you get:*
• 30 Years Panel Performance Warranty
• 5 Years Complete Maintenance & Cooperation Warranty
• End-to-end process handling (Banking, DISCOM, Net Metering)
• Zero electricity bill
• Net metering enabled

📞 For more details, feel free to contact us.

_Ellipse Solar - Powering a Greener Tomorrow_ 🌿`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
}

// Calculate button handler
calculateBtn.addEventListener('click', () => {
    const formData = new FormData(form);
    const params = Object.fromEntries(formData.entries());
    
    params.systemSize = parseFloat(params.systemSize);
    params.customerName = params.customerName || '';
    params.location = params.location || '';
    delete params.phoneNumber;
    delete params.salesperson;
    
    if (!params.systemSize) {
        alert('Please select a system size');
        return;
    }
    
    if (!rates) {
        alert('Configuration not loaded. Please refresh the page.');
        return;
    }
    
    loading.style.display = 'flex';
    
    try {
        const quotation = calculateQuotation(params);
        displayQuotation({ quotation });
        showLoanDetails(quotation.breakdown.finalAmount);
        
        const phoneNum = document.getElementById('phoneNumber').value;
        let actionsHTML = '<div style="text-align: center; margin-top: 15px;">';
        if (phoneNum) {
            actionsHTML += `
                <button type="button" onclick="sendQuotationWhatsApp('${phoneNum}')" class="btn btn-secondary" style="margin: 10px; background: #25D366; border-color: #25D366;">
                    💬 Send via WhatsApp
                </button>
            `;
        }
        actionsHTML += '<p style="color: #666; margin-top: 10px;">Click "Generate Quotation & PDF" to create the final document</p></div>';
        document.getElementById('quoteActions').innerHTML = actionsHTML;
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        loading.style.display = 'none';
    }
});


// Log quotation to Google Sheets
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzs-81APX5QnQyuftPkB3lz6zlHunk79R8Gvx_FrnALhwHk6RrNIFJefnVZ2z5l6WDeYw/exec';

function logToGoogleSheets(quotation, phoneNumber, salesperson) {
    const params = new URLSearchParams({
        date: quotation.date,
        salesperson: salesperson || '',
        customerName: quotation.customerName || '',
        phone: phoneNumber || '',
        location: quotation.location || '',
        systemSize: quotation.systemSize,
        panelBrand: quotation.panelBrand
    });

    // Use image beacon approach - most reliable, bypasses CORS completely
    const img = new Image();
    img.src = GOOGLE_SHEET_URL + '?' + params.toString();
    img.onload = () => console.log('Quotation logged to Google Sheets');
    img.onerror = () => console.log('Quotation logged to Google Sheets (beacon sent)');
}

// Form submit handler (Generate PDF)
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const params = Object.fromEntries(formData.entries());
    
    params.systemSize = parseFloat(params.systemSize);
    params.customerName = params.customerName || '';
    params.location = params.location || '';
    const phoneNumber = params.phoneNumber;
    delete params.phoneNumber;
    const salesperson = params.salesperson || '';
    delete params.salesperson;
    
    if (!params.systemSize) {
        alert('Please select a system size');
        return;
    }
    
    if (!rates) {
        alert('Configuration not loaded. Please refresh the page.');
        return;
    }
    
    loading.style.display = 'flex';
    
    try {
        const quotation = calculateQuotation(params);
        displayQuotation({ quotation });
        
        // Log to Google Sheets for tracking (do this first, before PDF which might fail)
        logToGoogleSheets(quotation, phoneNumber, salesperson);
        
        // Generate PDF
        const pdf = generatePDF(quotation);
        
        let actionsHTML = `
            <div style="text-align: center;">
                <p style="color: green; margin-bottom: 15px; font-weight: 600;">
                    ✓ Quotation generated successfully!
                </p>
                <button onclick="downloadPDF()" class="btn btn-primary" style="margin: 10px;">
                    📥 Download PDF
                </button>
        `;
        
        if (phoneNumber) {
            actionsHTML += `
                <button onclick="sendToWhatsApp('${phoneNumber}')" class="btn btn-secondary" style="margin: 10px;">
                    💬 Send via WhatsApp
                </button>
            `;
        }
        
        actionsHTML += '</div>';
        document.getElementById('quoteActions').innerHTML = actionsHTML;
        
        // Store PDF globally for download
        window.currentPDF = pdf;
        window.currentQuotation = quotation;
        window.currentPhoneNumber = phoneNumber;
        
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        loading.style.display = 'none';
    }
});

// Download PDF function
function downloadPDF() {
    if (window.currentPDF && window.currentQuotation) {
        const q = window.currentQuotation;
        const customerTag = q.customerName ? q.customerName.replace(/\s+/g, '_') : 'Customer';
        const capacity = q.systemSize + 'KW';
        const phase = (q.phaseType === '3ph' || q.phaseType === '3phase') ? '3Ph' : '1Ph';
        const filename = `${customerTag}_${capacity}_${phase}_ellipse_solar_quotation.pdf`;
        window.currentPDF.save(filename);
    }
}

// Send to WhatsApp function
function sendToWhatsApp(phoneNumber) {
    if (window.currentQuotation) {
        sendWhatsApp(phoneNumber, window.currentQuotation);
    }
}
