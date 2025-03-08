document.addEventListener('DOMContentLoaded', function() {
    // Initialize K-map
    const kmap = Array(16).fill(0);
    let selectedTool = '1';  // Default tool is to set cells to 1
    let selectedCells = new Set(); // Keep track of selected cells
    let currentMode = 'minterms';  // Default mode is minterms
    
    // K-map cell click handler
    document.querySelectorAll('.kmap-cell').forEach(cell => {
        cell.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            
            if (selectedTool === '1') {
                kmap[index] = 1;
                this.classList.remove('selected-0', 'selected-x', 'selected-cell');
                this.classList.add('selected-1');
                // Clear any selections when using the value setting tools
                selectedCells.clear();
                updateSelectedCellsDisplay();
            } else if (selectedTool === '0') {
                kmap[index] = 0;
                this.classList.remove('selected-1', 'selected-x', 'selected-cell');
                this.classList.add('selected-0');
                // Clear any selections when using the value setting tools
                selectedCells.clear();
                updateSelectedCellsDisplay();
            } else if (selectedTool === 'x') {
                kmap[index] = 'x';
                this.classList.remove('selected-0', 'selected-1', 'selected-cell');
                this.classList.add('selected-x');
                // Clear any selections when using the value setting tools
                selectedCells.clear();
                updateSelectedCellsDisplay();
            } else if (selectedTool === 'select') {
                // Toggle selection state
                if (selectedCells.has(index)) {
                    selectedCells.delete(index);
                    this.classList.remove('selected-cell');
                } else {
                    // Selection logic based on current mode
                    if ((currentMode === 'minterms' && (kmap[index] === 1 || kmap[index] === 'x')) || 
                        (currentMode === 'maxterms' && (kmap[index] === 0 || kmap[index] === 'x'))) {
                        selectedCells.add(index);
                        this.classList.add('selected-cell');
                    } else {
                        // Alert the user about valid selections based on current mode
                        const validValues = currentMode === 'minterms' ? "1 or X (don't care)" : "0 or X (don't care)";
                        alert(`In ${currentMode} mode, you can only select cells with value ${validValues}`);
                        return;
                    }
                }
                updateSelectedCellsDisplay();
                return; // Don't update truth table or solve when just selecting
            }
            
            updateTruthTable();
            solveKMap();
        });
    });
    
    // Tool selection
    document.getElementById('setTo1').addEventListener('click', () => {
        selectedTool = '1';
        highlightSelectedButton('setTo1');
    });
    
    document.getElementById('setTo0').addEventListener('click', () => {
        selectedTool = '0';
        highlightSelectedButton('setTo0');
    });
    
    document.getElementById('setToX').addEventListener('click', () => {
        selectedTool = 'x';
        highlightSelectedButton('setToX');
    });
    
    document.getElementById('selectTool').addEventListener('click', () => {
        // Check if we're in truth table mode
        if (currentMode === 'truthTable') {
            alert('Selection tool is not available in Truth Table mode.\nUse the Truth Table cells to set values instead.');
            return;
        }
        
        selectedTool = 'select';
        highlightSelectedButton('selectTool');
    });
    
    document.getElementById('clearKmap').addEventListener('click', () => {
        clearKMap();
        selectedCells.clear();
        updateSelectedCellsDisplay();
        highlightSelectedButton('setTo1'); // Reset to default tool
    });
    
    function highlightSelectedButton(buttonId) {
        // Remove active class from all tool buttons
        document.querySelectorAll('#setTo1, #setTo0, #setToX, #selectTool, #clearKmap').forEach(btn => {
            btn.classList.remove('active');
            btn.style.boxShadow = '';
        });
        
        // Add active class to selected button
        document.getElementById(buttonId).classList.add('active');
        document.getElementById(buttonId).style.boxShadow = '0 0 0 3px rgba(255,255,255,0.5)';
    }
    
    function updateSelectedCellsDisplay() {
        const selectedCellsDiv = document.querySelector('#selectedCells h5 .badge');
        if (selectedCells.size === 0) {
            selectedCellsDiv.textContent = 'None';
            selectedCellsDiv.className = 'badge bg-secondary';
        } else {
            const cellsText = Array.from(selectedCells).sort((a, b) => a - b).join(', ');
            selectedCellsDiv.textContent = cellsText;
            selectedCellsDiv.className = 'badge bg-primary';
        }
    }
    
    // Generate expression from selection
    document.getElementById('generateFromSelection').addEventListener('click', function() {
        // Add check for maxterm mode and show appropriate message
        if (currentMode === 'maxterms') {
            alert('Generate from Selection is not implemented for maxterm mode yet.');
            return;
        }
        
        if (selectedCells.size === 0) {
            alert('Please select at least one cell first');
            return;
        }
        
        // Convert the selected cells to an expression based on the mode
        const expression = generateExpressionFromCells(Array.from(selectedCells), currentMode);
        
        // Update the simplified expression display
        document.getElementById('simplifiedExpression').textContent = expression;
        
        // Update groups info
        const groupsInfo = `Manual ${currentMode} selection: [${Array.from(selectedCells).sort((a, b) => a - b).join(', ')}] → ${expression}`;
        document.getElementById('groups').innerHTML = groupsInfo;
    });
    
    function generateExpressionFromCells(cells, mode) {
        // If no cells selected, return appropriate constant
        if (cells.length === 0) return mode === 'minterms' ? '0' : '1';
        
        // If all cells selected (16 cells), return appropriate constant
        if (cells.length === 16) return mode === 'minterms' ? '1' : '0';
        
        // For minterms: Generate sum of products (OR of AND terms)
        // For maxterms: Generate product of sums (AND of OR terms)
        if (mode === 'minterms') {
            // Minterm processing (SOP form)
            // Check if this group can be simplified
            const simplified = trySimplifyGroup(cells);
            if (simplified) {
                return simplified;
            }
            
            // If not, create individual product terms
            const terms = cells.map(cellIndex => {
                // Skip don't care cells for expression generation
                if (kmap[cellIndex] === 'x') return null;
                
                // Generate product term for this cell
                const binary = cellIndex.toString(2).padStart(4, '0');
                let term = [];
                if (binary[0] === '0') term.push("A'");
                else term.push('A');
                
                if (binary[1] === '0') term.push("B'");
                else term.push('B');
                
                if (binary[2] === '0') term.push("C'");
                else term.push('C');
                
                if (binary[3] === '0') term.push("D'");
                else term.push('D');
                
                return term.join('');
            }).filter(term => term !== null); // Remove null terms (don't cares)
            
            return terms.length > 0 ? terms.join(' + ') : '0';
            
        } else {
            // Maxterm processing (POS form)
            // First, convert to the cells that should be included in maxterms
            // (all cells except the selected ones)
            const maxtermsIndices = [];
            for (let i = 0; i < 16; i++) {
                // Skip selected cells and don't cares
                if (!cells.includes(i) && kmap[i] !== 'x') {
                    maxtermsIndices.push(i);
                }
            }
            
            // If all cells are selected or don't care, return 0
            if (maxtermsIndices.length === 0) return '0';
            
            // Check if the maxterms can be simplified as a group
            const simplified = trySimplifyMaxtermGroup(maxtermsIndices);
            if (simplified) {
                return simplified;
            }
            
            // Generate individual sum terms for maxterms
            const sumTerms = maxtermsIndices.map(cellIndex => {
                const binary = cellIndex.toString(2).padStart(4, '0');
                let term = [];
                // In maxterms, the variables are inverted compared to minterms
                if (binary[0] === '0') term.push("A");
                else term.push("A'");
                
                if (binary[1] === '0') term.push("B");
                else term.push("B'");
                
                if (binary[2] === '0') term.push("C");
                else term.push("C'");
                
                if (binary[3] === '0') term.push("D");
                else term.push("D'");
                
                return '(' + term.join(' + ') + ')';
            });
            
            return sumTerms.length > 0 ? sumTerms.join(' · ') : '1';
        }
    }
    
    // Try to simplify a group of cells if they form a valid K-map group
    function trySimplifyGroup(cells) {
        // Sort cells for easier comparison
        cells = cells.sort((a, b) => a - b);
        
        // Check if this matches any of our predefined groups
        const potentialGroups = [
            ...getPotentialGroups(2),
            ...getPotentialGroups(4),
            ...getPotentialGroups(8)
        ];
        
        for (const group of potentialGroups) {
            // Check if the selected cells exactly match this group
            if (cells.length === group.length && 
                cells.every((cell, idx) => cell === group[idx])) {
                return groupToExpression(group);
            }
        }
        
        return null; // No match found, can't simplify
    }
    
    // Add function to simplify maxterm groups
    function trySimplifyMaxtermGroup(cells) {
        // Similar logic to trySimplifyGroup but for maxterms
        // You can implement additional maxterm-specific simplification here
        // For now, we'll reuse the minterm logic but invert the result
        return null; // Simplified implementation for now
    }
    
    // Input method toggle - update to track the current mode
    document.querySelectorAll('input[name="inputMethod"]').forEach(input => {
        input.addEventListener('change', function() {
            if (this.value === 'minterms') {
                document.getElementById('mintermInput').classList.remove('d-none');
                document.getElementById('maxtermInput').classList.add('d-none');
                currentMode = 'minterms';
                // Clear selections when changing modes
                clearSelections();
                updateMode();
            } else if (this.value === 'maxterms') {
                document.getElementById('mintermInput').classList.add('d-none');
                document.getElementById('maxtermInput').classList.remove('d-none');
                currentMode = 'maxterms';
                // Clear selections when changing modes
                clearSelections();
                updateMode();
            }
        });
    });
    
    // Enhanced input method toggle to handle truth table mode
    document.querySelectorAll('input[name="inputMethod"]').forEach(input => {
        input.addEventListener('change', function() {
            if (this.value === 'minterms') {
                document.getElementById('mintermInput').classList.remove('d-none');
                document.getElementById('maxtermInput').classList.add('d-none');
                document.getElementById('truthTableInput').classList.add('d-none');
                currentMode = 'minterms';
                // Clear selections when changing modes
                clearSelections();
                updateMode();
            } else if (this.value === 'maxterms') {
                document.getElementById('mintermInput').classList.add('d-none');
                document.getElementById('maxtermInput').classList.remove('d-none');
                document.getElementById('truthTableInput').classList.add('d-none');
                currentMode = 'maxterms';
                // Clear selections when changing modes
                clearSelections();
                updateMode();
            } else if (this.value === 'truthTable') {
                document.getElementById('mintermInput').classList.add('d-none');
                document.getElementById('maxtermInput').classList.add('d-none');
                document.getElementById('truthTableInput').classList.remove('d-none');
                currentMode = 'truthTable';
                // Clear selections when changing modes
                clearSelections();
                updateMode();
                
                // Make sure the truth table is showing
                document.querySelector('.row.mt-4 .card').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Function to clear only selections (not the K-map)
    function clearSelections() {
        selectedCells.clear();
        document.querySelectorAll('.kmap-cell').forEach(cell => {
            cell.classList.remove('selected-cell');
        });
        updateSelectedCellsDisplay();
    }
    
    // Function to update mode indication
    function updateMode() {
        let modeText = "Unknown Mode";
        if (currentMode === 'minterms') {
            modeText = "Minterms Mode";
            // Enable selection button only for minterm mode
            document.getElementById('generateFromSelection').disabled = false;
            document.getElementById('selectTool').disabled = false;
        } else if (currentMode === 'maxterms') {
            modeText = "Maxterms Mode";
            // Disable selection button for maxterm mode just like truth table mode
            document.getElementById('generateFromSelection').disabled = true;
            document.getElementById('selectTool').disabled = false;
            // Don't reset tool selection for maxterms, just disable the generate button
        } else if (currentMode === 'truthTable') {
            modeText = "Truth Table Mode";
            // Disable selection button and tools for truth table mode
            document.getElementById('generateFromSelection').disabled = true;
            document.getElementById('selectTool').disabled = true;
            // Reset to default tool if select was active
            if (selectedTool === 'select') {
                selectedTool = '1';
                highlightSelectedButton('setTo1');
            }
        }
        
        document.getElementById('selectedCells').setAttribute('data-mode', currentMode);
        
        // Add mode indicator if it doesn't exist
        let modeIndicator = document.querySelector('#mode-indicator');
        if (!modeIndicator) {
            modeIndicator = document.createElement('div');
            modeIndicator.id = 'mode-indicator';
            modeIndicator.className = 'badge bg-info mb-2';
            document.getElementById('selectedCells').prepend(modeIndicator);
        }
        
        // Update the mode text
        modeIndicator.textContent = modeText;
        
        // Update button styles based on disabled state
        const generateFromSelectionBtn = document.getElementById('generateFromSelection');
        if (generateFromSelectionBtn.disabled) {
            generateFromSelectionBtn.classList.add('btn-secondary');
            generateFromSelectionBtn.classList.remove('btn-info');
        } else {
            generateFromSelectionBtn.classList.add('btn-info');
            generateFromSelectionBtn.classList.remove('btn-secondary');
        }
        
        const selectToolBtn = document.getElementById('selectTool');
        if (selectToolBtn.disabled) {
            selectToolBtn.classList.add('text-muted');
        } else {
            selectToolBtn.classList.remove('text-muted');
        }
    }
    
    // Generate K-map from minterms
    document.getElementById('generateFromMinterms').addEventListener('click', function() {
        const mintermsInput = document.getElementById('mintermsInput').value;
        const dontCareInput = document.getElementById('dontCareInput').value;
        
        clearKMap();
        
        const minterms = mintermsInput.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x) && x >= 0 && x < 16);
        const dontCares = dontCareInput.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x) && x >= 0 && x < 16);
        
        minterms.forEach(index => {
            kmap[index] = 1;
            document.querySelector(`.kmap-cell[data-index="${index}"]`).classList.add('selected-1');
        });
        
        dontCares.forEach(index => {
            kmap[index] = 'x';
            document.querySelector(`.kmap-cell[data-index="${index}"]`).classList.add('selected-x');
        });
        
        updateTruthTable();
        solveKMap();
    });
    
    // Generate K-map from maxterms
    document.getElementById('generateFromMaxterms').addEventListener('click', function() {
        const maxtermsInput = document.getElementById('maxtermsInput').value;
        const dontCareInput = document.getElementById('maxDontCareInput').value;
        
        clearKMap();
        
        // Set all cells to 1 initially
        for (let i = 0; i < 16; i++) {
            kmap[i] = 1;
            document.querySelector(`.kmap-cell[data-index="${i}"]`).classList.add('selected-1');
        }
        
        // Set maxterms to 0
        const maxterms = maxtermsInput.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x) && x >= 0 && x < 16);
        maxterms.forEach(index => {
            kmap[index] = 0;
            document.querySelector(`.kmap-cell[data-index="${index}"]`).classList.remove('selected-1');
            document.querySelector(`.kmap-cell[data-index="${index}"]`).classList.add('selected-0');
        });
        
        // Set don't cares
        const dontCares = dontCareInput.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x) && x >= 0 && x < 16);
        dontCares.forEach(index => {
            kmap[index] = 'x';
            document.querySelector(`.kmap-cell[data-index="${index}"]`).classList.remove('selected-0', 'selected-1');
            document.querySelector(`.kmap-cell[data-index="${index}"]`).classList.add('selected-x');
        });
        
        updateTruthTable();
        solveKMap();
    });
    
    // Verify expression
    document.getElementById('verifyExpression').addEventListener('click', function() {
        const expression = document.getElementById('booleanExpression').value.trim();
        if (!expression) {
            alert('Please enter a Boolean expression');
            return;
        }
        
        try {
            // Clear the current K-map
            clearKMap();
            
            // Parse and evaluate the expression for all 16 combinations
            for (let i = 0; i < 16; i++) {
                // Convert index to binary variables A, B, C, D
                const binary = i.toString(2).padStart(4, '0');
                const variables = {
                    A: binary[0] === '1',
                    B: binary[1] === '1',
                    C: binary[2] === '1',
                    D: binary[3] === '1',
                    "A'": binary[0] !== '1',
                    "B'": binary[1] !== '1',
                    "C'": binary[2] !== '1',
                    "D'": binary[3] !== '1'
                };
                
                // Evaluate the expression
                const result = evaluateBooleanExpression(expression, variables);
                
                // Update the K-map
                kmap[i] = result ? 1 : 0;
                const cell = document.querySelector(`.kmap-cell[data-index="${i}"]`);
                cell.classList.remove('selected-0', 'selected-1', 'selected-x');
                cell.classList.add(result ? 'selected-1' : 'selected-0');
            }
            
            // Update the truth table and solve
            updateTruthTable();
            solveKMap();
            
        } catch (error) {
            alert('Error in expression: ' + error.message + 
                  '\n\nSupported syntax: Sum-of-Products form like AB + CD\'' +
                  '\nUse single letters (A-D) and apostrophe for complement (A\')');
        }
    });

    // Verify Boolean Expression matches current minterm/maxterm inputs
    document.getElementById('verifyExpression').addEventListener('click', function() {
        const expression = document.getElementById('booleanExpression').value.trim();
        if (!expression) {
            alert('Please enter a Boolean expression');
            return;
        }
        
        try {
            // Create a temporary K-map to evaluate the expression without modifying the current one
            const tempKmap = Array(16).fill(0);
            let expressionMinterms = [];
            let expressionMaxterms = [];
            
            // Parse and evaluate the expression for all 16 combinations
            for (let i = 0; i < 16; i++) {
                // Convert index to binary variables A, B, C, D
                const binary = i.toString(2).padStart(4, '0');
                const variables = {
                    A: binary[0] === '1',
                    B: binary[1] === '1',
                    C: binary[2] === '1',
                    D: binary[3] === '1',
                    "A'": binary[0] !== '1',
                    "B'": binary[1] !== '1',
                    "C'": binary[2] !== '1',
                    "D'": binary[3] !== '1'
                };
                
                // Evaluate the expression
                const result = evaluateBooleanExpression(expression, variables);
                tempKmap[i] = result ? 1 : 0;
                
                // Track minterms and maxterms
                if (result) {
                    expressionMinterms.push(i);
                } else {
                    expressionMaxterms.push(i);
                }
            }
            
            // Get the user's current minterm/maxterm inputs
            let userMinterms = [];
            let userMaxterms = [];
            let userDontCares = [];
            
            if (currentMode === 'minterms') {
                const mintermsInput = document.getElementById('mintermsInput').value;
                const dontCareInput = document.getElementById('dontCareInput').value;
                
                userMinterms = mintermsInput.split(',')
                    .map(x => parseInt(x.trim()))
                    .filter(x => !isNaN(x) && x >= 0 && x < 16);
                
                userDontCares = dontCareInput.split(',')
                    .map(x => parseInt(x.trim()))
                    .filter(x => !isNaN(x) && x >= 0 && x < 16);
                
                // Calculate maxterms (all numbers 0-15 except minterms and don't cares)
                userMaxterms = Array.from({length: 16}, (_, i) => i)
                    .filter(num => !userMinterms.includes(num) && !userDontCares.includes(num));
            } else if (currentMode === 'maxterms') {
                const maxtermsInput = document.getElementById('maxtermsInput').value;
                const dontCareInput = document.getElementById('maxDontCareInput').value;
                
                userMaxterms = maxtermsInput.split(',')
                    .map(x => parseInt(x.trim()))
                    .filter(x => !isNaN(x) && x >= 0 && x < 16);
                
                userDontCares = dontCareInput.split(',')
                    .map(x => parseInt(x.trim()))
                    .filter(x => !isNaN(x) && x >= 0 && x < 16);
                
                // Calculate minterms (all numbers 0-15 except maxterms and don't cares)
                userMinterms = Array.from({length: 16}, (_, i) => i)
                    .filter(num => !userMaxterms.includes(num) && !userDontCares.includes(num));
            } else if (currentMode === 'truthTable') {
                // If in truth table mode, compare against the current K-map
                for (let i = 0; i < 16; i++) {
                    if (kmap[i] === 1) {
                        userMinterms.push(i);
                    } else if (kmap[i] === 0) {
                        userMaxterms.push(i);
                    } else if (kmap[i] === 'x') {
                        userDontCares.push(i);
                    }
                }
            }
            
            // Compare the expression results with user inputs
            const mintermMismatches = [];
            const maxtermMismatches = [];
            
            // Check for minterm mismatches (cells that should be 1 but aren't)
            for (const minterm of userMinterms) {
                if (tempKmap[minterm] !== 1) {
                    mintermMismatches.push(minterm);
                }
            }
            
            // Check for maxterm mismatches (cells that should be 0 but aren't)
            for (const maxterm of userMaxterms) {
                if (tempKmap[maxterm] !== 0) {
                    maxtermMismatches.push(maxterm);
                }
            }
            
            // Display verification results
            if (mintermMismatches.length === 0 && maxtermMismatches.length === 0) {
                // Expression matches perfectly
                const successMessage = `
                    <div class="alert alert-success">
                        <h5><i class="fas fa-check-circle"></i> Success!</h5>
                        <p>The Boolean expression perfectly matches the ${currentMode} specification.</p>
                    </div>
                `;
                document.getElementById('groups').innerHTML = successMessage;
                
                // Update K-map with the expression
                updateKMapFromExpression(tempKmap);
                
            } else {
                // There are mismatches
                let mismatchMessage = `
                    <div class="alert alert-danger">
                        <h5><i class="fas fa-times-circle"></i> Verification Failed</h5>
                        <p>The Boolean expression doesn't match the ${currentMode} specification:</p>
                `;
                
                if (mintermMismatches.length > 0) {
                    mismatchMessage += `
                        <p>Missing 1's at positions: ${mintermMismatches.sort((a,b) => a-b).join(', ')}</p>
                    `;
                }
                
                if (maxtermMismatches.length > 0) {
                    mismatchMessage += `
                        <p>Missing 0's at positions: ${maxtermMismatches.sort((a,b) => a-b).join(', ')}</p>
                    `;
                }
                
                mismatchMessage += `
                    </div>
                    <div class="mt-2">
                        <button id="useExpressionAnyway" class="btn btn-outline-warning">Use This Expression Anyway</button>
                    </div>
                `;
                
                document.getElementById('groups').innerHTML = mismatchMessage;
                
                // Add event listener for "Use This Expression Anyway" button
                document.getElementById('useExpressionAnyway').addEventListener('click', function() {
                    updateKMapFromExpression(tempKmap);
                });
            }
            
            // Show the simplified expression
            const mintermsFromExpression = expressionMinterms.sort((a,b) => a-b).join(', ');
            const simplifiedInfo = `
                <p>Expression <strong>${expression}</strong> produces:</p>
                <p>Minterms: ${mintermsFromExpression || 'None'}</p>
            `;
            document.getElementById('simplifiedExpression').innerHTML = simplifiedInfo;
            
        } catch (error) {
            alert('Error in expression: ' + error.message + 
                  '\n\nSupported syntax: Sum-of-Products form like AB + CD\'' +
                  '\nUse single letters (A-D) and apostrophe for complement (A\')');
        }
    });

    // Helper function to update K-map from evaluated expression
    function updateKMapFromExpression(tempKmap) {
        // Update the actual K-map with the expression results
        clearKMap();
        
        for (let i = 0; i < 16; i++) {
            kmap[i] = tempKmap[i];
            const cell = document.querySelector(`.kmap-cell[data-index="${i}"]`);
            cell.classList.remove('selected-0', 'selected-1', 'selected-x');
            cell.classList.add(tempKmap[i] === 1 ? 'selected-1' : 'selected-0');
        }
        
        // Update the truth table and solve
        updateTruthTable();
        solveKMap();
    }

    // Function to evaluate a Boolean expression in SOP form
    function evaluateBooleanExpression(expr, variables) {
        // Normalize the expression: remove spaces, convert to uppercase
        expr = expr.toUpperCase().replace(/\s+/g, '');
        
        // Split the expression by OR (+) into terms
        const terms = expr.split('+');
        
        // A term is true if any of its products is true
        return terms.some(term => {
            // Parse the term to extract variables
            const literals = [];
            for (let i = 0; i < term.length; i++) {
                if (/[A-D]/.test(term[i])) {
                    // Check if this variable has a complement
                    if (i + 1 < term.length && term[i + 1] === "'") {
                        literals.push(term[i] + "'");
                        i++; // Skip the next character (')
                    } else {
                        literals.push(term[i]);
                    }
                }
            }
            
            // A product term is true if all its literals are true
            return literals.every(literal => variables[literal]);
        });
    }
    
    // Clear K-map
    function clearKMap() {
        for (let i = 0; i < 16; i++) {
            kmap[i] = 0;
        }
        document.querySelectorAll('.kmap-cell').forEach(cell => {
            cell.classList.remove('selected-1', 'selected-0', 'selected-x', 'selected-cell');
            cell.classList.add('selected-0');
        });
        updateTruthTable();
        document.getElementById('simplifiedExpression').textContent = 'Result will appear here';
        document.getElementById('groups').textContent = 'Groups will appear here';
        selectedCells.clear();
        selectedTool = '1';
    }
    
    // Update truth table based on K-map
    function updateTruthTable() {
        const tbody = document.getElementById('truthTableBody');
        tbody.innerHTML = '';
        
        for (let i = 0; i < 16; i++) {
            const row = document.createElement('tr');
            
            // Binary representation of the index
            const binary = i.toString(2).padStart(4, '0');
            
            // Add binary digits as separate cells
            for (let j = 0; j < 4; j++) {
                const cell = document.createElement('td');
                cell.textContent = binary[j];
                row.appendChild(cell);
            }
            
            // Add index cell
            const indexCell = document.createElement('td');
            indexCell.textContent = i;
            row.appendChild(indexCell);
            
            // Add output cell
            const outputCell = document.createElement('td');
            if (kmap[i] === 1) {
                outputCell.textContent = '1';
                outputCell.classList.add('table-success');
            } else if (kmap[i] === 0) {
                outputCell.textContent = '0';
                outputCell.classList.add('table-danger');
            } else {
                outputCell.textContent = 'X';
                outputCell.classList.add('table-warning');
            }
            row.appendChild(outputCell);
            
            tbody.appendChild(row);
        }
        
        // Make the truth table interactive
        makeTruthTableInteractive();
    }
    
    // Update solveKMap function to handle different modes properly
    function solveKMap() {
        // Check if we're in a mode where simplification is not fully implemented
        if (currentMode === 'maxterms' || currentMode === 'truthTable') {
            // For maxterms and truth table modes, show a "not implemented yet" message
            document.getElementById('simplifiedExpression').innerHTML = 
                `<span class="text-warning">Simplified Boolean expression generation for ${currentMode} is not implemented yet.</span>`;
            
            // Still show the minterms in the current K-Map
            const minterms = [];
            const maxterms = [];
            const dontCares = [];
            
            for (let i = 0; i < 16; i++) {
                if (kmap[i] === 1) {
                    minterms.push(i);
                } else if (kmap[i] === 0) {
                    maxterms.push(i);
                } else if (kmap[i] === 'x') {
                    dontCares.push(i);
                }
            }
            
            // Generate information about the K-Map state
            let infoMessage = '<div class="alert alert-info">';
            
            if (currentMode === 'maxterms') {
                infoMessage += '<h5>Maxterm Mode Information</h5>';
                infoMessage += `<p>Maxterms (value 0): ${maxterms.length > 0 ? maxterms.sort((a,b) => a-b).join(', ') : 'None'}</p>`;
                infoMessage += `<p>Minterms (value 1): ${minterms.length > 0 ? minterms.sort((a,b) => a-b).join(', ') : 'None'}</p>`;
            } else {
                infoMessage += '<h5>Truth Table Mode Information</h5>';
                infoMessage += `<p>Minterms (value 1): ${minterms.length > 0 ? minterms.sort((a,b) => a-b).join(', ') : 'None'}</p>`;
                infoMessage += `<p>Maxterms (value 0): ${maxterms.length > 0 ? maxterms.sort((a,b) => a-b).join(', ') : 'None'}</p>`;
            }
            
            infoMessage += `<p>Don't Cares (value X): ${dontCares.length > 0 ? dontCares.sort((a,b) => a-b).join(', ') : 'None'}</p>`;
            infoMessage += '</div>';
            
            document.getElementById('groups').innerHTML = infoMessage;
            return;
        }
        
        // Minterm mode (original implementation)
        // Find all minterms (cells with value 1)
        const minterms = [];
        const dontCares = [];
        
        for (let i = 0; i < 16; i++) {
            if (kmap[i] === 1) {
                minterms.push(i);
            } else if (kmap[i] === 'x') {
                dontCares.push(i);
            }
        }
        
        if (minterms.length === 0) {
            document.getElementById('simplifiedExpression').textContent = '0';
            document.getElementById('groups').textContent = 'No minterms (all zeros)';
            return;
        }
        
        if (minterms.length === 16) {
            document.getElementById('simplifiedExpression').textContent = '1';
            document.getElementById('groups').textContent = 'All minterms (all ones)';
            return;
        }
        
        // Find all valid groups (prime implicants)
        const groups = findGroups(minterms, dontCares);
        
        // Convert groups to expressions
        const expressions = groups.map(group => groupToExpression(group));
        
        // Join expressions with + for SOP form
        const simplifiedExpression = expressions.length > 0 ? expressions.join(' + ') : '0';
        
        // Update UI
        document.getElementById('simplifiedExpression').textContent = simplifiedExpression;
        
        // Display groups information
        const groupsInfo = groups.map((group, index) => {
            const cells = group.map(cell => cell.toString()).join(', ');
            return `Group ${index + 1}: [${cells}] → ${expressions[index]}`;
        }).join('<br>');
        
        document.getElementById('groups').innerHTML = groupsInfo || 'No valid groups found';
    }
    
    // Find all valid groups (prime implicants)
    function findGroups(minterms, dontCares) {
        // All cells that can be considered for grouping (1s and don't cares)
        const allCells = [...minterms, ...dontCares];
        
        // Results will hold all valid prime implicants
        const result = [];
        
        // Try to find groups of size 8 (3 variables eliminated)
        findGroupsOfSize(result, allCells, minterms, 8);
        
        // Try to find groups of size 4 (2 variables eliminated)
        findGroupsOfSize(result, allCells, minterms, 4);
        
        // Try to find groups of size 2 (1 variable eliminated)
        findGroupsOfSize(result, allCells, minterms, 2);
        
        // Add remaining ungrouped minterms as singleton groups
        const groupedMinterms = new Set(result.flat());
        const ungroupedMinterms = minterms.filter(m => !groupedMinterms.has(m));
        
        ungroupedMinterms.forEach(m => {
            result.push([m]);
        });
        
        return result;
    }
    
    // Find groups of a specific size
    function findGroupsOfSize(result, allCells, minterms, size) {
        // Potential groups based on K-Map structure
        const potentialGroups = getPotentialGroups(size);
        
        // Check each potential group
        for (const group of potentialGroups) {
            // Check if all cells in this group are either 1 or don't care
            const isValid = group.every(idx => allCells.includes(idx));
            
            // Make sure at least one cell is a 1 (not all don't cares)
            const hasMinterm = group.some(idx => minterms.includes(idx));
            
            if (isValid && hasMinterm) {
                // This is a valid group
                result.push(group);
                
                // Remove these minterms from consideration for smaller groups
                // (only visually, we'll still check all groups)
            }
        }
    }
    
    // Generate potential groups based on K-Map structure
    function getPotentialGroups(size) {
        const groups = [];
        
        if (size === 8) {
            // Half K-map groups (8 cells each)
            groups.push([0, 1, 2, 3, 4, 5, 6, 7]); // Top half
            groups.push([8, 9, 10, 11, 12, 13, 14, 15]); // Bottom half
            groups.push([0, 1, 4, 5, 8, 9, 12, 13]); // Left half
            groups.push([2, 3, 6, 7, 10, 11, 14, 15]); // Right half
        } else if (size === 4) {
            // Quad groups (4 cells each)
            groups.push([0, 1, 4, 5]); // Top-left quad
            groups.push([2, 3, 6, 7]); // Top-right quad
            groups.push([8, 9, 12, 13]); // Bottom-left quad
            groups.push([10, 11, 14, 15]); // Bottom-right quad
            
            // Row groups
            groups.push([0, 1, 2, 3]); // Top row
            groups.push([4, 5, 6, 7]); // Second row
            groups.push([8, 9, 10, 11]); // Third row
            groups.push([12, 13, 14, 15]); // Bottom row
            
            // Column groups
            groups.push([0, 4, 8, 12]); // First column
            groups.push([1, 5, 9, 13]); // Second column
            groups.push([2, 6, 10, 14]); // Third column
            groups.push([3, 7, 11, 15]); // Fourth column
            
            // Wrapping groups
            groups.push([0, 3, 4, 7]); // Top wrap horizontal
            groups.push([8, 11, 12, 15]); // Bottom wrap horizontal
            groups.push([0, 2, 8, 10]); // Left wrap vertical
            groups.push([1, 3, 9, 11]); // Middle-left wrap vertical
            groups.push([4, 6, 12, 14]); // Middle-right wrap vertical
            groups.push([5, 7, 13, 15]); // Right wrap vertical
        } else if (size === 2) {
            // Pair groups (2 cells each)
            // Horizontal pairs
            for (let i = 0; i < 16; i += 2) {
                groups.push([i, i + 1]);
            }
            
            // Vertical pairs
            for (let i = 0; i < 8; i++) {
                groups.push([i, i + 8]);
            }
            
            // Horizontal wrap pairs
            groups.push([0, 3]);
            groups.push([4, 7]);
            groups.push([8, 11]);
            groups.push([12, 15]);
            
            // Vertical wrap pairs
            groups.push([0, 8]);
            groups.push([1, 9]);
            groups.push([2, 10]);
            groups.push([3, 11]);
            groups.push([4, 12]);
            groups.push([5, 13]);
            groups.push([6, 14]);
            groups.push([7, 15]);
        }
        
        return groups;
    }
    
    // Convert a group to a Boolean expression
    function groupToExpression(group) {
        if (group.length === 16) return "1"; // All cells
        
        // Determine which variables are eliminated (stay the same across the group)
        const binaryReps = group.map(idx => idx.toString(2).padStart(4, '0'));
        
        let A = new Set();
        let B = new Set();
        let C = new Set();
        let D = new Set();
        
        // Get all possible values for each variable in the group
        binaryReps.forEach(bin => {
            A.add(bin[0]);
            B.add(bin[1]);
            C.add(bin[2]);
            D.add(bin[3]);
        });
        
        // Build expression from non-eliminated variables
        let expr = [];
        
        if (A.size === 1) {
            expr.push(A.values().next().value === '0' ? "A'" : 'A');
        }
        
        if (B.size === 1) {
            expr.push(B.values().next().value === '0' ? "B'" : 'B');
        }
        
        if (C.size === 1) {
            expr.push(C.values().next().value === '0' ? "C'" : 'C');
        }
        
        if (D.size === 1) {
            expr.push(D.values().next().value === '0' ? "D'" : 'D');
        }
        
        return expr.length > 0 ? expr.join('') : '1';
    }
    
    // Add copy to clipboard functionality
    document.getElementById('copyExpression').addEventListener('click', function() {
        const expressionText = document.getElementById('simplifiedExpression').textContent;
        navigator.clipboard.writeText(expressionText)
            .then(() => {
                // Change button text temporarily to indicate success
                const originalText = this.textContent;
                this.textContent = "Copied!";
                setTimeout(() => {
                    this.textContent = originalText;
                }, 1500);
            })
            .catch(err => {
                alert('Error copying to clipboard: ' + err);
            });
    });
    
    // Initialize with empty K-map and truth table
    clearKMap();
    updateTruthTable();
    highlightSelectedButton('setTo1'); // Set default tool highlighting

    // Initialize mode indicator on page load
    updateMode();
    
    // Make Truth Table cells interactive
    function makeTruthTableInteractive() {
        const tbody = document.getElementById('truthTableBody');
        
        // Add click handlers to each output cell in the truth table
        document.querySelectorAll('#truthTableBody tr').forEach(row => {
            const outputCell = row.querySelector('td:last-child');
            const indexCell = row.querySelector('td:nth-last-child(2)');
            const index = parseInt(indexCell.textContent);
            
            // Make the output cell clickable to toggle between 0, 1, and X
            outputCell.classList.add('tt-clickable');
            outputCell.addEventListener('click', function() {
                // Only allow modification in truth table mode
                if (currentMode !== 'truthTable') {
                    alert('Switch to Truth Table mode to edit the truth table');
                    return;
                }
                
                // Toggle between values: 0 -> 1 -> X -> 0
                if (kmap[index] === 0) {
                    kmap[index] = 1;
                    this.textContent = '1';
                    this.className = '';
                    this.classList.add('table-success', 'tt-clickable');
                } else if (kmap[index] === 1) {
                    kmap[index] = 'x';
                    this.textContent = 'X';
                    this.className = '';
                    this.classList.add('table-warning', 'tt-clickable');
                } else {
                    kmap[index] = 0;
                    this.textContent = '0';
                    this.className = '';
                    this.classList.add('table-danger', 'tt-clickable');
                }
                
                // Update K-Map to reflect truth table changes
                updateKMapFromTruthTable(index);
            });
        });
    }

    // Update K-Map based on Truth Table changes
    function updateKMapFromTruthTable(index) {
        // Update the corresponding K-Map cell
        const kmapCell = document.querySelector(`.kmap-cell[data-index="${index}"]`);
        kmapCell.classList.remove('selected-0', 'selected-1', 'selected-x');
        
        if (kmap[index] === 0) {
            kmapCell.classList.add('selected-0');
        } else if (kmap[index] === 1) {
            kmapCell.classList.add('selected-1');
        } else {
            kmapCell.classList.add('selected-x');
        }
        
        // Solve K-Map with the updated values
        solveKMap();
    }

    // Enhanced updateTruthTable function to make cells interactive
    function updateTruthTable() {
        const tbody = document.getElementById('truthTableBody');
        tbody.innerHTML = '';
        
        for (let i = 0; i < 16; i++) {
            const row = document.createElement('tr');
            
            // Binary representation of the index
            const binary = i.toString(2).padStart(4, '0');
            
            // Add binary digits as separate cells
            for (let j = 0; j < 4; j++) {
                const cell = document.createElement('td');
                cell.textContent = binary[j];
                row.appendChild(cell);
            }
            
            // Add index cell
            const indexCell = document.createElement('td');
            indexCell.textContent = i;
            row.appendChild(indexCell);
            
            // Add output cell
            const outputCell = document.createElement('td');
            outputCell.classList.add('tt-clickable');
            
            if (kmap[i] === 1) {
                outputCell.textContent = '1';
                outputCell.classList.add('table-success');
            } else if (kmap[i] === 0) {
                outputCell.textContent = '0';
                outputCell.classList.add('table-danger');
            } else {
                outputCell.textContent = 'X';
                outputCell.classList.add('table-warning');
            }
            
            row.appendChild(outputCell);
            tbody.appendChild(row);
        }
        
        // Make the truth table interactive
        makeTruthTableInteractive();
    }

    // Add a Generate K-Map from Truth Table button handler
    document.getElementById('generateFromTruthTable').addEventListener('click', function() {
        solveKMap();
        alert('K-Map updated from Truth Table!');
    });

    // Add reset truth table functionality
    document.getElementById('resetTruthTable').addEventListener('click', function() {
        if (confirm('Reset all truth table values to 0?')) {
            clearKMap();
            updateTruthTable();
        }
    });
});