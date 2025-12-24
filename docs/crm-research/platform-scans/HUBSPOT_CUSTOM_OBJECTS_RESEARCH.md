# HubSpot Custom Objects & Fields: Comprehensive Research Report

**Date:** December 24, 2025
**Focus:** Custom Objects, Field Validation, Dependencies, Calculated Fields, and Property Types

---

## Table of Contents

1. [Property Types](#property-types)
2. [Validation Rules](#validation-rules)
3. [Calculated Fields & Formula Support](#calculated-fields--formula-support)
4. [Field Dependencies](#field-dependencies)
5. [Custom Objects Overview](#custom-objects-overview)
6. [Subscription Requirements](#subscription-requirements)
7. [Limitations & Considerations](#limitations--considerations)

---

## Property Types

HubSpot supports the following field types for custom properties:

### Text Properties

| Type | Description | Limits | Notes |
|------|-------------|--------|-------|
| **Single-line text** | Stores a single string of alphanumeric characters | CRM: 65,536 chars; Forms: No limit | Basic text input |
| **Multi-line text** | Stores multiple strings for paragraphs or lists | CRM: 65,536 chars; Forms: No limit | Paragraph/list input |
| **Rich text** | Stores stylized text with formatting and images | Max 64 KB (including images) | Cannot be used in forms; supports bold, italic, underline, colors, fonts, lists, hyperlinks, images |

### Enumeration Properties

| Type | Description | Selection | Form Appearance |
|------|-------------|-----------|-----------------|
| **Single checkbox** | Stores binary on/off or true/false values | One value only | Single checkbox |
| **Multiple checkboxes** | Stores multiple selectable options | Multiple selections allowed | Multiple checkboxes |
| **Dropdown select** | Single selection from multiple options | One option only | Dropdown menu |
| **Radio select** | Single selection from multiple options | One option only | Radio buttons (same as dropdown in records) |

### Number Properties

| Type | Description | Formatting Options |
|------|-------------|-------------------|
| **Number** | Stores numerals in decimal or scientific notation | Formatted (1,000,000); Unformatted (1000000); Currency (account default) |

### Date & Time Properties

| Type | Description | Availability |
|------|-------------|---------------|
| **Date picker** | Stores date values (day, month, year) | Manual creation in CRM settings |
| **Datetime** | Stores date and time values | API only |

### Special Properties

| Type | Description | Availability | Limits |
|------|-------------|--------------|--------|
| **Calculation** | Custom equations based on other number properties | Professional+ & Enterprise | Up to 70 nested parentheses |
| **Score** | Custom scoring based on attributes | Contacts, Companies, Deals only | Limit depends on subscription |
| **HubSpot user** | References HubSpot account users | All objects | Up to 30 custom user properties per object |
| **File** | Stores uploaded files | Forms & CRM | Max 10 files per property |
| **Property sync** | Auto-syncs values from associated records | Professional+ & Enterprise | Updates automatically when source changes |

### Type Constraints

- **Cannot change to/from:** Score and Calculation properties cannot be converted to other types, nor can other types be converted to Score/Calculation
- **Properties with dependencies:** Some property types restrict their use in other features (e.g., Rich text cannot be used in forms)

---

## Validation Rules

### Overview

Validation rules enforce data quality by requiring users to meet specific requirements before saving property values. Rules can be applied to:
- Text properties (single-line and multi-line)
- Date picker and datetime properties
- Number properties
- Certain default properties

### Available Validation Rules

#### Text Properties

| Rule | Function | Example |
|------|----------|---------|
| **Minimum character limit** | Enforce minimum text length | Require at least 5 characters |
| **Maximum character limit** | Enforce maximum text length | Limit to 20 characters |
| **Numeric only** | Restrict to numeric characters only | Order number must contain only digits |
| **No special characters** | Disallow special characters ($, %, etc.) | Ensure clean alphanumeric data |
| **Regex custom rules** | Pattern matching using regular expressions | Professional+ subscription required |

#### Number Properties

| Rule | Function | Example |
|------|----------|---------|
| **Number range** | Set minimum and maximum values | Price must be between $10-$1000 |

#### Phone Properties

| Rule | Function | Options |
|------|----------|---------|
| **Phone validation** | Automatic formatting and validation | Set default country code (optional) |

#### All Property Types

| Rule | Function | Limit |
|------|----------|-------|
| **Require unique values** | Prevent duplicate entries across records | Up to 10 unique value properties per object |

### Enforcement Scope

**Rules ARE Enforced:**
- CRM record editing and creation pages
- New form editor forms
- Mobile devices (as of latest updates)

**Rules NOT Enforced:**
- Workflows
- Chatflows
- Legacy form submissions
- Mobile apps (for initial deployment)

### Subscription Requirements

- **Basic/Professional:** Standard validation rules (character limits, number ranges, required fields)
- **Professional+:** Regex custom validation rules
- **Enterprise:** Full validation suite

---

## Calculated Fields & Formula Support

### Overview

Calculated properties (formerly called calculation properties) automatically compute values based on other properties of the **same object**. These are read-only fields that update automatically.

### Supported Objects

| Object | Supported |
|--------|-----------|
| Contacts | ✓ Yes |
| Companies | ✓ Yes |
| Deals | ✓ Yes |
| Tickets | ✓ Yes |
| Custom objects | ✓ Yes |
| Products | ✗ No |

### Output Types

Calculated fields can return:
- **Number** - Arithmetic results (integers, decimals)
- **Boolean** - True/false values
- **String** - Text results
- **Date** - Calculated date values
- **Datetime** - Calculated date and time values

### Operators & Functions

#### Arithmetic Operators
```
+ (addition)
- (subtraction)
* (multiplication)
/ (division)
% (modulo)
```

#### Comparison Operators
```
== (equals)
!= (not equals)
> (greater than)
< (less than)
>= (greater than or equal)
<= (less than or equal)
```

#### Logic Operators
```
AND
OR
NOT
```

#### Supported Functions

**String Functions:**
- `CONCAT()` - Combine strings
- `UPPERCASE()` - Convert to uppercase
- `LOWERCASE()` - Convert to lowercase
- `TRIM()` - Remove whitespace

**Date Functions:**
- `NOW()` - Current date/time
- `DATEADD()` - Add days/months to date
- `DATEDIFF()` - Calculate days between dates

**Conditional Functions:**
- `IF()` - Standard if-then-else logic
- Nested IF statements for complex conditions

**Math Functions:**
- `ROUND()` - Round numbers
- `FLOOR()` - Round down
- `CEIL()` - Round up
- `ABS()` - Absolute value
- `SUM()` - Sum values

#### Nesting Limits

- Maximum **70 nested open parentheses** in a single formula

### Formula Syntax

#### Literal Data Types

**String Literals:**
```
"Text string" or 'Text string'
```

**Number Literals:**
```
123 or 123.45 or 1.23E4 (scientific notation)
```

**Boolean Literals:**
```
true or false
```

**Date Literals:**
```
@2025-12-24 or @2025-12-24T14:30:00
```

### Example Formulas

**Simple Arithmetic:**
```
property_a + property_b
```

**Conditional Logic:**
```
IF(deal_amount > 10000, "Enterprise", "SMB")
```

**Date Calculation:**
```
DATEDIFF(creation_date, NOW()) > 30
```

**String Concatenation:**
```
CONCAT("Contact: ", first_name, " ", last_name)
```

### Limitations

- **Same-object only:** Cannot reference properties from related or associated objects
- **No product support:** Calculated properties cannot be created on Product objects
- **No form support:** Calculated fields are read-only and cannot appear in forms
- **No rollup with boolean:** Boolean calculation fields cannot be used in rollup fields; use 0/1 (number) instead
- **Requires subscription:** Professional+ subscription required
- **One-time setup:** Field type cannot be changed after creation

---

## Field Dependencies

### Current Status

HubSpot has several levels of field dependency functionality:

#### 1. Conditional Property Logic (Beta)

**Status:** Private beta

**Scope:** Applies conditional logic to enumeration properties triggered when users edit properties

**Locations:**
- Create record forms
- Record detail pages
- Index pages

**Requirements:**
- Professional+ subscription

**Features:**
- Show/hide properties based on conditions
- Make properties required/optional conditionally
- Triggered on enumeration property changes

#### 2. Dependent Form Fields

**Availability:** All subscription levels

**Description:** Display additional form fields based on visitor responses to a previous field

**Example Use Case:**
- Question: "Do you like cake?"
- If YES → Show: "What flavor?"
- If NO → Skip additional questions

**Limitations:**
- Only existing fields can be used as dependent form fields
- New fields must be created before implementation
- Can only be applied to regular form fields (not dependent fields)
- **Maximum nesting: 1 level** - Cannot add a dependent field to another dependent field

**Setup Location:** Marketing > Forms > Legacy form editor > Logic tab > Dependent fields section

#### 3. Field Dependencies (Form-Level)

**Use Cases:**
- Region selection → Country field filters to relevant values
- Country selection → State field filters to valid states
- Lead routing based on geography/attributes

**Implementation:**
- Legacy form editor with conditional logic
- Custom code solutions for complex scenarios
- Custom modules for advanced logic requirements

### Implementation Approaches

#### Simple Dependencies (Forms)
- Use built-in dependent field functionality
- Limited to one level of nesting
- Best for binary choices or simple cascading selects

#### Complex Dependencies
- Custom code implementation required
- Create custom modules with HTML forms
- Implement JavaScript for multi-level logic
- Consider HubSpot's API for programmatic solutions

---

## Custom Objects Overview

### Definition

Custom objects extend HubSpot's standard CRM objects (Contacts, Companies, Deals, Tickets) to model unique business processes and relationships specific to your organization.

### Requirements

**Subscription:** Enterprise tier (or specific feature enabled)

**Permissions:**
- Super admin access
- Custom objects feature must be enabled
- Proper role permissions configured

### Creating Custom Objects

#### Required Elements

Each custom object must include:

1. **Object Configuration:**
   - Plural name (for display)
   - Singular name (for internal reference)
   - Icon/color for visual identification

2. **Properties:** Minimum 1 property per object

3. **Display Properties:**
   - **Primary display property** - Used for object naming/identification
   - **Secondary display properties** (up to 3) - Appear on profile cards and quick filters

4. **Searchability:**
   - **Searchable properties** - Indexed for global search
   - Limit: Up to 20 searchable properties per custom object

### Property Configuration for Custom Objects

When creating properties via API, define:

```json
{
  "name": "internal_property_name",
  "label": "Display Name",
  "type": "string|number|date|enumeration",
  "fieldType": "text|number|date|select|checkbox",
  "requiredProperties": ["property_name"],
  "searchableProperties": ["property_name"],
  "primaryDisplayProperty": "property_name",
  "secondaryDisplayProperties": ["property_1", "property_2"]
}
```

### Property Management

| Aspect | Rules |
|--------|-------|
| **Required Properties** | Mark critical properties as required for new records |
| **Searchable Properties** | Up to 20 per custom object (vs. 3 for standard objects) |
| **Unique Values** | Up to 10 unique value properties per object |
| **HubSpot Users** | Up to 30 custom user properties per object |
| **Property Sync** | Available for enterprise with Professional+ |

### Associations

Custom objects can be associated with:
- Other custom objects
- Standard CRM objects (Contacts, Companies, Deals, Tickets)
- One-to-many relationships supported
- Many-to-many relationships supported (with configuration)

### Pipelines

Custom objects can have custom pipelines with:
- Multiple pipeline configurations
- Custom pipeline stages
- Deal-like workflows and automation

---

## Subscription Requirements

### Property Type Support

| Feature | Free | Starter | Professional | Enterprise |
|---------|------|---------|--------------|------------|
| Basic properties (text, number, date) | ✓ | ✓ | ✓ | ✓ |
| Enumeration (checkboxes, select) | ✓ | ✓ | ✓ | ✓ |
| Calculation properties | ✗ | ✗ | ✓ | ✓ |
| Regex validation rules | ✗ | ✗ | ✓ | ✓ |
| Property sync | ✗ | ✗ | ✓ | ✓ |
| Conditional property logic (beta) | ✗ | ✗ | ✓ | ✓ |
| Custom objects | ✗ | ✗ | ✗ | ✓ |

### Validation Rule Support

| Validation Type | Free/Starter | Professional | Enterprise |
|-----------------|-------------|--------------|-----------|
| Required fields | ✓ | ✓ | ✓ |
| Character/number limits | ✓ | ✓ | ✓ |
| Unique values | ✓ | ✓ | ✓ |
| Phone validation | ✓ | ✓ | ✓ |
| Regex patterns | ✗ | ✓ | ✓ |

---

## Limitations & Considerations

### General Limitations

1. **Same-object constraint:** Calculated properties can only reference properties from the same object type; cannot pull from related records

2. **Field type immutability:** Once created, calculation and score properties cannot be converted to other types

3. **Form restrictions:**
   - Rich text properties cannot be used in forms
   - Calculated properties cannot appear in forms
   - File properties have specific form support

4. **Mobile enforcement:**
   - Validation rules initially not enforced on mobile devices
   - Gradual rollout of mobile support ongoing

5. **Automation limitations:**
   - Validation rules not enforced via workflows or chatflows
   - Legacy form editor may not support new validation features

### Data Quality Best Practices

1. **Balanced validation:** Don't over-require fields; too many required fields reduce user adoption

2. **Regular audits:** Conduct monthly reviews of custom object records to identify data issues

3. **Validation strategy:** Apply validation rules thoughtfully to prevent bad data entry without hindering workflows

4. **Cascading updates:** Consider using property sync for data consistency across related records

5. **Formula complexity:** Nested formulas with 70+ parentheses should be reviewed for readability and performance

### Workflow Considerations

1. **Validation bypass:** Validation rules don't apply in automated workflows; implement data quality checks separately

2. **Dependency testing:** Test conditional property logic thoroughly before deployment

3. **Field sync:** Property sync fields update automatically but may require workflow integration for legacy data

### API Considerations

- Use **internal name** (not label) when referencing properties via API; labels can change
- Ensure property names follow API naming conventions (lowercase with underscores)
- Set default property types to string/text when creating via API

---

## References & Resources

### Official HubSpot Documentation

1. [Set validation rules for a property](https://knowledge.hubspot.com/properties/set-validation-rules-for-properties)
2. [Create and edit properties](https://knowledge.hubspot.com/properties/create-and-edit-properties)
3. [Understand property field types in HubSpot](https://knowledge.hubspot.com/properties/property-field-types-in-hubspot)
4. [Create and edit custom objects](https://knowledge.hubspot.com/object-settings/create-custom-objects)
5. [Create calculation and rollup properties](https://knowledge.hubspot.com/properties/create-calculation-properties)
6. [Custom objects API guide](https://developers.hubspot.com/docs/api-reference/crm-custom-objects-v3/guide)
7. [Use dependent form fields](https://knowledge.hubspot.com/forms/use-dependent-form-fields)
8. [Custom formula functions](https://knowledge.hubspot.com/workflows/custom-formula-functions)

### Community & Additional Resources

- [HubSpot Community Forum - Validation Rules](https://community.hubspot.com/t5/HubSpot-Ideas/Validation-Rules/idi-p/22068)
- [HubSpot Community Forum - Field Dependencies](https://community.hubspot.com/t5/HubSpot-Ideas/Field-Dependencies-for-Contact-Properties/idi-p/8942)
- [HubSpot Developer Blog - Custom Objects](https://developers.hubspot.com/blog/introducing-custom-objects-for-hubspot)

---

## Summary

HubSpot's custom objects and fields provide robust capabilities for extending the CRM beyond standard objects. The platform supports:

- **15+ property types** covering text, numbers, dates, and specialized fields
- **Flexible validation** with character limits, number ranges, regex patterns, and uniqueness constraints
- **Calculated fields** with full formula support for automating computations
- **Emerging field dependencies** through conditional property logic and form-level dependencies
- **Enterprise-grade custom objects** with customizable pipelines and associations

Success requires understanding subscription-level feature availability, enforcing data quality through measured validation, and planning field dependencies carefully for complex workflows.

---

**Report Generated:** December 24, 2025
**Last Updated:** Based on HubSpot documentation current as of 2025
