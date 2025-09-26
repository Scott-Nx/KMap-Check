document.addEventListener("DOMContentLoaded", function () {
  // --- Constants ---
  const KMAP_SIZE = 16;
  const MODES = {
    MINTERMS: "minterms",
    MAXTERMS: "maxterms",
    TRUTH_TABLE: "truthTable",
  };
  const TOOLS = {
    SET_1: "1",
    SET_0: "0",
    SET_X: "x",
    SELECT: "select",
  };
  const CSS_CLASSES = {
    SELECTED_1: "selected-1",
    SELECTED_0: "selected-0",
    SELECTED_X: "selected-x",
    SELECTED_CELL: "selected-cell",
    ACTIVE: "active",
    DISABLED: "disabled", // Assuming you might add styles for this
    D_NONE: "d-none",
    TABLE_SUCCESS: "table-success",
    TABLE_DANGER: "table-danger",
    TABLE_WARNING: "table-warning",
    TT_CLICKABLE: "tt-clickable",
    BTN_SECONDARY: "btn-secondary",
    BTN_INFO: "btn-info",
    TEXT_MUTED: "text-muted",
    BADGE_SECONDARY: "badge bg-secondary",
    BADGE_PRIMARY: "badge bg-primary",
    BADGE_INFO: "badge bg-info",
    ALERT_SUCCESS: "alert alert-success",
    ALERT_DANGER: "alert alert-danger",
    ALERT_INFO: "alert alert-info",
    ALERT_WARNING: "alert alert-warning", // Added for consistency
    ICON_SUCCESS: "fas fa-check-circle",
    ICON_DANGER: "fas fa-times-circle",
  };
  const DEFAULT_TOOL = TOOLS.SET_1;
  const DEFAULT_MODE = MODES.MINTERMS;

  // --- State Variables ---
  let kmap = Array(KMAP_SIZE).fill(0);
  let selectedTool = DEFAULT_TOOL;
  let selectedCells = new Set();
  let currentMode = DEFAULT_MODE;

  // --- DOM Elements (Cache frequently used elements) ---
  const kmapCells = document.querySelectorAll(".kmap-cell");
  const toolButtons = {
    setTo1: document.getElementById("setTo1"),
    setTo0: document.getElementById("setTo0"),
    setToX: document.getElementById("setToX"),
    selectTool: document.getElementById("selectTool"),
    clearKmap: document.getElementById("clearKmap"),
  };
  const modeRadios = document.querySelectorAll('input[name="inputMethod"]');
  const inputSections = {
    minterm: document.getElementById("mintermInput"),
    maxterm: document.getElementById("maxtermInput"),
    truthTable: document.getElementById("truthTableInput"),
  };
  const inputFields = {
    minterms: document.getElementById("mintermsInput"),
    dontCaresMinterm: document.getElementById("dontCareInput"),
    maxterms: document.getElementById("maxtermsInput"),
    dontCaresMaxterm: document.getElementById("maxDontCareInput"),
    booleanExpression: document.getElementById("booleanExpression"),
  };
  const actionButtons = {
    generateFromMinterms: document.getElementById("generateFromMinterms"),
    generateFromMaxterms: document.getElementById("generateFromMaxterms"),
    generateFromSelection: document.getElementById("generateFromSelection"),
    verifyExpression: document.getElementById("verifyExpression"),
    copyExpression: document.getElementById("copyExpression"),
    generateFromTruthTable: document.getElementById("generateFromTruthTable"),
    resetTruthTable: document.getElementById("resetTruthTable"),
  };
  const displayAreas = {
    simplifiedExpression: document.getElementById("simplifiedExpression"),
    groups: document.getElementById("groups"),
    selectedCellsBadge: document.querySelector("#selectedCells h5 .badge"),
    selectedCellsContainer: document.getElementById("selectedCells"),
    truthTableBody: document.getElementById("truthTableBody"),
  };
  let modeIndicator = null; // Will be created dynamically

  // --- Helper Functions ---

  /**
   * Updates the visual appearance of a K-map cell based on its value.
   * @param {Element} cellElement The DOM element of the K-map cell.
   * @param {number|string} value The value (0, 1, 'x').
   * @param {boolean} isSelected Is the cell currently selected with the 'select' tool.
   */
  function updateKMapCellAppearance(cellElement, value, isSelected = false) {
    cellElement.classList.remove(
      CSS_CLASSES.SELECTED_0,
      CSS_CLASSES.SELECTED_1,
      CSS_CLASSES.SELECTED_X,
      CSS_CLASSES.SELECTED_CELL,
    );
    if (value === 1) {
      cellElement.classList.add(CSS_CLASSES.SELECTED_1);
    } else if (value === 0) {
      cellElement.classList.add(CSS_CLASSES.SELECTED_0);
    } else if (value === TOOLS.SET_X) {
      cellElement.classList.add(CSS_CLASSES.SELECTED_X);
    }
    if (isSelected) {
      cellElement.classList.add(CSS_CLASSES.SELECTED_CELL);
    }
  }

  /**
   * Updates the state and appearance of a K-map cell.
   * @param {number} index The index of the cell (0-15).
   * @param {number|string} value The new value (0, 1, 'x').
   */
  function updateKMapCellState(index, value) {
    if (index < 0 || index >= KMAP_SIZE) return; // Guard clause
    kmap[index] = value;
    const cellElement = document.querySelector(
      `.kmap-cell[data-index="${index}"]`,
    );
    if (cellElement) {
      updateKMapCellAppearance(cellElement, value, selectedCells.has(index));
    }
  }

  /**
   * Updates the display showing the currently selected cell indices.
   */
  function updateSelectedCellsDisplay() {
    const badge = displayAreas.selectedCellsBadge;
    if (!badge) return;

    if (selectedCells.size === 0) {
      badge.textContent = "None";
      badge.className = CSS_CLASSES.BADGE_SECONDARY;
    } else {
      const cellsText = Array.from(selectedCells)
        .sort((a, b) => a - b)
        .join(", ");
      badge.textContent = cellsText;
      badge.className = CSS_CLASSES.BADGE_PRIMARY;
    }
  }

  /**
   * Clears the current cell selections (Set and visual).
   */
  function clearSelections() {
    selectedCells.clear();
    kmapCells.forEach((cell) => {
      cell.classList.remove(CSS_CLASSES.SELECTED_CELL);
    });
    updateSelectedCellsDisplay();
  }

  /**
   * Highlights the currently active tool button.
   * @param {string} buttonId The ID of the button to highlight.
   */
  function highlightSelectedButton(buttonId) {
    Object.values(toolButtons).forEach((btn) => {
      if (btn) {
        // Check if button exists
        btn.classList.remove(CSS_CLASSES.ACTIVE);
        btn.style.boxShadow = "";
      }
    });
    const selectedBtn = document.getElementById(buttonId);
    if (selectedBtn) {
      selectedBtn.classList.add(CSS_CLASSES.ACTIVE);
      selectedBtn.style.boxShadow = "0 0 0 3px rgba(255,255,255,0.5)"; // Consider moving to CSS
    }
  }

  /**
   * Parses a comma-separated string of numbers into an array of valid indices.
   * @param {string} inputString The string to parse.
   * @returns {number[]} An array of valid indices (0-15).
   */
  function parseTermList(inputString) {
    if (!inputString) return [];
    return inputString
      .split(",")
      .map((x) => parseInt(x.trim()))
      .filter((x) => !isNaN(x) && x >= 0 && x < KMAP_SIZE);
  }

  /**
   * Resets the K-map state and UI to all zeros.
   */
  function clearKMap() {
    kmap.fill(0);
    kmapCells.forEach((cell, i) => {
      updateKMapCellAppearance(cell, 0, false); // Update appearance directly
    });
    clearSelections(); // Clear selections as well
    updateTruthTable(); // Update table
    displayAreas.simplifiedExpression.textContent = "Result will appear here";
    displayAreas.groups.textContent = "Groups will appear here";
    // Don't reset the tool here, let the caller decide or handle separately
  }

  // --- Event Handlers ---

  // K-map cell click handler
  kmapCells.forEach((cell) => {
    cell.addEventListener("click", function () {
      const index = parseInt(this.getAttribute("data-index"));
      let needsSolve = true; // Flag to check if solveKMap needs to run

      if (
        selectedTool === TOOLS.SET_1 ||
        selectedTool === TOOLS.SET_0 ||
        selectedTool === TOOLS.SET_X
      ) {
        const value =
          selectedTool === TOOLS.SET_1
            ? 1
            : selectedTool === TOOLS.SET_0
              ? 0
              : TOOLS.SET_X;
        updateKMapCellState(index, value);
        clearSelections(); // Clear selections when setting values
      } else if (selectedTool === TOOLS.SELECT) {
        needsSolve = false; // Don't solve when just selecting/deselecting

        // Check if selection is allowed based on mode and cell value
        const cellValue = kmap[index];
        const isMintermModeValid =
          currentMode === MODES.MINTERMS &&
          (cellValue === 1 || cellValue === TOOLS.SET_X);
        const isMaxtermModeValid =
          currentMode === MODES.MAXTERMS &&
          (cellValue === 0 || cellValue === TOOLS.SET_X);

        if (isMintermModeValid || isMaxtermModeValid) {
          if (selectedCells.has(index)) {
            selectedCells.delete(index);
            this.classList.remove(CSS_CLASSES.SELECTED_CELL);
          } else {
            selectedCells.add(index);
            this.classList.add(CSS_CLASSES.SELECTED_CELL);
          }
          updateSelectedCellsDisplay();
        } else {
          const validValues =
            currentMode === MODES.MINTERMS ? "1 or X" : "0 or X";
          alert(
            `In ${currentMode} mode, you can only select cells with value ${validValues}.`,
          );
        }
      }

      if (needsSolve) {
        updateTruthTable(); // Update truth table whenever K-map value changes
        solveKMap();
      }
    });
  });

  // Tool selection handlers
  Object.entries(toolButtons).forEach(([key, button]) => {
    if (!button) return; // Skip if button doesn't exist (e.g., clearKmap handled separately)

    if (key === "clearKmap") {
      button.addEventListener("click", () => {
        clearKMap();
        selectedTool = DEFAULT_TOOL; // Reset to default tool after clearing
        highlightSelectedButton(toolButtons.setTo1.id);
      });
    } else {
      button.addEventListener("click", () => {
        const tool =
          button.id === "setTo1"
            ? TOOLS.SET_1
            : button.id === "setTo0"
              ? TOOLS.SET_0
              : button.id === "setToX"
                ? TOOLS.SET_X
                : button.id === "selectTool"
                  ? TOOLS.SELECT
                  : null;

        if (tool === TOOLS.SELECT && currentMode === MODES.TRUTH_TABLE) {
          alert(
            "Selection tool is not available in Truth Table mode.\nUse the Truth Table cells to set values instead.",
          );
          return; // Don't change the tool
        }

        if (tool) {
          selectedTool = tool;
          highlightSelectedButton(button.id);
          // If switching away from 'select', consider clearing selections?
          // if (selectedTool !== TOOLS.SELECT) {
          //     clearSelections();
          // }
        }
      });
    }
  });

  // Input method (mode) change handler
  modeRadios.forEach((input) => {
    input.addEventListener("change", function () {
      const newMode = this.value; // 'minterms', 'maxterms', 'truthTable'

      // Hide all input sections first
      Object.values(inputSections).forEach((section) =>
        section.classList.add(CSS_CLASSES.D_NONE),
      );

      // Show the relevant section
      if (newMode === MODES.MINTERMS) {
        inputSections.minterm.classList.remove(CSS_CLASSES.D_NONE);
        // Reset K-Map to all 0s when switching back to Minterm mode
        clearKMap(); // This function handles state and UI reset
      } else if (newMode === MODES.MAXTERMS) {
        inputSections.maxterm.classList.remove(CSS_CLASSES.D_NONE);
        // Reset K-Map to all 1s for Maxterm mode entry
        kmap.fill(1);
        kmapCells.forEach((cell, i) => updateKMapCellAppearance(cell, 1));
      } else if (newMode === MODES.TRUTH_TABLE) {
        inputSections.truthTable.classList.remove(CSS_CLASSES.D_NONE);
        // Scroll to truth table if switching to it
        const truthTableCard = document.querySelector(".row.mt-4 .card");
        if (truthTableCard) {
          truthTableCard.scrollIntoView({ behavior: "smooth" });
        }
      }

      currentMode = newMode;
      clearSelections(); // Clear selections when changing modes
      updateModeUI(); // Update UI elements based on the new mode
    });
  });

  // --- Mode Update Function ---

  /**
   * Updates UI elements (buttons, indicators) based on the current mode.
   */
  function updateModeUI() {
    let modeText = "Unknown Mode";
    let isSelectionEnabled = false;
    let isGenerateFromSelectionEnabled = false;
    let isSelectToolEnabled = false;

    if (currentMode === MODES.MINTERMS) {
      modeText = "Minterms Mode (SOP)";
      isSelectionEnabled = true;
      isGenerateFromSelectionEnabled = true; // Enabled only for minterms initially
      isSelectToolEnabled = true;
    } else if (currentMode === MODES.MAXTERMS) {
      modeText = "Maxterms Mode (POS)";
      isSelectionEnabled = true;
      isGenerateFromSelectionEnabled = false; // Disabled for maxterms
      isSelectToolEnabled = true;
    } else if (currentMode === MODES.TRUTH_TABLE) {
      modeText = "Truth Table Mode";
      isSelectionEnabled = false; // Selection not used in TT mode
      isGenerateFromSelectionEnabled = false;
      isSelectToolEnabled = false; // Select tool disabled in TT mode
    }

    // Update Mode Indicator Badge
    if (!modeIndicator) {
      modeIndicator = document.createElement("div");
      modeIndicator.id = "mode-indicator";
      modeIndicator.className = `${CSS_CLASSES.BADGE_INFO} mb-2`;
      displayAreas.selectedCellsContainer.prepend(modeIndicator);
    }
    modeIndicator.textContent = modeText;
    displayAreas.selectedCellsContainer.setAttribute("data-mode", currentMode);

    // Enable/Disable Buttons
    actionButtons.generateFromSelection.disabled =
      !isGenerateFromSelectionEnabled;
    toolButtons.selectTool.disabled = !isSelectToolEnabled;

    // Update Button Styles
    actionButtons.generateFromSelection.classList.toggle(
      CSS_CLASSES.BTN_INFO,
      isGenerateFromSelectionEnabled,
    );
    actionButtons.generateFromSelection.classList.toggle(
      CSS_CLASSES.BTN_SECONDARY,
      !isGenerateFromSelectionEnabled,
    );

    toolButtons.selectTool.classList.toggle(
      CSS_CLASSES.TEXT_MUTED,
      !isSelectToolEnabled,
    );

    // If select tool was active and becomes disabled, reset to default tool
    if (!isSelectToolEnabled && selectedTool === TOOLS.SELECT) {
      selectedTool = DEFAULT_TOOL;
      highlightSelectedButton(toolButtons.setTo1.id);
    }

    // Re-run solveKMap to update results based on the new mode interpretation
    solveKMap();
  }

  // --- K-Map Generation Handlers ---

  actionButtons.generateFromMinterms.addEventListener("click", function () {
    const minterms = parseTermList(inputFields.minterms.value);
    const dontCares = parseTermList(inputFields.dontCaresMinterm.value);

    clearKMap(); // Start fresh

    minterms.forEach((index) => updateKMapCellState(index, 1));
    dontCares.forEach((index) => {
      // Don't cares override minterms if there's overlap
      if (kmap[index] !== 1) {
        updateKMapCellState(index, TOOLS.SET_X);
      } else {
        // If a minterm is also a don't care, treat it as don't care
        updateKMapCellState(index, TOOLS.SET_X);
      }
    });

    updateTruthTable();
    solveKMap();
  });

  actionButtons.generateFromMaxterms.addEventListener("click", function () {
    const maxterms = parseTermList(inputFields.maxterms.value);
    const dontCares = parseTermList(inputFields.dontCaresMaxterm.value);

    // Start with all 1s for maxterm logic
    kmap.fill(1);
    kmapCells.forEach((cell, i) => updateKMapCellAppearance(cell, 1));

    // Set maxterms to 0
    maxterms.forEach((index) => updateKMapCellState(index, 0));

    // Set don't cares (overrides 1s and 0s)
    dontCares.forEach((index) => updateKMapCellState(index, TOOLS.SET_X));

    clearSelections(); // Clear any previous selections
    updateTruthTable();
    solveKMap();
  });

  // --- Expression Generation/Verification ---

  actionButtons.generateFromSelection.addEventListener("click", function () {
    if (currentMode === MODES.MAXTERMS) {
      // This was previously disabled, but keep the check just in case
      alert(
        "Generate from Selection is currently only implemented for minterm (SOP) mode.",
      );
      return;
    }
    if (currentMode === MODES.TRUTH_TABLE) {
      alert("Generate from Selection is not available in Truth Table mode.");
      return;
    }

    if (selectedCells.size === 0) {
      alert("Please select at least one cell using the Select tool.");
      return;
    }

    const selectedIndices = Array.from(selectedCells);
    const expression = generateExpressionFromCells(
      selectedIndices,
      currentMode,
    ); // Pass mode

    displayAreas.simplifiedExpression.textContent = expression;

    const groupsInfo = `Manual ${currentMode} selection: [${selectedIndices.sort((a, b) => a - b).join(", ")}] → ${expression}`;
    displayAreas.groups.innerHTML = groupsInfo; // Use innerHTML if expression might contain formatting
  });

  // Verify Expression Button Handler (Refactored)
  actionButtons.verifyExpression.addEventListener("click", function () {
    const expression = inputFields.booleanExpression.value.trim();
    if (!expression) {
      alert("Please enter a Boolean expression to verify.");
      return;
    }

    try {
      const tempKmap = Array(KMAP_SIZE).fill(0);
      const expressionMinterms = [];
      const expressionMaxterms = []; // Track maxterms derived from expression

      // Evaluate expression for all 16 possibilities
      for (let i = 0; i < KMAP_SIZE; i++) {
        const binary = i.toString(2).padStart(4, "0");
        const variables = {
          A: binary[0] === "1",
          B: binary[1] === "1",
          C: binary[2] === "1",
          D: binary[3] === "1",
          "A'": binary[0] !== "1",
          "B'": binary[1] !== "1",
          "C'": binary[2] !== "1",
          "D'": binary[3] !== "1",
        };

        const result = evaluateBooleanExpression(expression, variables);
        tempKmap[i] = result ? 1 : 0;

        if (result) {
          expressionMinterms.push(i);
        } else {
          expressionMaxterms.push(i);
        }
      }

      // Get the user's current K-map state (considering don't cares)
      const userMinterms = [];
      const userMaxterms = [];
      const userDontCares = [];
      for (let i = 0; i < KMAP_SIZE; i++) {
        if (kmap[i] === 1) userMinterms.push(i);
        else if (kmap[i] === 0) userMaxterms.push(i);
        else if (kmap[i] === TOOLS.SET_X) userDontCares.push(i);
      }

      // --- Verification Logic ---
      let matches = true;
      const mismatches = { missingOnes: [], extraOnes: [] }; // Simplified mismatch tracking

      // Check if expression produces 1s where the K-map expects 1s
      for (const minterm of userMinterms) {
        if (tempKmap[minterm] !== 1) {
          matches = false;
          mismatches.missingOnes.push(minterm);
        }
      }

      // Check if expression produces 0s where the K-map expects 0s
      for (const maxterm of userMaxterms) {
        if (tempKmap[maxterm] !== 0) {
          matches = false;
          // This is an extra '1' (or a '1' where a '0' should be)
          mismatches.extraOnes.push(maxterm);
        }
      }

      // Check if expression produces 1s or 0s that conflict with user's explicit terms
      // (Ignoring don't cares for strict matching against user input)
      // Example: If user has minterm 5, expression must have 1 at 5.
      // Example: If user has maxterm 10, expression must have 0 at 10.

      // --- Display Results ---
      let resultHTML = "";
      const simplifiedInfo = `
                <p>Expression <strong>${expression}</strong> evaluates to:</p>
                <p>Minterms (1s): ${expressionMinterms.sort((a, b) => a - b).join(", ") || "None"}</p>
                <p>Maxterms (0s): ${expressionMaxterms.sort((a, b) => a - b).join(", ") || "None"}</p>
            `;
      displayAreas.simplifiedExpression.innerHTML = simplifiedInfo;

      if (matches) {
        resultHTML = `
                    <div class="${CSS_CLASSES.ALERT_SUCCESS}">
                        <h5><i class="${CSS_CLASSES.ICON_SUCCESS}"></i> Success!</h5>
                        <p>The Boolean expression matches the current K-Map state (considering Don't Cares).</p>
                    </div>`;
        // Optionally update the K-map visually to reflect the expression
        // updateKMapFromEvaluation(tempKmap, userDontCares); // Pass don't cares
      } else {
        resultHTML = `
                    <div class="${CSS_CLASSES.ALERT_DANGER}">
                        <h5><i class="${CSS_CLASSES.ICON_DANGER}"></i> Verification Failed</h5>
                        <p>The Boolean expression does not perfectly match the current K-Map state:</p>
                        <ul>`;
        if (mismatches.missingOnes.length > 0) {
          resultHTML += `<li>K-Map has 1(s) at [${mismatches.missingOnes.sort((a, b) => a - b).join(", ")}] where expression has 0.</li>`;
        }
        if (mismatches.extraOnes.length > 0) {
          resultHTML += `<li>K-Map has 0(s) at [${mismatches.extraOnes.sort((a, b) => a - b).join(", ")}] where expression has 1.</li>`;
        }
        resultHTML += `
                        </ul>
                        <p>(Note: Don't Care values in the K-Map are ignored for mismatch reporting but allow flexibility in matching.)</p>
                    </div>
                    <div class="mt-2">
                        <button id="useExpressionAnyway" class="btn btn-outline-warning btn-sm">Load K-Map from this Expression</button>
                    </div>`;
      }

      displayAreas.groups.innerHTML = resultHTML;

      // Add listener for the "Use Anyway" button if it exists
      const useAnywayBtn = document.getElementById("useExpressionAnyway");
      if (useAnywayBtn) {
        useAnywayBtn.addEventListener(
          "click",
          () => {
            updateKMapFromEvaluation(tempKmap, userDontCares); // Pass existing don't cares
            displayAreas.groups.innerHTML = `<div class="${CSS_CLASSES.ALERT_INFO}">K-Map loaded from the verified expression. Original Don't Cares were preserved where possible.</div>`;
          },
          { once: true },
        ); // Ensure listener is added only once
      }
    } catch (error) {
      console.error("Expression evaluation error:", error);
      alert(
        "Error evaluating expression: " +
          error.message +
          "\n\nSupported syntax: Sum-of-Products (e.g., AB + C'D). Use A, B, C, D and ' for complement.",
      );
      displayAreas.simplifiedExpression.textContent = "Error";
      displayAreas.groups.innerHTML = `<div class="${CSS_CLASSES.ALERT_DANGER}">Error evaluating expression.</div>`;
    }
  });

  /**
   * Updates the K-Map state and UI based on the results of an expression evaluation.
   * Preserves existing Don't Care values from the original K-Map.
   * @param {Array<number>} evaluatedMap K-map derived purely from the expression (0s and 1s).
   * @param {Array<number>} originalDontCares Indices that were 'x' in the user's K-Map.
   */
  function updateKMapFromEvaluation(evaluatedMap, originalDontCares) {
    clearKMap(); // Clear existing state but keep the array reference

    for (let i = 0; i < KMAP_SIZE; i++) {
      if (originalDontCares.includes(i)) {
        updateKMapCellState(i, TOOLS.SET_X); // Preserve original Don't Cares
      } else {
        updateKMapCellState(i, evaluatedMap[i]); // Use the expression's 0 or 1
      }
    }

    updateTruthTable();
    solveKMap(); // Re-solve with the new K-Map state
  }

  // Function to evaluate a Boolean expression in SOP form (minor refinement)
  function evaluateBooleanExpression(expr, variables) {
    // Normalize: uppercase, remove spaces
    expr = expr.toUpperCase().replace(/\s+/g, "");
    if (!expr) return false; // Handle empty expression

    // Split into product terms (OR groups)
    const terms = expr.split("+");

    // Check if ANY term evaluates to true
    return terms.some((term) => {
      if (!term) return false; // Handle potential empty strings from split (e.g., "A++B")

      // Use regex to find literals (A, B', C, etc.) within the term
      const literals = term.match(/[A-D]'?/g);
      if (!literals) return false; // Should not happen with valid input, but safety check

      // Check if ALL literals in the term are true
      return literals.every((literal) => {
        // Check if the variable exists in our provided map
        if (variables.hasOwnProperty(literal)) {
          return variables[literal];
        } else {
          // Handle potential invalid characters if regex fails (shouldn't happen)
          console.warn(`Invalid literal found in term "${term}": ${literal}`);
          // Decide how to handle error: throw or return false?
          // Returning false means the term is false if it contains invalid parts.
          return false;
          // throw new Error(`Invalid literal '${literal}' in expression term '${term}'`);
        }
      });
    });
  }

  // --- Truth Table Functions ---

  /**
   * Updates the truth table display based on the current kmap state.
   */
  function updateTruthTable() {
    const tbody = displayAreas.truthTableBody;
    if (!tbody) return;
    tbody.innerHTML = ""; // Clear existing rows

    for (let i = 0; i < KMAP_SIZE; i++) {
      const row = document.createElement("tr");
      const binary = i.toString(2).padStart(4, "0");

      // Input variables (A, B, C, D)
      for (let j = 0; j < 4; j++) {
        const cell = document.createElement("td");
        cell.textContent = binary[j];
        row.appendChild(cell);
      }

      // Index cell
      const indexCell = document.createElement("td");
      indexCell.textContent = i;
      row.appendChild(indexCell);

      // Output cell (F)
      const outputCell = document.createElement("td");
      outputCell.dataset.index = i; // Store index for easy access in click handler
      outputCell.classList.add(CSS_CLASSES.TT_CLICKABLE); // Make it look clickable

      const value = kmap[i];
      if (value === 1) {
        outputCell.textContent = "1";
        outputCell.classList.add(CSS_CLASSES.TABLE_SUCCESS);
      } else if (value === 0) {
        outputCell.textContent = "0";
        outputCell.classList.add(CSS_CLASSES.TABLE_DANGER);
      } else {
        // Don't care ('x')
        outputCell.textContent = "X";
        outputCell.classList.add(CSS_CLASSES.TABLE_WARNING);
      }
      row.appendChild(outputCell);
      tbody.appendChild(row);
    }

    // Add click listeners after rows are created
    addTruthTableClickListeners();
  }

  /**
   * Adds click listeners to the output cells of the truth table.
   */
  function addTruthTableClickListeners() {
    const outputCells = displayAreas.truthTableBody.querySelectorAll(
      `td.${CSS_CLASSES.TT_CLICKABLE}`,
    );
    outputCells.forEach((cell) => {
      // Remove existing listener to prevent duplicates if updateTruthTable is called multiple times
      // cell.removeEventListener('click', handleTruthTableClick); // Needs a named function or other strategy
      // For simplicity now, we assume listeners are cleared by innerHTML = ''

      cell.addEventListener("click", handleTruthTableClick);
    });
  }

  /**
   * Handles clicks on truth table output cells to toggle values (0 -> 1 -> X -> 0).
   * @param {Event} event The click event object.
   */
  function handleTruthTableClick(event) {
    if (currentMode !== MODES.TRUTH_TABLE) {
      alert(
        `Switch to ${MODES.TRUTH_TABLE} mode to edit the truth table directly.`,
      );
      return;
    }

    const cell = event.target;
    const index = parseInt(cell.dataset.index);
    let newValue;
    let newClass;
    let newText;

    // Toggle 0 -> 1 -> X -> 0
    if (kmap[index] === 0) {
      newValue = 1;
      newClass = CSS_CLASSES.TABLE_SUCCESS;
      newText = "1";
    } else if (kmap[index] === 1) {
      newValue = TOOLS.SET_X;
      newClass = CSS_CLASSES.TABLE_WARNING;
      newText = "X";
    } else {
      // Must be 'x'
      newValue = 0;
      newClass = CSS_CLASSES.TABLE_DANGER;
      newText = "0";
    }

    // Update K-Map state
    kmap[index] = newValue;

    // Update Truth Table cell appearance
    cell.textContent = newText;
    cell.className = `${CSS_CLASSES.TT_CLICKABLE}`; // Reset classes first
    cell.classList.add(newClass);

    // Update corresponding K-Map cell appearance
    updateKMapCellState(index, newValue); // This handles the visual update of the K-Map grid

    // Re-solve the K-Map based on the change
    solveKMap();
  }

  // Truth Table Action Buttons
  actionButtons.generateFromTruthTable.addEventListener("click", function () {
    if (currentMode !== MODES.TRUTH_TABLE) {
      alert(
        `This button is intended for use in ${MODES.TRUTH_TABLE} mode, but the K-Map is already updated live.`,
      );
      // No real action needed as K-Map updates on cell click
    } else {
      // Explicitly re-solve, although it should be up-to-date
      solveKMap();
      alert("K-Map solution regenerated based on the current Truth Table.");
    }
  });

  actionButtons.resetTruthTable.addEventListener("click", function () {
    if (
      confirm(
        "Are you sure you want to reset the entire K-Map and Truth Table to all zeros?",
      )
    ) {
      clearKMap(); // This already updates the truth table
      solveKMap(); // Update the solution display
    }
  });

  // --- K-Map Solving Logic ---

  /**
   * Main function to solve the K-Map based on the current mode and kmap state.
   */
  function solveKMap() {
    const minterms = [];
    const maxterms = [];
    const dontCares = [];

    for (let i = 0; i < KMAP_SIZE; i++) {
      if (kmap[i] === 1) minterms.push(i);
      else if (kmap[i] === 0) maxterms.push(i);
      else if (kmap[i] === TOOLS.SET_X) dontCares.push(i);
    }

    let simplifiedExpression = "";
    let groupsInfoHTML = "";

    if (currentMode === MODES.MINTERMS) {
      // --- Sum of Products (SOP) Logic ---
      if (minterms.length === 0 && dontCares.length === KMAP_SIZE) {
        simplifiedExpression = "1"; // All don't cares can be treated as 1
        groupsInfoHTML = "All Don't Cares (can be simplified to 1)";
      } else if (minterms.length === 0) {
        simplifiedExpression = "0";
        groupsInfoHTML =
          "No minterms (all zeros or don't cares resulting in 0)";
      } else if (minterms.length + dontCares.length === KMAP_SIZE) {
        simplifiedExpression = "1";
        groupsInfoHTML = "All cells are 1s or Don't Cares (simplifies to 1)";
      } else {
        // Find Prime Implicants (PIs)
        const primeImplicants = findPrimeImplicants(minterms, dontCares);

        // Select Essential Prime Implicants (EPIs) and cover remaining minterms
        const { essentialPIs, finalGroups } = selectEssentialPrimeImplicants(
          primeImplicants,
          minterms,
        );

        // Generate expression from the final selected groups
        const finalExpressions = finalGroups.map((group) =>
          groupToExpressionSOP(group.cells),
        );
        simplifiedExpression =
          finalExpressions.length > 0 ? finalExpressions.join(" + ") : "0"; // Should not be 0 if minterms exist

        // Generate detailed group info
        groupsInfoHTML = finalGroups
          .map((group, index) => {
            const isEssential = essentialPIs.some((epi) => epi.id === group.id);
            const cells = group.cells.sort((a, b) => a - b).join(", ");
            const expression = groupToExpressionSOP(group.cells);
            return `Group ${index + 1} ${isEssential ? "(Essential)" : ""}: [${cells}] → ${expression}`;
          })
          .join("<br>");

        if (finalGroups.length === 0 && minterms.length > 0) {
          // This case might happen if only single minterms remain after PI generation
          // Handle singleton minterms if findPrimeImplicants doesn't return them
          simplifiedExpression = minterms
            .map((m) => groupToExpressionSOP([m]))
            .join(" + ");
          groupsInfoHTML = minterms
            .map(
              (m) => `Singleton Minterm: [${m}] → ${groupToExpressionSOP([m])}`,
            )
            .join("<br>");
        }
      }
    } else if (currentMode === MODES.MAXTERMS) {
      // --- Product of Sums (POS) Logic ---
      if (maxterms.length === 0 && dontCares.length === KMAP_SIZE) {
        simplifiedExpression = "0"; // All don't cares can be treated as 0
        groupsInfoHTML = "All Don't Cares (can be simplified to 0)";
      } else if (maxterms.length === 0) {
        simplifiedExpression = "1";
        groupsInfoHTML = "No maxterms (all ones or don't cares resulting in 1)";
      } else if (maxterms.length + dontCares.length === KMAP_SIZE) {
        simplifiedExpression = "0";
        groupsInfoHTML = "All cells are 0s or Don't Cares (simplifies to 0)";
      } else {
        // Find Prime Implicants for the ZEROs (Maxterms)
        const primeImplicantsPOS = findPrimeImplicants(maxterms, dontCares); // Reuse PI logic, but target 0s

        // Select Essential PIs for the ZEROs
        const { essentialPIs, finalGroups } = selectEssentialPrimeImplicants(
          primeImplicantsPOS,
          maxterms,
        );

        // Generate POS expression (AND of OR terms)
        const finalExpressionsPOS = finalGroups.map((group) =>
          groupToExpressionPOS(group.cells),
        );
        simplifiedExpression =
          finalExpressionsPOS.length > 0
            ? finalExpressionsPOS.join(" · ")
            : "1"; // Default to 1 if no maxterms

        // Generate detailed group info for POS
        groupsInfoHTML = finalGroups
          .map((group, index) => {
            const isEssential = essentialPIs.some((epi) => epi.id === group.id);
            const cells = group.cells.sort((a, b) => a - b).join(", ");
            const expression = groupToExpressionPOS(group.cells);
            return `Group ${index + 1} ${isEssential ? "(Essential)" : ""}: [${cells}] → ${expression}`;
          })
          .join("<br>");

        if (finalGroups.length === 0 && maxterms.length > 0) {
          simplifiedExpression = maxterms
            .map((m) => groupToExpressionPOS([m]))
            .join(" · ");
          groupsInfoHTML = maxterms
            .map(
              (m) => `Singleton Maxterm: [${m}] → ${groupToExpressionPOS([m])}`,
            )
            .join("<br>");
        }
      }
    } else {
      // Truth Table Mode - Just display info, no simplification shown
      simplifiedExpression = `(Simplification shown in ${MODES.MINTERMS} or ${MODES.MAXTERMS} mode)`;
      groupsInfoHTML = `
                <div class="${CSS_CLASSES.ALERT_INFO}">
                    <h5>Truth Table Mode</h5>
                    <p>Minterms (1s): ${minterms.sort((a, b) => a - b).join(", ") || "None"}</p>
                    <p>Maxterms (0s): ${maxterms.sort((a, b) => a - b).join(", ") || "None"}</p>
                    <p>Don't Cares (X): ${dontCares.sort((a, b) => a - b).join(", ") || "None"}</p>
                </div>`;
    }

    // Update UI
    displayAreas.simplifiedExpression.innerHTML = simplifiedExpression; // Use innerHTML for potential symbols like '·'
    displayAreas.groups.innerHTML = groupsInfoHTML || "No groups formed.";
  }

  // --- Prime Implicant Finding and Selection ---

  /**
   * Finds all Prime Implicants (PIs) for a given set of target terms (minterms or maxterms)
   * and don't cares. Uses a basic approach of checking predefined group shapes.
   * @param {number[]} targetTerms The indices of the terms to cover (e.g., minterms for SOP).
   * @param {number[]} dontCares The indices of the don't care terms.
   * @returns {Array<{id: string, cells: number[], expression: string}>} An array of prime implicant objects.
   */
  function findPrimeImplicants(targetTerms, dontCares) {
    if (targetTerms.length === 0) return [];

    const allCoverableCells = new Set([...targetTerms, ...dontCares]);
    const primeImplicants = [];
    const coveredTargetTerms = new Set(); // Keep track of target terms covered by larger groups

    // Check potential groups from largest to smallest (8, 4, 2, 1)
    for (const size of [16, 8, 4, 2, 1]) {
      // Include 16 and 1 for edge cases
      if (size === 16) {
        // Check for all 1s/0s case (handled in solveKMap, but check here too)
        if (targetTerms.length + dontCares.length === KMAP_SIZE) {
          const groupCells = Array.from({ length: KMAP_SIZE }, (_, i) => i);
          primeImplicants.push({
            id: groupCells.join(","), // Unique ID based on sorted cells
            cells: groupCells,
            size: size,
            // expression: calculated later if needed
          });
          // If we found a group of 16, no other groups matter
          return primeImplicants;
        }
        continue; // Skip to next size if not all cells are coverable
      }

      const potentialGroups = getPotentialGroups(size);

      for (const groupCells of potentialGroups) {
        // 1. Check if all cells in the group are coverable (target term or don't care)
        const isValidGroup = groupCells.every((cell) =>
          allCoverableCells.has(cell),
        );
        if (!isValidGroup) continue;

        // 2. Check if the group covers at least one target term (not just don't cares)
        const coversTargetTerm = groupCells.some((cell) =>
          targetTerms.includes(cell),
        );
        if (!coversTargetTerm) continue;

        // 3. Check if this group is already covered by a larger PI found earlier
        //    (Basic check: if all its target terms are already covered by larger groups)
        const groupTargetTerms = groupCells.filter((cell) =>
          targetTerms.includes(cell),
        );
        const isSubsumed = groupTargetTerms.every((term) =>
          coveredTargetTerms.has(term),
        );
        // More robust subsumption check needed for true Quine-McCluskey, but this helps prune

        if (!isSubsumed) {
          // Check if this exact group (or a larger one containing it) is already added
          const sortedCellsString = groupCells.sort((a, b) => a - b).join(",");
          const alreadyExists = primeImplicants.some((pi) => {
            // Check if existing PI contains all cells of the current group
            const existingCellsSet = new Set(pi.cells);
            return groupCells.every((cell) => existingCellsSet.has(cell));
          });

          if (!alreadyExists) {
            primeImplicants.push({
              id: sortedCellsString, // Use sorted string as unique ID
              cells: groupCells.sort((a, b) => a - b), // Store sorted cells
              size: size,
              // expression: calculated later
            });
            // Mark the target terms covered by this new PI
            groupTargetTerms.forEach((term) => coveredTargetTerms.add(term));
          }
        }
      }
    }

    // Add singleton target terms that weren't covered by any larger group
    const allCoveredTerms = new Set(
      primeImplicants.flatMap((pi) =>
        pi.cells.filter((cell) => targetTerms.includes(cell)),
      ),
    );
    targetTerms.forEach((term) => {
      if (!allCoveredTerms.has(term)) {
        const id = term.toString();
        if (!primeImplicants.some((pi) => pi.id === id)) {
          // Avoid duplicates if already added as size 1
          primeImplicants.push({ id: id, cells: [term], size: 1 });
        }
      }
    });

    // Filter out PIs that are fully contained within larger PIs (Refined Subsumption Check)
    const finalPIs = primeImplicants.filter((pi) => {
      return !primeImplicants.some((otherPI) => {
        // Is pi fully contained within otherPI?
        return (
          pi.id !== otherPI.id && // Not comparing to itself
          pi.size < otherPI.size && // otherPI must be larger
          pi.cells.every((cell) => otherPI.cells.includes(cell))
        ); // All cells of pi must be in otherPI
      });
    });

    return finalPIs;
  }

  /**
   * Selects Essential Prime Implicants (EPIs) and covers remaining terms using Petrick's method or a heuristic.
   * @param {Array<{id: string, cells: number[], size: number}>} primeImplicants - Array of PI objects.
   * @param {number[]} targetTerms - The terms that need to be covered (minterms or maxterms).
   * @returns {{essentialPIs: Array, finalGroups: Array}} - The essential PIs and the final set of groups covering all terms.
   */
  function selectEssentialPrimeImplicants(primeImplicants, targetTerms) {
    if (targetTerms.length === 0 || primeImplicants.length === 0) {
      return { essentialPIs: [], finalGroups: [] };
    }

    const essentialPIs = [];
    const remainingTargetTerms = new Set(targetTerms);
    const piChart = new Map(); // Map: targetTerm -> [PI IDs covering it]

    // Build the PI chart
    targetTerms.forEach((term) => piChart.set(term, []));
    primeImplicants.forEach((pi) => {
      pi.cells.forEach((cell) => {
        if (piChart.has(cell)) {
          piChart.get(cell).push(pi.id);
        }
      });
    });

    // Find essential PIs (terms covered by only one PI)
    piChart.forEach((piIds, term) => {
      if (piIds.length === 1) {
        const essentialId = piIds[0];
        const essentialPI = primeImplicants.find((pi) => pi.id === essentialId);
        if (
          essentialPI &&
          !essentialPIs.some((epi) => epi.id === essentialId)
        ) {
          essentialPIs.push(essentialPI);
          // Remove terms covered by this essential PI
          essentialPI.cells.forEach((cell) => {
            if (remainingTargetTerms.has(cell)) {
              remainingTargetTerms.delete(cell);
            }
          });
        }
      }
    });

    // --- Coverage of Remaining Terms (Heuristic Approach) ---
    // If all terms are covered by EPIs, we are done.
    let finalGroups = [...essentialPIs];
    if (remainingTargetTerms.size > 0) {
      // Use a greedy heuristic: pick PIs that cover the most remaining terms, prioritizing larger groups.
      const remainingPIs = primeImplicants.filter(
        (pi) => !essentialPIs.some((epi) => epi.id === pi.id),
      );

      while (remainingTargetTerms.size > 0 && remainingPIs.length > 0) {
        let bestPIChoice = null;
        let maxCoveredCount = -1;

        remainingPIs.forEach((pi) => {
          const coveredCount = pi.cells.filter((cell) =>
            remainingTargetTerms.has(cell),
          ).length;
          if (coveredCount > 0) {
            // Prioritize PI that covers more remaining terms.
            // If counts are equal, prioritize larger group size (fewer literals).
            // If still equal, could use cost (literal count) or just take the first.
            if (
              coveredCount > maxCoveredCount ||
              (coveredCount === maxCoveredCount && pi.size > bestPIChoice?.size)
            ) {
              maxCoveredCount = coveredCount;
              bestPIChoice = pi;
            }
          }
        });

        if (bestPIChoice) {
          finalGroups.push(bestPIChoice);
          // Remove covered terms
          bestPIChoice.cells.forEach((cell) =>
            remainingTargetTerms.delete(cell),
          );
          // Remove the chosen PI from further consideration in this loop
          const indexToRemove = remainingPIs.findIndex(
            (pi) => pi.id === bestPIChoice.id,
          );
          if (indexToRemove > -1) {
            remainingPIs.splice(indexToRemove, 1);
          }
        } else {
          // Should not happen if PIs were generated correctly, but break loop if no PI covers remaining terms
          console.error(
            "Could not cover remaining terms:",
            Array.from(remainingTargetTerms),
          );
          break;
        }
      }
    }

    // Remove duplicate groups if any were added (shouldn't happen with ID check)
    finalGroups = Array.from(
      new Map(finalGroups.map((g) => [g.id, g])).values(),
    );

    // Sort final groups for consistent output (e.g., by size then alphabetically by expression)
    finalGroups.sort((a, b) => {
      if (b.size !== a.size) return b.size - a.size; // Larger groups first
      // Optional: Sort alphabetically by expression if sizes are equal
      const exprA =
        currentMode === MODES.MINTERMS
          ? groupToExpressionSOP(a.cells)
          : groupToExpressionPOS(a.cells);
      const exprB =
        currentMode === MODES.MINTERMS
          ? groupToExpressionSOP(b.cells)
          : groupToExpressionPOS(b.cells);
      return exprA.localeCompare(exprB);
    });

    return { essentialPIs, finalGroups };
  }

  // Generate potential groups based on K-Map structure (Refined)
  function getPotentialGroups(size) {
    const groups = [];
    const indices = Array.from({ length: KMAP_SIZE }, (_, i) => i);

    // --- Groups of 8 ---
    if (size === 8) {
      // Rows (Top/Bottom Halves)
      groups.push(indices.slice(0, 8)); // Row 0, 1
      groups.push(indices.slice(8, 16)); // Row 2, 3
      // Columns (Left/Right Halves)
      groups.push([0, 1, 4, 5, 8, 9, 12, 13]); // Col 0, 1
      groups.push([2, 3, 6, 7, 10, 11, 14, 15]); // Col 2, 3
      // Wrap Around
      groups.push([0, 1, 2, 3, 8, 9, 10, 11]); // Top/Bottom Row Wrap (A')
      groups.push([0, 4, 8, 12, 1, 5, 9, 13]); // Left/Right Col Wrap (B') - Same as Left Half
      // Center 8x8 square is not a standard K-Map group
      groups.push([0, 4, 8, 12, 3, 7, 11, 15]); // Col 0 / Col 3 wrap (D')
      groups.push([0, 1, 2, 3, 12, 13, 14, 15]); // Row 0 / Row 3 wrap (C')
    }
    // --- Groups of 4 ---
    else if (size === 4) {
      // 2x2 Squares
      for (let r = 0; r < 3; r++) {
        // Row start (0, 4, 8)
        for (let c = 0; c < 3; c++) {
          // Col start (0, 1, 2)
          const start = r * 4 + c;
          // Check bounds carefully for wrapping
          const r_wrap = (r + 1) % 4; // Wrap row index (0->1, 1->2, 2->3, 3->0) - KMap specific
          const c_wrap = (c + 1) % 4; // Wrap col index

          // Standard 2x2 block (no wrap)
          if (r < 3 && c < 3) {
            // Check standard bounds
            groups.push([start, start + 1, start + 4, start + 5]);
          }
          // Wrap column (e.g., cells 3, 2, 7, 6 -> [2,3,6,7])
          if (r < 3 && c === 2) {
            // Last standard column start
            groups.push([start, start - 2, start + 4, start + 2]); // [2, 0, 6, 4] -> [0,2,4,6] ? No, [2,3,6,7] -> [2, 3, 6, 7]
            groups.push([start, start + 1 - 4, start + 4, start + 5 - 4]); // [2, 3, 6, 7]
            groups.push([3, 0, 7, 4]); // Wrap right edge
          }
          // Wrap row (e.g., cells 12, 13, 0, 1)
          if (r === 2 && c < 3) {
            // Last standard row start
            groups.push([start, start + 1, start + 4 - 16, start + 5 - 16]); // [8, 9, 0, 1]
            groups.push([12, 13, 0, 1]); // Wrap bottom edge
          }
          // Wrap both row and column (corner wrap)
          if (r === 2 && c === 2) {
            groups.push([15, 12, 3, 0]); // Corner wrap [0,3,12,15]
          }
        }
      }
      // Explicitly add known 4-cell groups for clarity
      // Rows
      groups.push([0, 1, 2, 3]);
      groups.push([4, 5, 6, 7]);
      groups.push([8, 9, 10, 11]);
      groups.push([12, 13, 14, 15]);
      // Columns
      groups.push([0, 4, 8, 12]);
      groups.push([1, 5, 9, 13]);
      groups.push([2, 6, 10, 14]);
      groups.push([3, 7, 11, 15]);
      // 2x2 Squares
      groups.push([0, 1, 4, 5]);
      groups.push([2, 3, 6, 7]);
      groups.push([8, 9, 12, 13]);
      groups.push([10, 11, 14, 15]);
      // Wraps
      groups.push([0, 2, 8, 10]); // Wrap Columns 0&2 (C')
      groups.push([1, 3, 9, 11]); // Wrap Columns 1&3 (C)
      groups.push([0, 3, 12, 15]); // Corner Wrap
      groups.push([4, 6, 12, 14]); // Not a standard group? -> This is C'D
      groups.push([5, 7, 13, 15]); // This is CD

      // Add missing wraps explicitly
      groups.push([0, 4, 3, 7]); // Top row wrap (B'D) -> No [0,1,2,3] [4,5,6,7] -> [0,4,1,5] [2,6,3,7]
      groups.push([8, 12, 11, 15]); // Bottom row wrap (BD) -> [8,9,10,11] [12,13,14,15] -> [8,12,9,13] [10,14,11,15]

      // Let's list the 12 standard 4-groups:
      // Rows: [0,1,2,3], [4,5,6,7], [8,9,10,11], [12,13,14,15]
      // Cols: [0,4,8,12], [1,5,9,13], [2,6,10,14], [3,7,11,15]
      // Squares: [0,1,4,5], [2,3,6,7], [8,9,12,13], [10,11,14,15]
      // Wrap Col: [0,2,8,10], [1,3,9,11] -> No, these are [0,4,8,12] [2,6,10,14] wrap -> [0,2,8,10] is B'D', [1,3,9,11] is B'D
      // Wrap Row: [0,1,12,13], [2,3,14,15] -> No, [0,1,2,3] [12,13,14,15] wrap -> [0,12,1,13,2,14,3,15] -> [0,1,12,13] is A'C', [2,3,14,15] is A'C
      // Corner: [0,3,12,15] -> No, [0,4,8,12] [3,7,11,15] wrap -> [0,3,12,15] is B'D'

      // Let's use the known terms:
      // A': [0-7], A: [8-15]
      // B': [0,1,4,5,8,9,12,13], B: [2,3,6,7,10,11,14,15]
      // C': [0,1,2,3,12,13,14,15], C: [4,5,6,7,8,9,10,11]
      // D': [0,4,8,12,3,7,11,15], D: [1,5,9,13,2,6,10,14]

      // 2-literal terms (size 4):
      groups.push([0, 1, 4, 5]); // A'B'
      groups.push([2, 3, 6, 7]); // A'B
      groups.push([8, 9, 12, 13]); // AB'
      groups.push([10, 11, 14, 15]); // AB
      groups.push([0, 1, 2, 3]); // A'C'
      groups.push([12, 13, 14, 15]); // AC'
      groups.push([4, 5, 6, 7]); // A'C
      groups.push([8, 9, 10, 11]); // AC
      groups.push([0, 4, 8, 12]); // B'D'
      groups.push([3, 7, 11, 15]); // BD'
      groups.push([1, 5, 9, 13]); // B'D
      groups.push([2, 6, 10, 14]); // BD
      groups.push([0, 2, 8, 10]); // C'D' -> No, this is B'D' ? Let's recheck KMap layout
      // Standard KMap:
      //      CD=00 01 11 10  (Cols: C'D', C'D, CD, CD')
      // AB=00    0   1  3  2
      // AB=01    4   5  7  6
      // AB=11   12  13 15 14
      // AB=10    8   9 11 10
      // B'D' = 0, 4, 8, 12 (Correct)
      // BD' = 2, 6, 10, 14 (Correct) -> No, D'=cols 00, 10. BD' = [2, 10] ? No. B=1 (rows 11, 10), D'=0 (cols 00, 10). Cells are 12, 8, 14, 10. -> [8,10,12,14]
      // B'D = 1, 5, 9, 13 (Correct)
      // BD = 3, 7, 11, 15 (Correct) -> No. B=1 (rows 11, 10), D=1 (cols 01, 11). Cells are 13, 9, 15, 11. -> [9,11,13,15]
      // C'D' = 0, 4, 12, 8 (Correct) -> [0,4,8,12]
      // CD' = 2, 6, 14, 10 (Correct) -> [2,6,10,14]
      // C'D = 1, 5, 13, 9 (Correct) -> [1,5,9,13]
      // CD = 3, 7, 15, 11 (Correct) -> [3,7,11,15]

      // Let's redo the 4-groups based on standard terms:
      // Squares: A'B'[0,1,4,5], A'B[2,3,6,7], AB'[8,9,12,13], AB[10,11,14,15]
      // Rows: A'C'[0,1,2,3], A'C[4,5,6,7], AC[8,9,10,11], AC'[12,13,14,15]
      // Cols: B'D'[0,4,8,12], B'D[1,5,9,13], BD[3,7,11,15], BD'[2,6,10,14] -> No, BD is [3,7,15,11], BD' is [2,6,14,10]
      // Let's use the variable definitions:
      // B'D': [0, 4, 8, 12]
      // B'D:  [1, 5, 9, 13]
      // BD:   [3, 7, 15, 11] -> sorted [3, 7, 11, 15]
      // BD':  [2, 6, 14, 10] -> sorted [2, 6, 10, 14]
      // C'D': [0, 4, 12, 8] -> sorted [0, 4, 8, 12]
      // C'D:  [1, 5, 13, 9] -> sorted [1, 5, 9, 13]
      // CD:   [3, 7, 15, 11] -> sorted [3, 7, 11, 15]
      // CD':  [2, 6, 14, 10] -> sorted [2, 6, 10, 14]
      // A'B': [0, 1, 4, 5]
      // A'B:  [2, 3, 6, 7]
      // AB':  [12, 13, 8, 9] -> sorted [8, 9, 12, 13]
      // AB:   [14, 15, 10, 11] -> sorted [10, 11, 14, 15]
      // A'C': [0, 1, 2, 3]
      // A'C:  [4, 5, 6, 7]
      // AC:   [12, 13, 14, 15] -> No. A=1(rows 11,10), C=1(cols 11,10). Cells 15,14,11,10 -> [10,11,14,15]
      // AC':  [8, 9, 10, 11] -> No. A=1(rows 11,10), C'=0(cols 00,01). Cells 12,13,8,9 -> [8,9,12,13]

      // Corrected 4-groups:
      groups.push([0, 1, 4, 5]); // A'B'
      groups.push([2, 3, 6, 7]); // A'B
      groups.push([8, 9, 12, 13]); // AB'
      groups.push([10, 11, 14, 15]); // AB
      groups.push([0, 1, 2, 3]); // A'C'
      groups.push([4, 5, 6, 7]); // A'C
      groups.push([8, 9, 10, 11]); // AC' -> No, AC is [8,9,10,11] ? A=1(11,10), C=1(11,10) -> 15,14,11,10. AC' is A=1(11,10), C'=0(00,01) -> 12,13,8,9
      // AC: [10, 11, 14, 15]
      // AC': [8, 9, 12, 13]
      groups.push([10, 11, 14, 15]); // AC
      groups.push([12, 13, 14, 15]); // AC' -> No, this is A C'=0 -> [12,13,8,9]
      groups.push([8, 9, 12, 13]); // AC'
      groups.push([0, 4, 8, 12]); // B'D' (also C'D')
      groups.push([1, 5, 9, 13]); // B'D (also C'D)
      groups.push([3, 7, 11, 15]); // BD (also CD)
      groups.push([2, 6, 10, 14]); // BD' (also CD')

      // Wraps:
      groups.push([0, 2, 8, 10]); // Wrap B'D' + BD' -> D' ? No. Cells 0,2,8,10 -> B'D' + CD' -> D'(B'+C) ? No. 0000, 0010, 1000, 1010 -> _0_0 -> B'D'
      groups.push([1, 3, 9, 11]); // Wrap B'D + BD -> D ? No. Cells 1,3,9,11 -> _ _ _ 1 -> D? No. 0001, 0011, 1001, 1011 -> _0_1 -> B'D
      groups.push([0, 8, 1, 9]); // Wrap A'C' + AC' -> C'? No. Cells 0,1,8,9 -> __0_ -> C'? No. 0000, 0001, 1000, 1001 -> _00_ -> B'C'
      groups.push([2, 10, 3, 11]); // Wrap A'C' + AC' -> C'? No. Cells 2,3,10,11 -> __1_ -> C? No. 0010, 0011, 1010, 1011 -> _01_ -> B'C
      groups.push([0, 4, 12, 8]); // This is B'D' / C'D'
      groups.push([2, 6, 14, 10]); // This is BD' / CD'
      groups.push([0, 1, 8, 9]); // Wrap A'C' + AC' -> C'? No. Cells 0,1,8,9 -> __0_ -> C'? No. 0000, 0001, 1000, 1001 -> _00_ -> B'C'
      groups.push([2, 3, 10, 11]); // Wrap A'C' + AC' -> C'? No. Cells 2,3,10,11 -> __1_ -> C? No. 0010, 0011, 1010, 1011 -> _01_ -> B'C
      groups.push([4, 5, 12, 13]); // Wrap A'C' + AC' -> C'? No. Cells 4,5,12,13 -> __0_ -> C'? No. 0100, 0101, 1100, 1101 -> _10_ -> B'C
      groups.push([6, 7, 14, 15]); // Wrap A'C' + AC' -> C'? No. Cells 6,7,14,15 -> __1_ -> C? No. 0110, 0111, 1110, 1111 -> _11_ -> B'C
      groups.push([0, 3, 12, 15]); // Corner Wrap -> B'D' + BD -> D'? No. 0000, 1100, 0011, 1111 -> __ _ _ -> No commonality? 0,3,12,15 -> B'D'

      // Final list of standard 4-groups (remove duplicates)
      const unique4Groups = new Set(
        [
          [0, 1, 4, 5].sort((a, b) => a - b).join(","), // A'B'
          [2, 3, 6, 7].sort((a, b) => a - b).join(","), // A'B
          [8, 9, 12, 13].sort((a, b) => a - b).join(","), // AB' (also AC')
          [10, 11, 14, 15].sort((a, b) => a - b).join(","), // AB (also AC)
          [0, 1, 2, 3].sort((a, b) => a - b).join(","), // A'C'
          [4, 5, 6, 7].sort((a, b) => a - b).join(","), // A'C
          // [10, 11, 14, 15] AC - duplicate
          // [8, 9, 12, 13] AC' - duplicate
          [0, 4, 8, 12].sort((a, b) => a - b).join(","), // B'D' (also C'D')
          [1, 5, 9, 13].sort((a, b) => a - b).join(","), // B'D (also C'D)
          [3, 7, 11, 15].sort((a, b) => a - b).join(","), // BD (also CD)
          [2, 6, 10, 14].sort((a, b) => a - b).join(","), // BD' (also CD')
          // Wraps that yield new terms
          [0, 2, 8, 10].sort((a, b) => a - b).join(","), // B'D' + CD' -> D' ? No. -> B'D'
          [1, 3, 9, 11].sort((a, b) => a - b).join(","), // B'D + CD -> D ? No. -> B'D
          [0, 4, 12, 8].sort((a, b) => a - b).join(","), // C'D' - duplicate
          [2, 6, 14, 10].sort((a, b) => a - b).join(","), // CD' - duplicate
          [0, 1, 8, 9].sort((a, b) => a - b).join(","), // B'C'
          [2, 3, 10, 11].sort((a, b) => a - b).join(","), // BC' -> No, B C'=0 -> [2,3,10,11] -> B C'
          [4, 5, 12, 13].sort((a, b) => a - b).join(","), // B'C
          [6, 7, 14, 15].sort((a, b) => a - b).join(","), // BC
          [0, 3, 12, 15].sort((a, b) => a - b).join(","), // Corner B'D'
        ].map((s) => s.split(",").map(Number)),
      );
      groups.push(...unique4Groups);
    }
    // --- Groups of 2 ---
    else if (size === 2) {
      // Horizontal adjacent
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
          groups.push([r * 4 + c, r * 4 + c + 1]);
        }
        // Horizontal wrap
        groups.push([r * 4 + 0, r * 4 + 3]);
      }
      // Vertical adjacent
      for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 3; r++) {
          groups.push([r * 4 + c, (r + 1) * 4 + c]);
        }
        // Vertical wrap
        groups.push([0 * 4 + c, 3 * 4 + c]); // indices c and 12+c
      }
    }
    // --- Groups of 1 ---
    else if (size === 1) {
      // Handled by the singleton logic in findPrimeImplicants caller
      // indices.forEach(i => groups.push([i]));
    }

    // Remove duplicates (by sorting cells and using Set)
    const uniqueGroups = new Map();
    groups.forEach((group) => {
      const sortedGroup = group.sort((a, b) => a - b);
      uniqueGroups.set(sortedGroup.join(","), sortedGroup);
    });

    return Array.from(uniqueGroups.values());
  }

  /**
   * Converts a group of cells (minterm indices) to a simplified Boolean expression term (SOP).
   * @param {number[]} group An array of cell indices forming a valid K-map group.
   * @returns {string} The simplified product term (e.g., "A'B", "C", "1").
   */
  function groupToExpressionSOP(group) {
    if (!group || group.length === 0) return "0"; // Or handle error
    if (group.length === KMAP_SIZE) return "1";

    // Determine which variables (A, B, C, D) remain constant within the group
    let constantVars = { A: "", B: "", C: "", D: "" }; // '', '0', or '1'
    const firstBin = group[0].toString(2).padStart(4, "0");
    constantVars.A = firstBin[0];
    constantVars.B = firstBin[1];
    constantVars.C = firstBin[2];
    constantVars.D = firstBin[3];

    for (let i = 1; i < group.length; i++) {
      const bin = group[i].toString(2).padStart(4, "0");
      if (constantVars.A !== "" && constantVars.A !== bin[0])
        constantVars.A = "";
      if (constantVars.B !== "" && constantVars.B !== bin[1])
        constantVars.B = "";
      if (constantVars.C !== "" && constantVars.C !== bin[2])
        constantVars.C = "";
      if (constantVars.D !== "" && constantVars.D !== bin[3])
        constantVars.D = "";
    }

    // Build the expression term
    let expr = [];
    if (constantVars.A === "0") expr.push("A'");
    else if (constantVars.A === "1") expr.push("A");

    if (constantVars.B === "0") expr.push("B'");
    else if (constantVars.B === "1") expr.push("B");

    if (constantVars.C === "0") expr.push("C'");
    else if (constantVars.C === "1") expr.push("C");

    if (constantVars.D === "0") expr.push("D'");
    else if (constantVars.D === "1") expr.push("D");

    // If no variables are constant (should only happen for group size 16), return "1"
    return expr.length > 0 ? expr.join("") : "1";
  }

  /**
   * Converts a group of cells (maxterm indices) to a simplified Boolean expression term (POS).
   * @param {number[]} group An array of cell indices forming a valid K-map group (representing 0s).
   * @returns {string} The simplified sum term (e.g., "(A'+B)", "(C)", "0").
   */
  function groupToExpressionPOS(group) {
    if (!group || group.length === 0) return "1"; // Or handle error
    if (group.length === KMAP_SIZE) return "0";

    // Determine which variables (A, B, C, D) remain constant within the group
    let constantVars = { A: "", B: "", C: "", D: "" }; // '', '0', or '1'
    const firstBin = group[0].toString(2).padStart(4, "0");
    constantVars.A = firstBin[0];
    constantVars.B = firstBin[1];
    constantVars.C = firstBin[2];
    constantVars.D = firstBin[3];

    for (let i = 1; i < group.length; i++) {
      const bin = group[i].toString(2).padStart(4, "0");
      if (constantVars.A !== "" && constantVars.A !== bin[0])
        constantVars.A = "";
      if (constantVars.B !== "" && constantVars.B !== bin[1])
        constantVars.B = "";
      if (constantVars.C !== "" && constantVars.C !== bin[2])
        constantVars.C = "";
      if (constantVars.D !== "" && constantVars.D !== bin[3])
        constantVars.D = "";
    }

    // Build the expression term (variables are INVERTED for POS sum terms)
    let expr = [];
    if (constantVars.A === "0")
      expr.push("A"); // 0 becomes uncomplemented
    else if (constantVars.A === "1") expr.push("A'"); // 1 becomes complemented

    if (constantVars.B === "0") expr.push("B");
    else if (constantVars.B === "1") expr.push("B'");

    if (constantVars.C === "0") expr.push("C");
    else if (constantVars.C === "1") expr.push("C'");

    if (constantVars.D === "0") expr.push("D");
    else if (constantVars.D === "1") expr.push("D'");

    // If no variables are constant (group size 16), return "0"
    if (expr.length === 0) return "0";
    // If only one literal, no parentheses needed
    if (expr.length === 1) return expr[0];
    // Otherwise, join with '+' and wrap in parentheses
    return "(" + expr.join(" + ") + ")";
  }

  // --- Manual Selection Expression Generation (Simplified/Needs Review) ---
  // This function needs to be aligned with the main simplification logic or removed/reworked.
  // It currently doesn't use the PI/EPI logic.
  function generateExpressionFromCells(cells, mode) {
    const n = cells.length;
    // Check if the number of selected cells is a valid group size (2, 4, 8, 16)
    const isValidGroupSize = n === 2 || n === 4 || n === 8 || n === 16;

    if (n === 0) return mode === MODES.MINTERMS ? "0" : "1";

    if (!isValidGroupSize && n !== KMAP_SIZE) {
      // Allow full map selection (n=16) implicitly handled later
      alert(
        `Invalid selection size: ${n}. Please select 2, 4, 8, or 16 cells that form a valid K-Map group.`,
      );
      // Return the current display value or a placeholder to avoid clearing the result area
      return (
        displayAreas.simplifiedExpression.textContent || "Invalid selection"
      );
    }

    // Consider if all cells are selected (simplifies to 1 for minterms, 0 for maxterms)
    if (n === KMAP_SIZE) return mode === MODES.MINTERMS ? "1" : "0";

    // Attempt to simplify the selected group directly (only works if selection is a perfect PI)
    const simplifiedSOP = groupToExpressionSOP(cells);
    const simplifiedPOS = groupToExpressionPOS(cells); // Calculate POS version too

    if (mode === MODES.MINTERMS) {
      // Check if the simplified SOP term covers exactly the selected cells (ignoring don't cares within selection)
      // This check is complex. For now, just return the simplified term if it looks valid.
      // A better approach might be to run the full solveKMap logic on a temporary map
      // containing only the selected cells as 1s.
      if (simplifiedSOP !== "1" || cells.length === KMAP_SIZE) {
        // Avoid returning '1' unless all cells selected
        // Basic check: does the expression length seem reasonable for the group size?
        // Check if the number of literals matches the expectation for the group size
        const expectedLiterals = 4 - Math.log2(n); // n is already validated as power of 2
        // Count literals in the simplified expression (A, B, C, D, ignoring ')
        const actualLiterals = (simplifiedSOP.match(/[A-D]/g) || []).length;

        if (actualLiterals === expectedLiterals) {
          return simplifiedSOP;
        } else {
          // If simplification doesn't match expected size, it might not be a valid rectangular group
          alert(
            `The selected ${n} cells do not form a valid rectangular group that can be simplified to a single term.`,
          );
          return (
            displayAreas.simplifiedExpression.textContent ||
            "Invalid group shape"
          );
        }
      }
      // Fallback: generate canonical SOP for the selection (sum of individual minterms)
      // This fallback might not be desired if we strictly enforce valid groups
      /* // Commenting out fallback for now to enforce valid group selection
             return cells.map(cellIndex => {
                 const binary = cellIndex.toString(2).padStart(4, '0');
                 let term = [];
                 if (binary[0] === '0') term.push("A'"); else term.push('A');
                 if (binary[1] === '0') term.push("B'"); else term.push('B');
                 if (binary[2] === '0') term.push("C'"); else term.push('C');
                 if (binary[3] === '0') term.push("D'"); else term.push('D');
                 return term.join('');
             }).join(' + ');
             */
      return (
        displayAreas.simplifiedExpression.textContent || "Invalid group shape"
      ); // Return current or placeholder
    } else {
      // Maxterms mode (POS) - Currently disabled in UI, but logic stub
      // Similar simplification check for POS
      if (simplifiedPOS !== "0" || cells.length === KMAP_SIZE) {
        // Basic check for POS term validity
        const expectedLiterals = 4 - Math.log2(n);
        // Count literals in the simplified POS expression (A, B, C, D, ignoring ', +, () )
        const actualLiterals = (simplifiedPOS.match(/[A-D]/g) || []).length;

        if (actualLiterals === expectedLiterals) {
          return simplifiedPOS;
        } else {
          alert(
            `The selected ${n} cells do not form a valid rectangular group that can be simplified to a single term.`,
          );
          return (
            displayAreas.simplifiedExpression.textContent ||
            "Invalid group shape"
          );
        }
      }
      // Fallback: generate canonical POS for the selection (product of individual maxterms)
      // Note: This should generate terms for the SELECTED 0s/Xs, not the unselected ones.
      /* // Commenting out fallback
             return cells.map(cellIndex => {
                 const binary = cellIndex.toString(2).padStart(4, '0');
                 let term = [];
                 if (binary[0] === '0') term.push("A"); else term.push("A'"); // Inverted logic for POS sums
                 if (binary[1] === '0') term.push("B"); else term.push("B'");
                 if (binary[2] === '0') term.push("C"); else term.push("C'");
                 if (binary[3] === '0') term.push("D"); else term.push("D'");
                 return '(' + term.join(' + ') + ')';
             }).join(' · ');
             */
      return (
        displayAreas.simplifiedExpression.textContent || "Invalid group shape"
      ); // Return current or placeholder
    }
  }

  // --- Utility Functions ---

  // Copy to clipboard
  actionButtons.copyExpression.addEventListener("click", function () {
    const expressionText = displayAreas.simplifiedExpression.textContent;
    navigator.clipboard
      .writeText(expressionText)
      .then(() => {
        const originalText = this.innerHTML; // Store original HTML content
        this.innerHTML = '<i class="fas fa-check"></i> Copied!';
        this.classList.add("btn-success");
        this.classList.remove("btn-secondary");
        setTimeout(() => {
          this.innerHTML = originalText;
          this.classList.remove("btn-success");
          this.classList.add("btn-secondary");
        }, 1500);
      })
      .catch((err) => {
        console.error("Clipboard copy failed:", err);
        alert("Error copying to clipboard. See console for details.");
      });
  });

  // --- Initialization ---
  function initialize() {
    clearKMap(); // Initialize K-Map and Truth Table visually
    highlightSelectedButton(toolButtons.setTo1.id); // Highlight default tool
    updateModeUI(); // Set up UI based on default mode
    // Add initial mode indicator
    updateModeUI();
  }

  initialize(); // Run initialization logic
}); // End DOMContentLoaded
