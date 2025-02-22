function ToolView() {
  const URL = "url";
  const FILE = "file";
  const TEXT = "text";

  let modules = ConformanceService.modules;

  let _state = {
    //result: Mock.testResults[0],
    result: null,
    detailSelect: { module: null, part: null, section: null, test: null },
  };

  let _rootElementId;
  let _resultsElementId;
  let _resultSummaryId;
  let _resultDetailsId;

  let _validator = new Validator({ modules });

  async function handleProcessingFinished({ result, duration }) {
    _state.result = result;
    _state.duration = duration;
    _state.detailSelect = {
      module: null,
      part: null,
      section: null,
      test: null,
    };
    renderResults();
  }
  _validator.onProcessingFinished(handleProcessingFinished);

  function render(rootElementId) {
    _rootElementId = rootElementId = rootElementId || _rootElementId;
    let validatorFormElementId = UI.generateElementId();
    let resultsElementId = UI.generateElementId();
    let toolView = UI.createElement({
      id: _rootElementId,
      className: "d-flex flex-column",
      children: [
        { element: "h1", text: "Validator" },
        { id: validatorFormElementId },
        { id: resultsElementId },
      ],
    });
    UI.replaceElement(_rootElementId, toolView);
    _validator.render(validatorFormElementId);
    renderResults(resultsElementId);
  }

  function renderResults(elementId) {
    _resultsElementId = elementId = elementId || _resultsElementId;
    if (!_state.result) return;
    let resultSummaryId = UI.generateElementId();
    let resultDetailsId = UI.generateElementId();
    let resultsView = UI.createElement({
      id: elementId,
      children: [
        {
          className: "d-flex flex-row align-items-baseline pt-3 mb-2",
          children: [
            { text: "Result", className: "fs-2 flex-grow-1" },
            {
              className: "d-flex flex-row align-items-center",
              children: [
                {
                  className: "me-2",
                  text: `Processing Time: ${Tools.msToTime(_state.duration, {
                    alwaysShowMins: true,
                  })}`,
                },
                {
                  className: "btn-group btn-group-sm",
                  role: "group",
                  ariaLabel: "Export",
                  children: [
                    {
                      element: "button",
                      type: "button",
                      className: "btn btn-outline-dark",
                      children: [
                        {
                          element: "i",
                          className: "fa-solid fa-download me-2",
                        },
                        { element: "span", text: "json" },
                      ],
                      onClick: () => {
                        let fileName =
                          "val-result-" + new Date().toISOString() + ".json";
                        let type = "application/json";
                        let data = JSON.stringify(_state.result, null, 2);

                        Tools.downloadFileFromData({ fileName, type, data });
                      },
                    },
                    {
                      element: "button",
                      type: "button",
                      className: "btn btn-outline-dark",
                      children: [
                        {
                          element: "i",
                          className:
                            "fa-solid fa-arrow-up-right-from-square me-2",
                        },
                        { element: "span", text: "html" },
                      ],
                      onClick: () => {
                        let report = HtmlReport.generateReport(_state.result);
                        HtmlReport.openReport(report);
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          className: "container-fluid d-flex border rounded p-0",
          style: "max-height: 90vh",
          children: [{ id: resultSummaryId }, { id: resultDetailsId }],
        },
      ],
    });

    UI.replaceElement(_resultsElementId, resultsView);
    renderResultSummary(resultSummaryId);
    renderResultDetails(resultDetailsId);
  }

  function renderResultSummary(elementId) {
    _resultSummaryId = elementId = elementId || _resultSummaryId;
    let moduleNames = Object.keys(_state.result.entries).filter(
      (key) => key !== "Stats" && key !== "verdict"
    );
    let modules = moduleNames.map((name) => {
      let module = _state.result.entries[name];
      module.name = name;
      return module;
    });

    let resultSummary = UI.createElement({
      id: elementId,
      className: "border-end w-50 d-flex flex-column",
      children: [
        {
          text: "Summary",
          className: "fs-5 fw-semibold bg-light border-bottom py-2 px-3",
        },
        {
          id: elementId + "-scroll",
          className: "flex-grow-1 overflow-auto",
          children: modules.map((module) => createModuleElement(module)),
        },
      ],
    });
    UI.replaceElement(_resultSummaryId, resultSummary);
    UI.loadScrollPosition(_resultSummaryId + "-scroll");
  }

  function createModuleElement(module) {
    let partNames = Object.keys(module).filter(
      (key) => typeof module[key] === "object" && "test" in module[key]
    );
    let parts = partNames.map((partName) => {
      let part = module[partName];
      part.name = partName;
      return part;
    });
    let moduleElement = UI.createElement({
      className: "p-3 border-bottom",
      children: [
        {
          className: "fs-5 mb-2",
          children: [
            {
              element: "i",
              className: getVerdictIcon(module.verdict),
            },
            { element: "span", className: "ms-2", text: module.name },
          ],
        },
        {
          children: parts.map((part) => createModulePartElement(part, module)),
        },
      ],
    });
    return moduleElement;
  }

  function createModulePartElement(part, module) {
    let testResults = part.test;
    let moduleInfoId = {
      module: module.name,
      part: part.name,
      type: "info",
    };
    let isModuleInfoSelected = isSelected(moduleInfoId);

    let modulePartElement = UI.createElement({
      children: [
        {
          className: "mt-3 fw-semibold",
          children: [
            {
              element: "i",
              className: getVerdictIcon(part.verdict),
              style: "width: 1.5em",
            },
            { element: "span", text: part.name },
          ],
        },
      ]
        .concat(
          (() => {
            if (!part.info) return;
            return [
              {
                element: "h6",
                className: "mt-3 ms-3",
                text: "Info:",
              },
              {
                element: "a",
                className: "ms-3" + (isModuleInfoSelected ? " fw-semibold" : ""),
                href: "#",
                text: part.info.length + " log message" + (part.info.length > 1 ? "s" : ""),
                onClick: (event) => {
                  if (isModuleInfoSelected) return;
                  _state.detailSelect = moduleInfoId;
                  UI.saveScrollPosition(_resultSummaryId + "-scroll");
                  renderResultSummary();
                  renderResultDetails();
                },
              },
            ];
          })()
        )
        .concat([
          {
            element: "h6",
            className: "mt-3 ms-3",
            text: "Test Results:",
          },
          {
            className: "list-group",
            children: testResults.map((testResult) =>
              createModulePartTestElement(testResult, part, module)
            ),
          },
        ]),
    });

    return modulePartElement;
  }

  function createModulePartTestElement(testResult, part, module) {
    let { section, test, state } = testResult;
    let testId = {
      module: module.name,
      part: part.name,
      section,
      test,
    };
    let isPartSelected = isSelected(testId);

    let modulePartTestElement = UI.createElement({
      element: "a",
      className:
        "list-group-item list-group-item-action" +
        (isPartSelected ? " fw-semibold bg-light" : ""),
      href: "#",
      onClick: () => {
        if (isPartSelected) return;
        _state.detailSelect = testId;
        UI.saveScrollPosition(_resultSummaryId + "-scroll");
        renderResultSummary();
        renderResultDetails();
      },
      children: [
        {
          element: "i",
          className: getVerdictIcon(state),
          style: "width: 1.5em",
        },
        { element: "span", text: section },
        {
          element: "i",
          className: "fa-solid fa-circle mx-2",
          style: "font-size: 0.3em; vertical-align: 1em",
        },
        {
          element: "span",
          text: test,
        },
      ],
    });
    return modulePartTestElement;
  }

  function renderResultDetails(elementId) {
    _resultDetailsId = elementId = elementId || _resultDetailsId;
    let { module, part, section, test, type } = _state.detailSelect;
    let resultDetails = null;

    if (module && part && section && test) {
      resultDetails = createTestResultDetailsElement(elementId);
    }

    if (module && part && type) {
      if (type === "info")
        resultDetails = createInfoLogsDetailsElement(elementId);
    }

    if (!resultDetails) {
      resultDetails = createResultDetailsInstructions(elementId);
    }

    UI.replaceElement(elementId, resultDetails);
  }

  function createResultDetailsInstructions(elementId) {
    let instructions = UI.createElement({
      id: elementId,
      className: "bg-light w-50",
      children: {
        className:
          "container-fluid text-center text-secondary h-100 d-flex flex-column justify-content-center",
        style: { maxHeight: "40vh" },
        children: [
          {
            element: "i",
            className: "fa-solid fa-circle-info mb-3",
            style: "font-size: 5em",
          },
          {
            text: "Select a test to see details",
          },
        ],
      },
    });
    return instructions;
  }

  function createTestResultDetailsElement(elementId) {
    let { module, part, section, test } = _state.detailSelect;
    let { state, messages } = _state.result.entries[module][part].test.find(
      (element) => element.test === test && element.section === section
    );
    let resultDetails = UI.createElement({
      id: elementId,
      className: "w-50 d-flex flex-column",
      children: [
        {
          text: "Details",
          className: "fs-5 fw-semibold bg-light border-bottom py-2 px-3",
        },
        {
          className: "flex-fill overflow-auto",
          children: {
            element: "table",
            className: "table",
            children: {
              element: "tbody",
              children: [
                {
                  element: "tr",
                  children: [
                    { element: "td", text: "Section" },
                    { element: "td", text: section },
                  ],
                },
                {
                  element: "tr",
                  children: [
                    { element: "td", text: "Test" },
                    { element: "td", text: test },
                  ],
                },
                {
                  element: "tr",
                  children: [
                    { element: "td", text: "State" },
                    {
                      element: "td",
                      children: [
                        { element: "i", className: getVerdictIcon(state) },
                        { element: "span", text: state, className: "ms-1" },
                      ],
                    },
                  ],
                },
                {
                  element: "tr",
                  children: [
                    { element: "td", text: "Module" },
                    { element: "td", text: module },
                  ],
                },
                {
                  element: "tr",
                  children: [
                    { element: "td", text: "Messages" },
                    {
                      element: "td",
                      children: {
                        className:
                          "font-monospace overflow-auto border rounded bg-light p-2",
                        style: "max-height: 30em",
                        children: messages.map((message) => ({
                          text: message,
                        })),
                      },
                    },
                  ],
                },
              ],
            },
          },
        },
      ],
    });
    return resultDetails;
  }

  function createInfoLogsDetailsElement(elementId) {
    let { module, part, type } = _state.detailSelect;
    let info = _state.result.entries[module][part].info;
    let resultDetails = UI.createElement({
      id: elementId,
      className: "w-50 d-flex flex-column",
      children: [
        {
          text: "Details",
          className: "fs-5 fw-semibold bg-light border-bottom py-2 px-3",
        },
        {
          className: "p-3 flex-fill overflow-auto",
          children: [
            {
              element: "h5",
              className: "mb-3",
              text: `${module} ${part} Log Messages`,
            },
          ].concat(
            info.map((message, index) => ({
              children: [
                {
                  element: "h6",
                  text: "Message #" + (index + 1),
                },
                {
                  className:
                    "font-monospace overflow-auto text-nowrap border rounded bg-light p-2",
                  style: "max-height: 30em",
                  children: message.split("\n").map((line) => ({ text: line })),
                },
              ],
            }))
          ),
        },
      ],
    });
    return resultDetails;
  }

  function isSelected({ module, part, section, test, type }) {
    let isSelected = true;
    if (_state.detailSelect.section && _state.detailSelect.test) {
      isSelected = isSelected && module === _state.detailSelect.module;
      isSelected = isSelected && part === _state.detailSelect.part;
      isSelected = isSelected && section === _state.detailSelect.section;
      isSelected = isSelected && test === _state.detailSelect.test;
    } else {
      isSelected = isSelected && module === _state.detailSelect.module;
      isSelected = isSelected && part === _state.detailSelect.part;
      isSelected = isSelected && type === _state.detailSelect.type;
    }
    return isSelected;
  }

  function getVerdictIcon(verdict) {
    switch (verdict) {
      case "PASS":
        return "fa-solid fa-check text-success";
      case "FAIL":
        return "fa-solid fa-xmark text-danger";
      default:
        return "fa-solid fa-question";
    }
  }

  let instance = {
    render,
  };
  return instance;
}
