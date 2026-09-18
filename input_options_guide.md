# Input Options Guide - Ellipse Solar Platform v3.0

## Complete Dropdown Options & Specifications

---

## 1. System Capacity

**Type**: Dropdown  
**Range**: 3kW to 20kW (1kW increments)  
**Default**: 5kW

**Available Options**:
```
3 kW, 4 kW, 5 kW, 6 kW, 7 kW, 8 kW, 9 kW, 10 kW,
11 kW, 12 kW, 13 kW, 14 kW, 15 kW, 16 kW, 17 kW, 18 kW, 19 kW, 20 kW
```

**Purpose**: Primary system sizing - affects all calculations  
**Impact**:
- Panel count calculation
- Inverter sizing
- Component quantities
- Labour costs
- Subsidy eligibility (max 3kW)

---

## 2. Phase Type

**Type**: Dropdown  
**Default**: 3 Phase

**Available Options**:
1. **1 Phase** - Single phase connection
2. **3 Phase** - Three phase connection (recommended for ≥5kW)

**Purpose**: Electrical connection type  
**Impact**:
- ACDB/DCDB specifications
- Wiring requirements
- Installation approach

---

## 3. Panel Brand

**Type**: Dropdown  
**Default**: INA

**Available Options**:

| Brand | Price Range | Quality | Warranty |
|-------|-------------|---------|----------|
| **INA** (Default) | ₹24-25/W | Premium | 25 years |
| **Adani** | ₹24.5-25.5/W | Premium | 25 years |
| **Waaree** | ₹23.8-24.8/W | Good | 25 years |
| **Tata Power Solar** | ₹25-26/W | Premium | 25 years |
| **Renewsys** | ₹23.5-24.5/W | Value | 25 years |
| **Premier** | ₹24.2-25.2/W | Good | 25 years |
| **Others** | ₹24-25/W | Generic | 25 years |

**Purpose**: Panel manufacturer selection  
**Impact**: Base panel pricing (varies by capacity)

---

## 4. Panel Capacity

**Type**: Dropdown  
**Default**: 575W

**Available Options** (All Brands):
1. **545W** - Standard capacity
2. **575W** - Mid-range capacity (Default)
3. **615W** - High capacity

**Calculation**:
```
Panel Count = ⌈(System Capacity × 1000) / Panel Wattage⌉
```

**Examples**:
- 5kW @ 545W = 10 panels
- 5kW @ 575W = 9 panels
- 5kW @ 615W = 9 panels
- 10kW @ 545W = 19 panels
- 10kW @ 575W = 18 panels
- 10kW @ 615W = 17 panels

**Purpose**: Determines how many panels needed  
**Impact**:
- Total panel count
- Roof space requirements
- MC4 connectors quantity
- J-hook quantity

---

## 5. Panel Type

**Type**: Dropdown  
**Default**: MonoPERC

**Available Options**:

| Type | Efficiency Bonus | Price Multiplier | Description |
|------|------------------|------------------|-------------|
| **MonoPERC** (Default) | 0% | 1.0× | Standard monocrystalline PERC |
| **Bifacial** | +2% | 1.15× | Generates from both sides |
| **TOPCon** | +3% | 1.08× | Tunnel Oxide Passivated Contact |
| **HJT** | +4% | 1.25× | Heterojunction - Highest efficiency |

**Impact on Pricing**:
```
Base Panel Price: ₹24/W (575W INA)

MonoPERC: ₹24 × 1.0 = ₹24/W
Bifacial: ₹24 × 1.15 = ₹27.6/W (+15%)
TOPCon: ₹24 × 1.08 = ₹25.92/W (+8%)
HJT: ₹24 × 1.25 = ₹30/W (+25%)
```

**Impact on Efficiency**:
```
Base Efficiency: 22% (575W INA)

MonoPERC: 22% + 0% = 22%
Bifacial: 22% + 2% = 24%
TOPCon: 22% + 3% = 25%
HJT: 22% + 4% = 26%
```

**Purpose**: Panel technology selection  
**Recommendation**:
- **Budget**: MonoPERC
- **Best Value**: TOPCon
- **Premium**: HJT or Bifacial

---

## 6. Inverter Capacity

**Type**: Number Input  
**Range**: 1-25 kW  
**Default**: Auto-matches System Capacity

**Purpose**: Inverter sizing (usually matches or slightly exceeds system size)  
**Auto-Sync**: Changes automatically when system capacity changes

---

## 7. Inverter Brand

**Type**: Dropdown  
**Default**: Polycab

**Available Options**:

| Brand | Price/kW | Efficiency | Warranty | Notes |
|-------|----------|------------|----------|-------|
| **Sungrow** | ₹42,000 | 98.5% | 10 years | International brand, best efficiency |
| **Solaire** | ₹41,000 | 98% | 8 years | Value option |
| **Polycab** (Default) | ₹44,450 | 98% | 8 years | Reliable Indian brand |
| **K Solar** | ₹40,000 | 97.5% | 7 years | Budget option |
| **Microtek** | ₹39,000 | 97% | 5 years | Most economical |
| **Luminous** | ₹43,000 | 97% | 7 years | Popular Indian brand |
| **Feston** | ₹42,000 | 97% | 7 years | Good value |

**Price Comparison (5kW System)**:
```
Microtek:  ₹39,000 × 5 = ₹1,95,000 (cheapest)
K Solar:   ₹40,000 × 5 = ₹2,00,000
Solaire:   ₹41,000 × 5 = ₹2,05,000
Sungrow:   ₹42,000 × 5 = ₹2,10,000
Feston:    ₹42,000 × 5 = ₹2,10,000
Luminous:  ₹43,000 × 5 = ₹2,15,000
Polycab:   ₹44,450 × 5 = ₹2,22,250 (default)
```

**Purpose**: Inverter brand selection  
**Recommendation**:
- **Best Performance**: Sungrow
- **Best Value**: Solaire or K Solar
- **Reliable**: Polycab (Default)
- **Budget**: Microtek

---

## 8. Structure Brand

**Type**: Dropdown  
**Default**: TATA

**Available Options**:

| Brand | Price Multiplier | Warranty | Description |
|-------|------------------|----------|-------------|
| **TATA** (Default) | 1.0× | 25 years | TATA Structura GI |
| **Apollo** | 0.95× | 20 years | Apollo GI (5% cheaper) |

**Impact on Structure Costs**:
```
Base Plate Standard: ₹27,000

TATA:   ₹27,000 × 1.0 = ₹27,000
Apollo: ₹27,000 × 0.95 = ₹25,650 (saves ₹1,350)
```

**Purpose**: Mounting structure material brand  
**Recommendation**: TATA for premium projects, Apollo for cost savings

---

## 9. Installation Type

**Type**: Dropdown  
**Default**: Standard Site (Rooftop)

**Available Options**:

| Type | Wire Qty | Labour Cost | Description |
|------|----------|-------------|-------------|
| **Standard Site** (Default) | 100% | ₹10,000 base | Normal rooftop installation |
| **Special Requirements** | 120% (+20%) | ₹13,000 (+30%) | Custom work, difficult access |
| **Ground Mounting** | 100% | ₹15,000 (+50%) | Ground/open area installation |

**Impact Example (5kW System)**:
```
Component: Earthing Wire (100m base)
Standard:  100m @ ₹37/m = ₹3,700
Special:   120m @ ₹37/m = ₹4,440 (+₹740)
Ground:    100m @ ₹37/m = ₹3,700

Labour:
Standard:  ₹10,000
Special:   ₹13,000 (+₹3,000)
Ground:    ₹15,000 (+₹5,000)
```

**Purpose**: Site condition specification  
**Impact**:
- Wire quantities (earthing, DC, black pipe)
- Installation labour cost

---

## 10. Number of Floors

**Type**: Dropdown  
**Range**: 1 to 10 floors  
**Default**: 1 Floor

**Available Options**:
```
1 Floor (Default), 2 Floors, 3 Floors, 4 Floors, 5 Floors,
6 Floors, 7 Floors, 8 Floors, 9 Floors, 10 Floors
```

**Earthing Wire Calculation**:
```
Base Length: 50m
Per Additional Floor: +15m

Formula: 50m + (Floors - 1) × 15m

Examples:
1 Floor:  50 + (1-1)×15 = 50m
2 Floors: 50 + (2-1)×15 = 65m
3 Floors: 50 + (3-1)×15 = 80m
5 Floors: 50 + (5-1)×15 = 110m
10 Floors: 50 + (10-1)×15 = 185m
```

**DC Wire Calculation**:
```
Base Length: 60m
Per Additional Floor: +10m

Formula: 60m + (Floors - 1) × 10m

Examples:
1 Floor:  60 + (1-1)×10 = 60m
2 Floors: 60 + (2-1)×10 = 70m
5 Floors: 60 + (5-1)×10 = 100m
```

**Labour Cost Adjustment** (for >2 floors):
```
Base Labour: ₹10,000 (standard site)
Additional: +5% per floor above 2

Formula: Base × (1 + (Floors - 2) × 0.05)

Examples:
1-2 Floors: ₹10,000 (no change)
3 Floors:   ₹10,000 × 1.05 = ₹10,500
4 Floors:   ₹10,000 × 1.10 = ₹11,000
5 Floors:   ₹10,000 × 1.15 = ₹11,500
10 Floors:  ₹10,000 × 1.40 = ₹14,000
```

**Purpose**: Vertical installation distance  
**Impact**:
- Earthing wire length (primary)
- DC wire length
- Installation labour (>2 floors)

---

## 11. Smart Meter Already Installed

**Type**: Dropdown  
**Default**: No - Need to Install

**Available Options**:
1. **No - Need to Install** (Default) - Net meter cost included (₹5,015)
2. **Yes - Already Installed** - Net meter cost excluded (₹0)

**Impact**:
```
Net Meter Cost:
- Not Installed: ₹4,250 + ₹765 GST = ₹5,015
- Already Installed: ₹0

Total Saving: ₹5,015
```

**Purpose**: Avoid duplicate meter charges  
**Recommendation**: Always verify with customer before quotation

---

## Complete Input Summary

| Field | Type | Options | Default | Auto-Calc |
|-------|------|---------|---------|-----------|
| System Capacity | Dropdown | 3-20 kW | 5 kW | ❌ |
| Phase Type | Dropdown | 1Ph/3Ph | 3Ph | ❌ |
| Panel Brand | Dropdown | 7 brands | INA | ❌ |
| Panel Capacity | Dropdown | 545/575/615W | 575W | ❌ |
| Panel Type | Dropdown | 4 types | MonoPERC | ❌ |
| **Panel Count** | **Display** | **Auto** | **9** | **✅** |
| Inverter Capacity | Number | 1-25 kW | 5 kW | ✅ (syncs) |
| Inverter Brand | Dropdown | 7 brands | Polycab | ❌ |
| Structure Brand | Dropdown | TATA/Apollo | TATA | ❌ |
| Installation Type | Dropdown | 3 types | Standard | ❌ |
| Number of Floors | Dropdown | 1-10 | 1 | ❌ |
| Smart Meter | Dropdown | Yes/No | No | ❌ |

---

## Pricing Impact Matrix

### Low-Cost Configuration
```
System: 5kW, 1Ph
Panel: Renewsys 615W (MonoPERC)
Inverter: Microtek 5kW
Structure: Apollo
Site: Standard, 1 Floor
Smart Meter: Yes

Estimated: ₹3,10,000 - ₹3,30,000
```

### Mid-Range Configuration (Recommended)
```
System: 5kW, 3Ph
Panel: INA 575W (MonoPERC)
Inverter: Polycab 5kW
Structure: TATA
Site: Standard, 1 Floor
Smart Meter: No

Estimated: ₹3,90,000 - ₹4,10,000
```

### Premium Configuration
```
System: 10kW, 3Ph
Panel: Tata 615W (TOPCon)
Inverter: Sungrow 10kW
Structure: TATA
Site: Special, 3 Floors
Smart Meter: No

Estimated: ₹8,50,000 - ₹9,00,000
```

### Ultra-Premium Configuration
```
System: 20kW, 3Ph
Panel: Adani 615W (HJT)
Inverter: Sungrow 20kW
Structure: TATA
Site: Ground, 1 Floor
Smart Meter: No

Estimated: ₹18,00,000 - ₹19,00,000
```

---

## Usage Tips

### For Sales Team:

1. **Start Simple**: Use default values (INA, 575W, MonoPERC, Polycab)
2. **Match Budget**: Adjust brand selections based on customer budget
3. **Verify Site**: Always confirm installation type and floors
4. **Smart Meter Check**: Ask customer about existing smart meter
5. **Compare Options**: Generate 2-3 quotes with different configurations

### For Customers:

1. **Panel Type**: MonoPERC is sufficient for most, TOPCon for better value
2. **Panel Brand**: INA/Waaree good balance of quality and price
3. **Inverter**: Polycab/Sungrow for reliability
4. **Capacity**: Choose based on electricity bill (₹/month × 12 / 8000)

---

**Document Version**: 3.0  
**Last Updated**: January 2025  
**Platform**: Ellipse Solar Sales Platform  
**Total Options**: 11 input fields, 100+ combinations
