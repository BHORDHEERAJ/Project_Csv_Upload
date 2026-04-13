const applyMapping = (rawData, mappingConfig) => {
    const { mapping_rules, default_values } = mappingConfig;
    
    return rawData.map(row => {
        let mappedRow = {};

        // Apply rules from mapping_rules
        Object.keys(mapping_rules).forEach(targetField => {
            const rule = mapping_rules[targetField];
            let value = null;

            if (rule.source_field && row[rule.source_field] !== undefined) {
                value = row[rule.source_field];
            } else if (rule.fixed_value !== undefined) {
                value = rule.fixed_value;
            } else if (rule.fallback !== undefined) {
                value = rule.fallback;
            }

            // Apply transformations
            if (rule.transformations && Array.isArray(rule.transformations)) {
                rule.transformations.forEach(transform => {
                    value = applyTransformation(value, transform);
                });
            }

            mappedRow[targetField] = value;
        });

        // Apply default values for missing fields
        if (default_values) {
            Object.keys(default_values).forEach(field => {
                if (mappedRow[field] === undefined || mappedRow[field] === null) {
                    mappedRow[field] = default_values[field];
                }
            });
        }

        return mappedRow;
    });
};

const applyTransformation = (value, transformation) => {
    if (value === null || value === undefined) return value;

    switch (transformation) {
        case 'clean_item_name':
            return String(value).trim().replace(/[^\w\d\s\u0900-\u097F]/g, ''); // Keep English, numbers, spaces, and Marathi
        case 'trim':
            return String(value).trim();
        case 'to_integer':
            return parseInt(value, 10) || 0;
        case 'to_float':
            return parseFloat(value) || 0.0;
        default:
            return value;
    }
};

module.exports = { applyMapping };
