# Panel Calculation Logic - Optimal Matching

## Overview

The platform now uses **intelligent panel count calculation** that finds the optimal number of panels closest to the requested system capacity, and shows alternative configurations with ±1 panel.

---

## How It Works

### 1. Calculate Exact Panels Needed
```
Exact Panels = (System Capacity in W) / Panel Wattage
```

**Example**: 5kW (5000W) ÷ 575W = 8.696 panels

### 2. Evaluate Three Scenarios

| Scenario | Calculation | Panels | Actual Capacity | Difference |
|----------|-------------|--------|-----------------|------------|
| **Floor** | Floor down | 8 | 4.60 kW | -0.40 kW |
| **Round** | Round to nearest | 9 | 5.175 kW | +0.175 kW |
| **Ceiling** | Ceiling up | 9 | 5.175 kW | +0.175 kW |

### 3. Select Closest Match

The system calculates which option gives the **smallest difference** from requested capacity:

```javascript
Floor Difference:  |5.00 - 4.60| = 0.40 kW
Round Difference:  |5.00 - 5.175| = 0.175 kW
Ceil Difference:   |5.00 - 5.175| = 0.175 kW

Recommended: 9 panels (smallest difference)
```

### 4. Show Alternatives

Display **recommended ± 1 panel** to give sales flexibility:

```
Recommended: 9 panels = 5.175 kW (+0.175 kW extra)
  ↓ 8 panels = 4.60 kW (0.40 kW less)
  ↑ 10 panels = 5.75 kW (0.75 kW extra)
```

---

## Real Examples

### Example 1: 5kW System with 575W Panels

**Calculation**:
```
5000W ÷ 575W = 8.696 panels

Options:
- 8 panels = 4.60 kW (0.40 kW short) ❌
- 9 panels = 5.175 kW (0.175 kW over) ✅ BEST
- 10 panels = 5.75 kW (0.75 kW over)

Recommendation: 9 panels
```

**Display**:
```
✓ 9 panels = 5.175 kW (+0.175 kW extra)
  ↓ 8 panels = 4.60 kW (0.40 kW less)
  ↑ 10 panels = 5.75 kW (0.75 kW extra)
```

**Sales Options**:
- Recommend 9 panels (closest match)
- Offer 8 panels if budget-conscious
- Suggest 10 panels for future-proofing

---

### Example 2: 10kW System with 615W Panels

**Calculation**:
```
10000W ÷ 615W = 16.26 panels

Options:
- 16 panels = 9.84 kW (0.16 kW short)
- 16 panels = 9.84 kW (0.16 kW short) ✅ BEST (round)
- 17 panels = 10.455 kW (0.455 kW over)

Recommendation: 16 panels
```

**Display**:
```
✓ 16 panels = 9.84 kW (-0.16 kW less)
  ↓ 15 panels = 9.225 kW (0.775 kW less)
  ↑ 17 panels = 10.455 kW (0.455 kW extra)
```

**Sales Options**:
- 16 panels is very close (98.4% of target)
- 17 panels if customer wants full 10kW+

---

### Example 3: 3kW System with 545W Panels

**Calculation**:
```
3000W ÷ 545W = 5.504 panels

Options:
- 5 panels = 2.725 kW (0.275 kW short)
- 6 panels = 3.27 kW (0.27 kW over)
- 6 panels = 3.27 kW (0.27 kW over) ✅ BEST

Recommendation: 6 panels
```

**Display**:
```
✓ 6 panels = 3.27 kW (+0.27 kW extra)
  ↓ 5 panels = 2.725 kW (0.275 kW less)
  ↑ 7 panels = 3.815 kW (0.815 kW extra)
```

**Important**: 6 panels = 3.27kW > 3kW, so **full subsidy applies!**

---

### Example 4: Perfect Match - 6.15kW with 615W

**Calculation**:
```
6150W ÷ 615W = 10.0 panels (exact!)

Options:
- 10 panels = 6.15 kW (perfect match) ✅

Recommendation: 10 panels
```

**Display**:
```
✓ 10 panels = 6.15 kW ✓ Perfect match!
  ↓ 9 panels = 5.535 kW (0.615 kW less)
  ↑ 11 panels = 6.765 kW (0.615 kW extra)
```

---

## Benefits

### For Sales Team:
1. **Optimal Recommendation**: System automatically finds best match
2. **Flexibility**: See ±1 panel options instantly
3. **Transparent**: Customer understands capacity difference
4. **Upsell Opportunity**: Easy to suggest +1 panel for extra capacity
5. **Budget Options**: Can offer -1 panel for cost savings

### For Customers:
1. **Clear Information**: See exact capacity vs requested
2. **Options**: Understand trade-offs of fewer/more panels
3. **Confidence**: Know they're getting optimal configuration
4. **Fair Pricing**: Pay for actual capacity, not just requested

---

## Pricing Impact

### Panels Are Priced by Actual Capacity

**Before (v2.0)**:
- Customer requests 5kW
- System adds 9 panels (5.175 kW)
- **Charged for 5kW** (undercharging)

**Now (v3.1)**:
- Customer requests 5kW
- System recommends 9 panels = 5.175 kW
- **Charged for 5.175 kW** (accurate)
- Customer sees: "+0.175 kW extra capacity"

**Result**: Accurate pricing + transparent communication

---

## Sales Conversation Examples

### Scenario 1: Budget-Conscious Customer

**Customer**: "I want 5kW but worried about cost"

**Sales Rep**: 
> "For 5kW with 575W panels, I can offer you:
> - **8 panels = 4.6kW** for ₹3,75,000 (saves ₹15,000)
> - **9 panels = 5.175kW** for ₹3,90,000 (recommended, 3.5% extra capacity)
> 
> The 9-panel option gives you future-proofing for just ₹15k more."

### Scenario 2: Maximum Subsidy

**Customer**: "Want to maximize government subsidy"

**Sales Rep**:
> "For 3kW subsidy limit with 545W panels:
> - **5 panels = 2.725kW** ❌ Don't qualify for full 3kW subsidy
> - **6 panels = 3.27kW** ✅ Get full ₹54,000 subsidy!
> 
> I recommend 6 panels - you get 9% extra capacity AND full subsidy."

### Scenario 3: Perfect Fit

**Customer**: "Do I get exactly what I asked for?"

**Sales Rep**:
> "With 10 panels of 615W each, you get **exactly 6.15kW**! 
> This is a perfect match. No wasted capacity, no shortage."

### Scenario 4: Upselling

**Customer**: "Quoted for 10kW"

**Sales Rep**:
> "With 16 panels (615W), you get 9.84kW - very close!
> Or, for just ₹15,000 more, **17 panels gives you 10.455kW** - 
> that's 4.5% extra capacity for future growth.
> 
> Which would you prefer?"

---

## Technical Implementation

### Algorithm
```javascript
1. Calculate exact panels needed
2. Evaluate floor, round, and ceiling options
3. Calculate actual capacity for each
4. Find smallest difference from target
5. Select that as recommended
6. Show ±1 panel alternatives
```

### Display Format
```
Main: [recommended] panels = [capacity] kW ([difference])
  ↓ [minus one] panels = [capacity] kW ([difference])
  ↑ [plus one] panels = [capacity] kW ([difference])
```

### Color Coding
- **Green (✓)**: Perfect match (difference < 0.01 kW)
- **Blue (↑)**: Extra capacity (more than requested)
- **Orange (↓)**: Less capacity (under requested)

---

## Edge Cases

### Minimum System (1 Panel)
```
0.5kW requested with 575W panels:
- Would need 0.87 panels
- System forces minimum 1 panel
- Customer gets 0.575kW (15% extra)
```

### Very Small Difference
```
5.75kW requested with 575W panels:
- Need exactly 10 panels
- Shows as "✓ Perfect match!"
```

### Large Capacity Jump
```
3kW with 615W panels:
- 5 panels = 3.075kW (+0.075 kW)
- Very close to perfect
```

---

## Subsidy Implications

### Critical Threshold: 3kW

**Scenario A**: Customer wants 3kW with 545W panels
- 5 panels = 2.725 kW ❌ Only get ₹49,050 subsidy
- 6 panels = 3.27 kW ✅ Get full ₹54,000 subsidy

**Recommendation**: Always suggest 6 panels for full subsidy!

**Scenario B**: Customer wants 3.5kW
- Any configuration > 3kW gets max ₹54,000
- No benefit to exceeding 3kW for subsidy purposes

---

## Comparison Table

| Requested | Panel W | Exact | Floor | Round | Ceil | **Best** | Why |
|-----------|---------|-------|-------|-------|------|----------|-----|
| 3 kW | 545W | 5.50 | 5 | 6 | 6 | **6** | Closest, full subsidy |
| 5 kW | 575W | 8.70 | 8 | 9 | 9 | **9** | Smallest difference |
| 10 kW | 615W | 16.26 | 16 | 16 | 17 | **16** | Nearest match |
| 6.15 kW | 615W | 10.00 | 10 | 10 | 10 | **10** | Perfect! |

---

## Future Enhancements

### Possible Additions:
1. **Budget Optimizer**: Show cheapest config within 5% of target
2. **Roof Space Check**: Warn if too many panels for available space
3. **Multi-String**: Optimize for inverter string configuration
4. **Battery Integration**: Account for battery backup needs

---

**Version**: 3.1  
**Feature**: Optimal Panel Calculation  
**Status**: ✅ Implemented  
**Impact**: More accurate pricing, better transparency, flexible sales options
