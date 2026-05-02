import React, { createContext, useContext, useState } from 'react';

const MappingContext = createContext();

export const MappingProvider = ({ children }) => {
    const [extractedData, setExtractedData] = useState(null);
    const [templateHeaders, setTemplateHeaders] = useState([]);
    
    // Dynamic source columns from uploaded customer file
    const [sourceColumns, setSourceColumns] = useState([]);
    
    const [mapping, setMapping] = useState({});
    const [jobId, setJobId] = useState(null);
    
    const [customerFileUrl, setCustomerFileUrl] = useState(null);
    
    // Helper to load job data from history
    const loadJobData = (job, fileUrl = null) => {
        setJobId(job.id);
        setExtractedData(job.mapped_data || job.extracted_data || []);
        setTemplateHeaders(job.template_headers || []);
        setSourceColumns(job.source_columns || []);
        setMapping(job.mapping || {});
        if (fileUrl) setCustomerFileUrl(fileUrl);
    };

    return (
        <MappingContext.Provider value={{ 
            extractedData, setExtractedData, 
            templateHeaders, setTemplateHeaders,
            sourceColumns, setSourceColumns,
            mapping, setMapping,
            jobId, setJobId,
            customerFileUrl, setCustomerFileUrl,
            loadJobData
        }}>
            {children}
        </MappingContext.Provider>
    );
};

export const useMapping = () => useContext(MappingContext);
