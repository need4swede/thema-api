const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Add security headers
app.use(cors()); // Enable CORS
app.use(morgan('combined')); // HTTP request logging
app.use(express.json()); // Parse JSON request bodies

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Load data
let themaData;
try {
    const dataPath = path.join(__dirname, '..', 'data.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    themaData = JSON.parse(rawData);
} catch (error) {
    console.error('Error loading data:', error);
    process.exit(1);
}

// Utility function to convert date from YYYYMMDD to ISO 8601 (YYYY-MM-DD)
function formatDate(dateObj) {
    if (!dateObj || !dateObj['#text']) return null;

    const dateStr = dateObj['#text'].toString();
    if (dateStr.length !== 8) return dateStr;

    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
}

// Routes
app.get('/api/v1/metadata', (req, res) => {
    try {
        const { CodeListNumber, CodeListDescription, IssueNumber, VersionNumber, IssueDate, LastUpdated } = themaData.CodeList;

        const metadata = {
            codeListNumber: CodeListNumber,
            codeListDescription: CodeListDescription,
            issueNumber: IssueNumber,
            versionNumber: VersionNumber,
            issueDate: formatDate(IssueDate),
            lastUpdated: formatDate(LastUpdated),
            totalCodes: themaData.CodeList.ThemaCodes.Code.length
        };

        res.json(metadata);
    } catch (error) {
        console.error('Error retrieving metadata:', error);
        res.status(500).json({
            error: {
                status: 500,
                message: 'Internal server error while retrieving metadata',
                code: 'METADATA_ERROR'
            }
        });
    }
});

// Get all codes (with pagination)
app.get('/api/v1/codes', (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const codes = themaData.CodeList.ThemaCodes.Code;
        const paginatedCodes = codes.slice(startIndex, endIndex);

        const formattedCodes = paginatedCodes.map(code => ({
            codeValue: code.CodeValue,
            codeDescription: code.CodeDescription,
            codeNotes: code.CodeNotes || null,
            codeParent: code.CodeParent || null,
            issueNumber: code.IssueNumber,
            modified: code.Modified || null
        }));

        const response = {
            pagination: {
                total: codes.length,
                page,
                limit,
                pages: Math.ceil(codes.length / limit)
            },
            data: formattedCodes
        };

        res.json(response);
    } catch (error) {
        console.error('Error retrieving codes:', error);
        res.status(500).json({
            error: {
                status: 500,
                message: 'Internal server error while retrieving codes',
                code: 'CODES_ERROR'
            }
        });
    }
});

// Search for codes
app.get('/api/v1/codes/search', (req, res) => {
    try {
        const { query, parent, page = 1, limit = 100 } = req.query;

        if (!query && !parent) {
            return res.status(400).json({
                error: {
                    status: 400,
                    message: 'At least one search parameter (query or parent) is required',
                    code: 'INVALID_SEARCH'
                }
            });
        }

        const codes = themaData.CodeList.ThemaCodes.Code;
        let filteredCodes = codes;

        // Filter by query (search in code value and description)
        if (query) {
            const queryLower = query.toLowerCase();
            filteredCodes = filteredCodes.filter(code =>
                code.CodeValue.toLowerCase().includes(queryLower) ||
                code.CodeDescription.toLowerCase().includes(queryLower)
            );
        }

        // Filter by parent code
        if (parent) {
            filteredCodes = filteredCodes.filter(code => code.CodeParent === parent);
        }

        // Apply pagination
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const endIndex = parseInt(page) * parseInt(limit);
        const paginatedCodes = filteredCodes.slice(startIndex, endIndex);

        const formattedCodes = paginatedCodes.map(code => ({
            codeValue: code.CodeValue,
            codeDescription: code.CodeDescription,
            codeNotes: code.CodeNotes || null,
            codeParent: code.CodeParent || null,
            issueNumber: code.IssueNumber,
            modified: code.Modified || null
        }));

        const response = {
            pagination: {
                total: filteredCodes.length,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(filteredCodes.length / parseInt(limit))
            },
            data: formattedCodes
        };

        res.json(response);
    } catch (error) {
        console.error('Error searching codes:', error);
        res.status(500).json({
            error: {
                status: 500,
                message: 'Internal server error while searching codes',
                code: 'SEARCH_ERROR'
            }
        });
    }
});

// Get a specific code by its value
app.get('/api/v1/codes/:codeValue', (req, res) => {
    try {
        const codeValue = req.params.codeValue;
        const codes = themaData.CodeList.ThemaCodes.Code;

        const code = codes.find(c => c.CodeValue === codeValue);

        if (!code) {
            return res.status(404).json({
                error: {
                    status: 404,
                    message: `Code with value '${codeValue}' not found`,
                    code: 'CODE_NOT_FOUND'
                }
            });
        }

        const formattedCode = {
            codeValue: code.CodeValue,
            codeDescription: code.CodeDescription,
            codeNotes: code.CodeNotes || null,
            codeParent: code.CodeParent || null,
            issueNumber: code.IssueNumber,
            modified: code.Modified || null
        };

        res.json(formattedCode);
    } catch (error) {
        console.error('Error retrieving code:', error);
        res.status(500).json({
            error: {
                status: 500,
                message: 'Internal server error while retrieving code',
                code: 'CODE_ERROR'
            }
        });
    }
});

// Get children of a specific code
app.get('/api/v1/codes/:codeValue/children', (req, res) => {
    try {
        const codeValue = req.params.codeValue;
        const codes = themaData.CodeList.ThemaCodes.Code;

        // Check if the parent code exists
        const parentExists = codes.some(c => c.CodeValue === codeValue);

        if (!parentExists) {
            return res.status(404).json({
                error: {
                    status: 404,
                    message: `Parent code with value '${codeValue}' not found`,
                    code: 'PARENT_CODE_NOT_FOUND'
                }
            });
        }

        // Find all children
        const children = codes.filter(c => c.CodeParent === codeValue);

        const formattedChildren = children.map(code => ({
            codeValue: code.CodeValue,
            codeDescription: code.CodeDescription,
            codeNotes: code.CodeNotes || null,
            codeParent: code.CodeParent || null,
            issueNumber: code.IssueNumber,
            modified: code.Modified || null
        }));

        res.json({
            parent: codeValue,
            count: children.length,
            children: formattedChildren
        });
    } catch (error) {
        console.error('Error retrieving children:', error);
        res.status(500).json({
            error: {
                status: 500,
                message: 'Internal server error while retrieving children',
                code: 'CHILDREN_ERROR'
            }
        });
    }
});

// Error handling for undefined routes
app.use((req, res, next) => {
    // If the request is for an API endpoint
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            error: {
                status: 404,
                message: 'API endpoint not found',
                code: 'ENDPOINT_NOT_FOUND'
            }
        });
    }

    // For all other routes, serve the frontend
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Thema API server running on port ${PORT}`);
});

module.exports = app; // Export for testing
