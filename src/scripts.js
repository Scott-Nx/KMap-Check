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
    DISABLED: "disabled",
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
    ALERT_WARNING: "alert alert-warning",
    ICON_SUCCESS: "fas fa-check-circle",
    ICON_DANGER: "fas fa-times-circle",
  };
  const DEFAULT_TOOL = TOOLS.SET_1;
  const DEFAULT_MODE = MODES.MINTERMS;

  // --- State ---
  let kmap = Array(KMAP_SIZE).fill(0);
  let selectedTool = DEFAULT_TOOL;
  const selectedCells = new Set();
  let currentMode = DEFAULT_MODE;

  // --- DOM Cache ---
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
  let modeIndicator = null;

  // --- Helpers ---
  function updateKMapCellAppearance(cellElement, value, isSelected = false) {
    cellElement.classList.remove(
      CSS_CLASSES.SELECTED_0,
      CSS_CLASSES.SELECTED_1,
      CSS_CLASSES.SELECTED_X,
      CSS_CLASSES.SELECTED_CELL,
    );
    if (value === 1) cellElement.classList.add(CSS_CLASSES.SELECTED_1);
    else if (value === 0) cellElement.classList.add(CSS_CLASSES.SELECTED_0);
    else if (value === TOOLS.SET_X)
      cellElement.classList.add(CSS_CLASSES.SELECTED_X);
    if (isSelected) cellElement.classList.add(CSS_CLASSES.SELECTED_CELL);
  }

  function updateKMapCellState(index, value) {
    if (index < 0 || index >= KMAP_SIZE) return;
    kmap[index] = value;
    const cellElement = document.querySelector(
      `.kmap-cell[data-index="${index}"]`,
    );
    if (cellElement) {
      updateKMapCellAppearance(cellElement, value, selectedCells.has(index));
    }
  }

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

  function clearSelections() {
    selectedCells.clear();
    kmapCells.forEach((cell) =>
      cell.classList.remove(CSS_CLASSES.SELECTED_CELL),
    );
    updateSelectedCellsDisplay();
  }

  function highlightSelectedButton(buttonId) {
    Object.values(toolButtons).forEach((btn) => {
      if (!btn) return;
      btn.classList.remove(CSS_CLASSES.ACTIVE);
      btn.style.boxShadow = "";
    });
    const selectedBtn = document.getElementById(buttonId);
    if (!selectedBtn) return;
    selectedBtn.classList.add(CSS_CLASSES.ACTIVE);
    selectedBtn.style.boxShadow = "0 0 0 3px rgba(255,255,255,0.5)";
  }

  function parseTermList(inputString) {
    if (!inputString) return [];
    return inputString
      .split(",")
      .map((x) => parseInt(x.trim(), 10))
      .filter((x) => !isNaN(x) && x >= 0 && x < KMAP_SIZE);
  }

  function clearKMap() {
    kmap.fill(0);
    kmapCells.forEach((cell) => updateKMapCellAppearance(cell, 0, false));
    clearSelections();
    updateTruthTable();
    displayAreas.simplifiedExpression.textContent = "Result will appear here";
    displayAreas.groups.textContent = "Groups will appear here";
  }

  // --- Event Wiring (K-Map Cells) ---
  kmapCells.forEach(function (cell) {
    cell.addEventListener("click", function () {
      const index = parseInt(this.getAttribute("data-index"), 10);
      let needsSolve = true;

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
        clearSelections();
      } else if (selectedTool === TOOLS.SELECT) {
        needsSolve = false;
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
        updateTruthTable();
        solveKMap();
      }
    });
  });

  // --- Tool Buttons ---
  Object.entries(toolButtons).forEach(([key, button]) => {
    if (!button) return;

    if (key === "clearKmap") {
      button.addEventListener("click", () => {
        clearKMap();
        selectedTool = DEFAULT_TOOL;
        highlightSelectedButton(toolButtons.setTo1.id);
      });
      return;
    }

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
        return;
      }

      if (tool) {
        selectedTool = tool;
        highlightSelectedButton(button.id);
      }
    });
  });

  // --- Mode Switching ---
  modeRadios.forEach((input) => {
    input.addEventListener("change", function () {
      const newMode = this.value;

      Object.values(inputSections).forEach((section) =>
        section.classList.add(CSS_CLASSES.D_NONE),
      );

      if (newMode === MODES.MINTERMS) {
        inputSections.minterm.classList.remove(CSS_CLASSES.D_NONE);
        clearKMap();
      } else if (newMode === MODES.MAXTERMS) {
        inputSections.maxterm.classList.remove(CSS_CLASSES.D_NONE);
        kmap.fill(1);
        kmapCells.forEach((cell) => updateKMapCellAppearance(cell, 1));
      } else if (newMode === MODES.TRUTH_TABLE) {
        inputSections.truthTable.classList.remove(CSS_CLASSES.D_NONE);
        const truthTableCard = document.querySelector(".row.mt-4 .card");
        if (truthTableCard) {
          truthTableCard.scrollIntoView({ behavior: "smooth" });
        }
      }

      currentMode = newMode;
      clearSelections();
      updateModeUI();
    });
  });

  function updateModeUI() {
    let modeText = "Unknown Mode";
    let isGenerateFromSelectionEnabled = false;
    let isSelectToolEnabled = false;

    if (currentMode === MODES.MINTERMS) {
      modeText = "Minterms Mode (SOP)";
      isGenerateFromSelectionEnabled = true;
      isSelectToolEnabled = true;
    } else if (currentMode === MODES.MAXTERMS) {
      modeText = "Maxterms Mode (POS)";
      isGenerateFromSelectionEnabled = false;
      isSelectToolEnabled = true;
    } else if (currentMode === MODES.TRUTH_TABLE) {
      modeText = "Truth Table Mode";
      isGenerateFromSelectionEnabled = false;
      isSelectToolEnabled = false;
    }

    if (!modeIndicator) {
      modeIndicator = document.createElement("div");
      modeIndicator.id = "mode-indicator";
      modeIndicator.className = `${CSS_CLASSES.BADGE_INFO} mb-2`;
      displayAreas.selectedCellsContainer.prepend(modeIndicator);
    }
    modeIndicator.textContent = modeText;
    displayAreas.selectedCellsContainer.setAttribute("data-mode", currentMode);

    actionButtons.generateFromSelection.disabled =
      !isGenerateFromSelectionEnabled;
    toolButtons.selectTool.disabled = !isSelectToolEnabled;

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

    if (!isSelectToolEnabled && selectedTool === TOOLS.SELECT) {
      selectedTool = DEFAULT_TOOL;
      highlightSelectedButton(toolButtons.setTo1.id);
    }

    solveKMap();
  }

  // --- Generate From Minterms ---
  actionButtons.generateFromMinterms.addEventListener("click", () => {
    const minterms = parseTermList(inputFields.minterms.value);
    const dontCares = parseTermList(inputFields.dontCaresMinterm.value);

    clearKMap();
    minterms.forEach((i) => updateKMapCellState(i, 1));
    dontCares.forEach((i) => updateKMapCellState(i, TOOLS.SET_X));

    updateTruthTable();
    solveKMap();
  });

  // --- Generate From Maxterms ---
  actionButtons.generateFromMaxterms.addEventListener("click", () => {
    const maxterms = parseTermList(inputFields.maxterms.value);
    const dontCares = parseTermList(inputFields.dontCaresMaxterm.value);

    kmap.fill(1);
    kmapCells.forEach((cell) => updateKMapCellAppearance(cell, 1));
    maxterms.forEach((i) => updateKMapCellState(i, 0));
    dontCares.forEach((i) => updateKMapCellState(i, TOOLS.SET_X));
    clearSelections();
    updateTruthTable();
    solveKMap();
  });

  // --- Manual Selection to Expression ---
  actionButtons.generateFromSelection.addEventListener("click", () => {
    if (currentMode === MODES.MAXTERMS) {
      alert(
        "Generate from Selection is only implemented for minterm (SOP) mode.",
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
    );

    displayAreas.simplifiedExpression.textContent = expression;
    const groupsInfo = `Manual ${currentMode} selection: [${selectedIndices
      .sort((a, b) => a - b)
      .join(", ")}] → ${expression}`;
    displayAreas.groups.innerHTML = groupsInfo;
  });

  // --- Verify Expression ---
  actionButtons.verifyExpression.addEventListener("click", () => {
    const expression = inputFields.booleanExpression.value.trim();
    if (!expression) {
      alert("Please enter a Boolean expression to verify.");
      return;
    }

    try {
      const tempKmap = Array(KMAP_SIZE).fill(0);
      const expressionMinterms = [];
      const expressionMaxterms = [];

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

        if (result) expressionMinterms.push(i);
        else expressionMaxterms.push(i);
      }

      const userMinterms = [];
      const userMaxterms = [];
      const userDontCares = [];
      for (let i = 0; i < KMAP_SIZE; i++) {
        if (kmap[i] === 1) userMinterms.push(i);
        else if (kmap[i] === 0) userMaxterms.push(i);
        else if (kmap[i] === TOOLS.SET_X) userDontCares.push(i);
      }

      let matches = true;
      const mismatches = { missingOnes: [], extraOnes: [] };

      for (const m of userMinterms) {
        if (tempKmap[m] !== 1) {
          matches = false;
          mismatches.missingOnes.push(m);
        }
      }
      for (const z of userMaxterms) {
        if (tempKmap[z] !== 0) {
          matches = false;
          mismatches.extraOnes.push(z);
        }
      }

      const simplifiedInfo = `
        <p>Expression <strong>${expression}</strong> evaluates to:</p>
        <p>Minterms (1s): ${expressionMinterms.sort((a, b) => a - b).join(", ") || "None"}</p>
        <p>Maxterms (0s): ${expressionMaxterms.sort((a, b) => a - b).join(", ") || "None"}</p>
      `;
      displayAreas.simplifiedExpression.innerHTML = simplifiedInfo;

      let resultHTML = "";
      if (matches) {
        resultHTML = `
          <div class="${CSS_CLASSES.ALERT_SUCCESS}">
            <h5><i class="${CSS_CLASSES.ICON_SUCCESS}"></i> Success!</h5>
            <p>The Boolean expression matches the current K-Map state (considering Don't Cares).</p>
          </div>`;
      } else {
        resultHTML = `
          <div class="${CSS_CLASSES.ALERT_DANGER}">
            <h5><i class="${CSS_CLASSES.ICON_DANGER}"></i> Verification Failed</h5>
            <p>The Boolean expression does not perfectly match the current K-Map state:</p>
            <ul>
              ${
                mismatches.missingOnes.length
                  ? `<li>K-Map has 1(s) at [${mismatches.missingOnes
                      .sort((a, b) => a - b)
                      .join(", ")}] where expression has 0.</li>`
                  : ""
              }
              ${
                mismatches.extraOnes.length
                  ? `<li>K-Map has 0(s) at [${mismatches.extraOnes
                      .sort((a, b) => a - b)
                      .join(", ")}] where expression has 1.</li>`
                  : ""
              }
            </ul>
            <p>(Don't Care cells are ignored for mismatch reporting.)</p>
          </div>
          <div class="mt-2">
            <button id="useExpressionAnyway" class="btn btn-outline-warning btn-sm">Load K-Map from this Expression</button>
          </div>`;
      }

      displayAreas.groups.innerHTML = resultHTML;

      const useAnywayBtn = document.getElementById("useExpressionAnyway");
      if (useAnywayBtn) {
        useAnywayBtn.addEventListener(
          "click",
          () => {
            updateKMapFromEvaluation(tempKmap, userDontCares);
            displayAreas.groups.innerHTML = `<div class="${CSS_CLASSES.ALERT_INFO}">K-Map loaded from the verified expression. Original Don't Cares preserved where possible.</div>`;
          },
          { once: true },
        );
      }
    } catch (error) {
      console.error("Expression evaluation error:", error);
      alert(
        "Error evaluating expression: " +
          error.message +
          "\nSupported syntax: SOP form (e.g., AB + C'D).",
      );
      displayAreas.simplifiedExpression.textContent = "Error";
      displayAreas.groups.innerHTML = `<div class="${CSS_CLASSES.ALERT_DANGER}">Error evaluating expression.</div>`;
    }
  });

  function updateKMapFromEvaluation(evaluatedMap, originalDontCares) {
    clearKMap();
    for (let i = 0; i < KMAP_SIZE; i++) {
      if (originalDontCares.includes(i)) {
        updateKMapCellState(i, TOOLS.SET_X);
      } else {
        updateKMapCellState(i, evaluatedMap[i]);
      }
    }
    updateTruthTable();
    solveKMap();
  }

  function evaluateBooleanExpression(expr, variables) {
    expr = expr.toUpperCase().replace(/\s+/g, "");
    if (!expr) return false;
    const terms = expr.split("+");
    return terms.some((term) => {
      if (!term) return false;
      const literals = term.match(/[A-D]'?/g);
      if (!literals) return false;
      return literals.every((lit) => {
        if (Object.prototype.hasOwnProperty.call(variables, lit)) {
          return variables[lit];
        } else {
          console.warn(`Invalid literal in term "${term}": ${lit}`);
          return false;
        }
      });
    });
  }

  // --- Truth Table Rendering ---
  function updateTruthTable() {
    const tbody = displayAreas.truthTableBody;
    if (!tbody) return;
    tbody.innerHTML = "";

    for (let i = 0; i < KMAP_SIZE; i++) {
      const row = document.createElement("tr");
      const binary = i.toString(2).padStart(4, "0");

      for (let j = 0; j < 4; j++) {
        const cell = document.createElement("td");
        cell.textContent = binary[j];
        row.appendChild(cell);
      }

      const indexCell = document.createElement("td");
      indexCell.textContent = i;
      row.appendChild(indexCell);

      const outputCell = document.createElement("td");
      outputCell.dataset.index = i;
      outputCell.classList.add(CSS_CLASSES.TT_CLICKABLE);

      const value = kmap[i];
      if (value === 1) {
        outputCell.textContent = "1";
        outputCell.classList.add(CSS_CLASSES.TABLE_SUCCESS);
      } else if (value === 0) {
        outputCell.textContent = "0";
        outputCell.classList.add(CSS_CLASSES.TABLE_DANGER);
      } else {
        outputCell.textContent = "X";
        outputCell.classList.add(CSS_CLASSES.TABLE_WARNING);
      }

      row.appendChild(outputCell);
      tbody.appendChild(row);
    }

    addTruthTableClickListeners();
  }

  function addTruthTableClickListeners() {
    const outputCells = displayAreas.truthTableBody.querySelectorAll(
      `td.${CSS_CLASSES.TT_CLICKABLE}`,
    );
    outputCells.forEach((cell) => {
      cell.addEventListener("click", handleTruthTableClick);
    });
  }

  function handleTruthTableClick(event) {
    if (currentMode !== MODES.TRUTH_TABLE) {
      alert(
        `Switch to ${MODES.TRUTH_TABLE} mode to edit the truth table directly.`,
      );
      return;
    }

    const cell = event.target;
    const index = parseInt(cell.dataset.index, 10);
    let newValue;
    let newClass;
    let newText;

    if (kmap[index] === 0) {
      newValue = 1;
      newClass = CSS_CLASSES.TABLE_SUCCESS;
      newText = "1";
    } else if (kmap[index] === 1) {
      newValue = TOOLS.SET_X;
      newClass = CSS_CLASSES.TABLE_WARNING;
      newText = "X";
    } else {
      newValue = 0;
      newClass = CSS_CLASSES.TABLE_DANGER;
      newText = "0";
    }

    kmap[index] = newValue;
    cell.textContent = newText;
    cell.className = CSS_CLASSES.TT_CLICKABLE;
    cell.classList.add(newClass);

    updateKMapCellState(index, newValue);
    solveKMap();
  }

  actionButtons.generateFromTruthTable.addEventListener("click", () => {
    if (currentMode !== MODES.TRUTH_TABLE) {
      alert(
        `This button is intended for use in ${MODES.TRUTH_TABLE} mode; updates are already live.`,
      );
    } else {
      solveKMap();
      alert("K-Map solution regenerated from Truth Table.");
    }
  });

  actionButtons.resetTruthTable.addEventListener("click", () => {
    if (confirm("Reset entire K-Map and Truth Table to all zeros?")) {
      clearKMap();
      solveKMap();
    }
  });

  // --- Solve K-Map ---
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
      if (minterms.length === 0 && dontCares.length === KMAP_SIZE) {
        simplifiedExpression = "1";
        groupsInfoHTML = "All Don't Cares (can be simplified to 1)";
      } else if (minterms.length === 0) {
        simplifiedExpression = "0";
        groupsInfoHTML =
          "No minterms (all zeros or don't cares resulting in 0)";
      } else if (minterms.length + dontCares.length === KMAP_SIZE) {
        simplifiedExpression = "1";
        groupsInfoHTML = "All cells are 1s or Don't Cares (simplifies to 1)";
      } else {
        const primeImplicants = findPrimeImplicants(minterms, dontCares);
        const { essentialPIs, finalGroups } = selectEssentialPrimeImplicants(
          primeImplicants,
          minterms,
        );
        const finalExpressions = finalGroups.map((g) =>
          groupToExpressionSOP(g.cells),
        );
        simplifiedExpression =
          finalExpressions.length > 0 ? finalExpressions.join(" + ") : "0";

        groupsInfoHTML = finalGroups
          .map((group, index) => {
            const isEssential = essentialPIs.some((epi) => epi.id === group.id);
            const cells = group.cells
              .slice()
              .sort((a, b) => a - b)
              .join(", ");
            const expression = groupToExpressionSOP(group.cells);
            return `Group ${index + 1} ${isEssential ? "(Essential)" : ""}: [${cells}] → ${expression}`;
          })
          .join("<br>");

        if (finalGroups.length === 0 && minterms.length > 0) {
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
      if (maxterms.length === 0 && dontCares.length === KMAP_SIZE) {
        simplifiedExpression = "0";
        groupsInfoHTML = "All Don't Cares (can be simplified to 0)";
      } else if (maxterms.length === 0) {
        simplifiedExpression = "1";
        groupsInfoHTML = "No maxterms (all ones or don't cares resulting in 1)";
      } else if (maxterms.length + dontCares.length === KMAP_SIZE) {
        simplifiedExpression = "0";
        groupsInfoHTML = "All cells are 0s or Don't Cares (simplifies to 0)";
      } else {
        const primeImplicantsPOS = findPrimeImplicants(maxterms, dontCares);
        const { essentialPIs, finalGroups } = selectEssentialPrimeImplicants(
          primeImplicantsPOS,
          maxterms,
        );
        const finalExpressionsPOS = finalGroups.map((g) =>
          groupToExpressionPOS(g.cells),
        );
        simplifiedExpression =
          finalExpressionsPOS.length > 0
            ? finalExpressionsPOS.join(" · ")
            : "1";

        groupsInfoHTML = finalGroups
          .map((group, index) => {
            const isEssential = essentialPIs.some((epi) => epi.id === group.id);
            const cells = group.cells
              .slice()
              .sort((a, b) => a - b)
              .join(", ");
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
      simplifiedExpression = `(Simplification shown in ${MODES.MINTERMS} or ${MODES.MAXTERMS} mode)`;
      groupsInfoHTML = `
        <div class="${CSS_CLASSES.ALERT_INFO}">
          <h5>Truth Table Mode</h5>
          <p>Minterms (1s): ${minterms.sort((a, b) => a - b).join(", ") || "None"}</p>
          <p>Maxterms (0s): ${maxterms.sort((a, b) => a - b).join(", ") || "None"}</p>
          <p>Don't Cares (X): ${dontCares.sort((a, b) => a - b).join(", ") || "None"}</p>
        </div>`;
    }

    displayAreas.simplifiedExpression.innerHTML = simplifiedExpression;
    displayAreas.groups.innerHTML = groupsInfoHTML || "No groups formed.";
  }

  // --- Prime Implicants ---
  function findPrimeImplicants(targetTerms, dontCares) {
    if (targetTerms.length === 0) return [];

    const allCoverableCells = new Set([...targetTerms, ...dontCares]);
    const primeImplicants = [];
    const coveredTargetTerms = new Set();

    for (const size of [16, 8, 4, 2, 1]) {
      if (size === 16) {
        if (targetTerms.length + dontCares.length === KMAP_SIZE) {
          const groupCells = Array.from({ length: KMAP_SIZE }, (_, i) => i);
          primeImplicants.push({
            id: groupCells.join(","),
            cells: groupCells,
            size,
          });
          return primeImplicants;
        }
        continue;
      }

      const potentialGroups = getPotentialGroups(size);
      for (const groupCells of potentialGroups) {
        const isValidGroup = groupCells.every((cell) =>
          allCoverableCells.has(cell),
        );
        if (!isValidGroup) continue;

        const coversTargetTerm = groupCells.some((cell) =>
          targetTerms.includes(cell),
        );
        if (!coversTargetTerm) continue;

        const groupTargetTerms = groupCells.filter((cell) =>
          targetTerms.includes(cell),
        );
        const isSubsumed = groupTargetTerms.every((term) =>
          coveredTargetTerms.has(term),
        );
        if (isSubsumed) continue;

        const sortedCellsString = groupCells
          .slice()
          .sort((a, b) => a - b)
          .join(",");
        const alreadyExists = primeImplicants.some((pi) => {
          const existingSet = new Set(pi.cells);
          return groupCells.every((c) => existingSet.has(c));
        });
        if (!alreadyExists) {
          primeImplicants.push({
            id: sortedCellsString,
            cells: groupCells.slice().sort((a, b) => a - b),
            size,
          });
          groupTargetTerms.forEach((t) => coveredTargetTerms.add(t));
        }
      }
    }

    const allCovered = new Set(
      primeImplicants.flatMap((pi) =>
        pi.cells.filter((c) => targetTerms.includes(c)),
      ),
    );
    targetTerms.forEach((t) => {
      if (!allCovered.has(t)) {
        const id = t.toString();
        if (!primeImplicants.some((pi) => pi.id === id)) {
          primeImplicants.push({ id, cells: [t], size: 1 });
        }
      }
    });

    return primeImplicants.filter((pi) => {
      return !primeImplicants.some(
        (other) =>
          pi.id !== other.id &&
          pi.size < other.size &&
          pi.cells.every((cell) => other.cells.includes(cell)),
      );
    });
  }

  function selectEssentialPrimeImplicants(primeImplicants, targetTerms) {
    if (targetTerms.length === 0 || primeImplicants.length === 0) {
      return { essentialPIs: [], finalGroups: [] };
    }

    const essentialPIs = [];
    const remainingTargetTerms = new Set(targetTerms);
    const piChart = new Map();
    targetTerms.forEach((t) => piChart.set(t, []));

    primeImplicants.forEach((pi) => {
      pi.cells.forEach((cell) => {
        if (piChart.has(cell)) piChart.get(cell).push(pi.id);
      });
    });

    piChart.forEach((piIds, term) => {
      if (piIds.length === 1) {
        const essentialId = piIds[0];
        const essentialPI = primeImplicants.find((pi) => pi.id === essentialId);
        if (
          essentialPI &&
          !essentialPIs.some((epi) => epi.id === essentialPI.id)
        ) {
          essentialPIs.push(essentialPI);
          essentialPI.cells.forEach((cell) =>
            remainingTargetTerms.delete(cell),
          );
        }
      }
    });

    let finalGroups = [...essentialPIs];
    if (remainingTargetTerms.size > 0) {
      const remainingPIs = primeImplicants.filter(
        (pi) => !essentialPIs.some((epi) => epi.id === pi.id),
      );

      while (remainingTargetTerms.size > 0 && remainingPIs.length > 0) {
        let best = null;
        let maxCovered = -1;

        remainingPIs.forEach((pi) => {
          const covered = pi.cells.filter((c) =>
            remainingTargetTerms.has(c),
          ).length;
          if (
            covered > 0 &&
            (covered > maxCovered ||
              (covered === maxCovered && pi.size > (best?.size || 0)))
          ) {
            maxCovered = covered;
            best = pi;
          }
        });

        if (!best) break;

        finalGroups.push(best);
        best.cells.forEach((c) => remainingTargetTerms.delete(c));
        const idx = remainingPIs.findIndex((pi) => pi.id === best.id);
        if (idx > -1) remainingPIs.splice(idx, 1);
      }
    }

    finalGroups = Array.from(
      new Map(finalGroups.map((g) => [g.id, g])).values(),
    );

    finalGroups.sort((a, b) => {
      if (b.size !== a.size) return b.size - a.size;
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

  function getPotentialGroups(size) {
    const groups = [];
    const indices = Array.from({ length: KMAP_SIZE }, (_, i) => i);

    if (size === 8) {
      groups.push(indices.slice(0, 8));
      groups.push(indices.slice(8, 16));
      groups.push([0, 1, 4, 5, 8, 9, 12, 13]);
      groups.push([2, 3, 6, 7, 10, 11, 14, 15]);
      groups.push([0, 1, 2, 3, 8, 9, 10, 11]);
      groups.push([0, 4, 8, 12, 1, 5, 9, 13]);
      groups.push([0, 4, 8, 12, 3, 7, 11, 15]);
      groups.push([0, 1, 2, 3, 12, 13, 14, 15]);
    } else if (size === 4) {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const start = r * 4 + c;
          if (r < 3 && c < 3)
            groups.push([start, start + 1, start + 4, start + 5]);
          if (r < 3 && c === 2) {
            groups.push([start, start + 1 - 4, start + 4, start + 5 - 4]);
            groups.push([3, 0, 7, 4]);
          }
          if (r === 2 && c < 3) {
            groups.push([start, start + 1, start + 4 - 16, start + 5 - 16]);
            groups.push([12, 13, 0, 1]);
          }
          if (r === 2 && c === 2) groups.push([15, 12, 3, 0]);
        }
      }
      groups.push([0, 1, 2, 3]);
      groups.push([4, 5, 6, 7]);
      groups.push([8, 9, 10, 11]);
      groups.push([12, 13, 14, 15]);
      groups.push([0, 4, 8, 12]);
      groups.push([1, 5, 9, 13]);
      groups.push([2, 6, 10, 14]);
      groups.push([3, 7, 11, 15]);
      groups.push([0, 1, 4, 5]);
      groups.push([2, 3, 6, 7]);
      groups.push([8, 9, 12, 13]);
      groups.push([10, 11, 14, 15]);
      groups.push([0, 2, 8, 10]);
      groups.push([1, 3, 9, 11]);
      groups.push([0, 3, 12, 15]);
      groups.push([4, 6, 12, 14]);
      groups.push([5, 7, 13, 15]);
      const unique4 = new Map();
      groups.forEach((g) => {
        const key = g
          .slice()
          .sort((a, b) => a - b)
          .join(",");
        unique4.set(
          key,
          g.slice().sort((a, b) => a - b),
        );
      });
      return Array.from(unique4.values());
    } else if (size === 2) {
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
          groups.push([r * 4 + c, r * 4 + c + 1]);
        }
        groups.push([r * 4 + 0, r * 4 + 3]);
      }
      for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 3; r++) {
          groups.push([r * 4 + c, (r + 1) * 4 + c]);
        }
        groups.push([0 * 4 + c, 3 * 4 + c]);
      }
    }

    const unique = new Map();
    groups.forEach((g) => {
      const s = g.slice().sort((a, b) => a - b);
      unique.set(s.join(","), s);
    });
    return Array.from(unique.values());
  }

  function groupToExpressionSOP(group) {
    if (!group || group.length === 0) return "0";
    if (group.length === KMAP_SIZE) return "1";
    let constantVars = { A: "", B: "", C: "", D: "" };
    const firstBin = group[0].toString(2).padStart(4, "0");
    constantVars.A = firstBin[0];
    constantVars.B = firstBin[1];
    constantVars.C = firstBin[2];
    constantVars.D = firstBin[3];

    for (let i = 1; i < group.length; i++) {
      const bin = group[i].toString(2).padStart(4, "0");
      if (constantVars.A && constantVars.A !== bin[0]) constantVars.A = "";
      if (constantVars.B && constantVars.B !== bin[1]) constantVars.B = "";
      if (constantVars.C && constantVars.C !== bin[2]) constantVars.C = "";
      if (constantVars.D && constantVars.D !== bin[3]) constantVars.D = "";
    }

    const expr = [];
    if (constantVars.A === "0") expr.push("A'");
    else if (constantVars.A === "1") expr.push("A");
    if (constantVars.B === "0") expr.push("B'");
    else if (constantVars.B === "1") expr.push("B");
    if (constantVars.C === "0") expr.push("C'");
    else if (constantVars.C === "1") expr.push("C");
    if (constantVars.D === "0") expr.push("D'");
    else if (constantVars.D === "1") expr.push("D");

    return expr.length > 0 ? expr.join("") : "1";
  }

  function groupToExpressionPOS(group) {
    if (!group || group.length === 0) return "1";
    if (group.length === KMAP_SIZE) return "0";

    let constantVars = { A: "", B: "", C: "", D: "" };
    const firstBin = group[0].toString(2).padStart(4, "0");
    constantVars.A = firstBin[0];
    constantVars.B = firstBin[1];
    constantVars.C = firstBin[2];
    constantVars.D = firstBin[3];

    for (let i = 1; i < group.length; i++) {
      const bin = group[i].toString(2).padStart(4, "0");
      if (constantVars.A && constantVars.A !== bin[0]) constantVars.A = "";
      if (constantVars.B && constantVars.B !== bin[1]) constantVars.B = "";
      if (constantVars.C && constantVars.C !== bin[2]) constantVars.C = "";
      if (constantVars.D && constantVars.D !== bin[3]) constantVars.D = "";
    }

    const expr = [];
    if (constantVars.A === "0") expr.push("A");
    else if (constantVars.A === "1") expr.push("A'");
    if (constantVars.B === "0") expr.push("B");
    else if (constantVars.B === "1") expr.push("B'");
    if (constantVars.C === "0") expr.push("C");
    else if (constantVars.C === "1") expr.push("C'");
    if (constantVars.D === "0") expr.push("D");
    else if (constantVars.D === "1") expr.push("D'");

    if (expr.length === 0) return "0";
    if (expr.length === 1) return expr[0];
    return "(" + expr.join(" + ") + ")";
  }

  function generateExpressionFromCells(cells, mode) {
    const n = cells.length;
    const isValidGroupSize = n === 2 || n === 4 || n === 8 || n === 16;
    if (n === 0) return mode === MODES.MINTERMS ? "0" : "1";
    if (!isValidGroupSize && n !== KMAP_SIZE) {
      alert(
        `Invalid selection size: ${n}. Please select 2, 4, 8, or 16 cells that form a valid K-Map group.`,
      );
      return (
        displayAreas.simplifiedExpression.textContent || "Invalid selection"
      );
    }
    if (n === KMAP_SIZE) return mode === MODES.MINTERMS ? "1" : "0";

    const simplifiedSOP = groupToExpressionSOP(cells);
    const simplifiedPOS = groupToExpressionPOS(cells);

    if (mode === MODES.MINTERMS) {
      if (simplifiedSOP !== "1" || cells.length === KMAP_SIZE) {
        const expectedLiterals = 4 - Math.log2(n);
        const actualLiterals = (simplifiedSOP.match(/[A-D]/g) || []).length;
        if (actualLiterals === expectedLiterals) return simplifiedSOP;
        alert(
          `The selected ${n} cells do not form a valid rectangular group that can be simplified to a single term.`,
        );
        return (
          displayAreas.simplifiedExpression.textContent || "Invalid group shape"
        );
      }
      return (
        displayAreas.simplifiedExpression.textContent || "Invalid group shape"
      );
    } else {
      if (simplifiedPOS !== "0" || cells.length === KMAP_SIZE) {
        const expectedLiterals = 4 - Math.log2(n);
        const actualLiterals = (simplifiedPOS.match(/[A-D]/g) || []).length;
        if (actualLiterals === expectedLiterals) return simplifiedPOS;
        alert(
          `The selected ${n} cells do not form a valid rectangular group that can be simplified to a single term.`,
        );
        return (
          displayAreas.simplifiedExpression.textContent || "Invalid group shape"
        );
      }
      return (
        displayAreas.simplifiedExpression.textContent || "Invalid group shape"
      );
    }
  }

  actionButtons.copyExpression.addEventListener("click", function () {
    const expressionText = displayAreas.simplifiedExpression.textContent;
    navigator.clipboard
      .writeText(expressionText)
      .then(() => {
        const originalText = this.innerHTML;
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

  function initialize() {
    clearKMap();
    highlightSelectedButton(toolButtons.setTo1.id);
    updateModeUI();
  }

  initialize();
});
