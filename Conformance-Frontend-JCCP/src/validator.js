function Validator({ modules }) {
  const READY = "ready";
  const PROCESSING = "processing";
  const NOT_IMPLEMENTED = "not_implemented";

  const PROCESSING_FINISHED = "processing_finished";

  let mpdForms = [
    { type: "url", text: "URL" },
    { type: "file", text: "File Upload" },
    { type: "text", text: "Text Input" },
  ];

  let instance;
  let _state = {
    activeMpdForm: mpdForms[0].type,
    activeModules: {},
    validatorState: READY,
    mpdUrl: null,
    error: null,
    processingStartDate: null,
    processingEndDate: null,
  };
  let eventHandler = new EventHandler();

  let _durationInterval;

  let _rootElementId;
  let _durationElementId;

  async function handleValidation() {
    _state.error = null;
    if (_state.activeMpdForm === "url") {
      let { mpdUrl, activeModules } = _state;
      if (!Net.isValidUrl(mpdUrl)) {
        _state.error = "Invalid URL";
        render();
        return;
      }
      _state.validatorState = PROCESSING;
      _state.processingStartDate = Date.now();
      updateDuration();
      _durationInterval = setInterval(updateDuration, 1000);
      render();
      let result = await ConformanceService.validateContentByUrl({
        mpdUrl,
        activeModules,
      });
      _state.validatorState = READY;
      _state.processingEndDate = Date.now();
      render();
      let duration = _state.processingEndDate - _state.processingStartDate;
      eventHandler.dispatchEvent(PROCESSING_FINISHED, { result, duration });
    }
  }

  function onProcessingFinished(callback) {
    eventHandler.on(PROCESSING_FINISHED, callback);
  }

  function updateDuration() {
    if (_state.validatorState !== PROCESSING) {
      clearInterval(_durationInterval);
      UI.clearElement(_durationElementId);
      return;
    }
    let durationElement = UI.createElement({
      id: _durationElementId,
      text: Tools.msToTime(Date.now() - _state.processingStartDate, {
        alwaysShowMins: true,
      }),
    });
    UI.replaceElement(_durationElementId, durationElement);
  }

  function render(elementId) {
    _rootElementId = elementId = elementId || _rootElementId;
    _durationElementId = UI.generateElementId();

    let validator = UI.createElement({
      id: elementId,
      className: "container border rounded p-3 bg-light",
      style: "max-width: 768px",
      children: [
        _state.error
          ? {
              className: "alert alert-danger alert-dismissible",
              role: "alert",
              children: [
                { text: _state.error },
                {
                  element: "button",
                  type: "button",
                  className: "btn-close",
                  dataBsDismiss: "alert",
                  ariaLabel: "Close",
                  onClick: () => {
                    _state.error = null;
                    render();
                  },
                },
              ],
            }
          : {},
        {
          element: "form",
          children: [
            {
              className: "mb-3 row",
              children: [
                {
                  element: "label",
                  className: "col-sm-2 col-form-label",
                  for: "mpd-url",
                  text: "MPD",
                },
                {
                  className: "col-sm-10",
                  children: [
                    {
                      element: "ul",
                      className: "nav nav-tabs",
                      children: mpdForms.map((form) => ({
                        element: "li",
                        className: "nav-item",
                        children: {
                          element: "a",
                          className:
                            "nav-link" +
                            (_state.activeMpdForm === form.type
                              ? " active"
                              : ""),
                          onclick:
                            _state.activeMpdForm === form.type
                              ? () => {}
                              : () => {
                                  _state.activeMpdForm = form.type;
                                  _state.validatorState =
                                    form.type === "url"
                                      ? READY
                                      : NOT_IMPLEMENTED;
                                  render();
                                },
                          href: "#",
                          text: form.text,
                        },
                      })),
                    },
                    {
                      className:
                        "p-3 border border-top-0 rounded-bottom bg-white",
                      children: (() => {
                        switch (_state.activeMpdForm) {
                          case "url":
                            return {
                              element: "input",
                              type: "textbox",
                              className: "form-control",
                              id: "mpd-url",
                              value: _state.mpdUrl,
                              onchange: (event) => {
                                _state.mpdUrl = event.target.value;
                              },
                            };
                          case "file":
                            return {
                              element: "input",
                              type: "file",
                              className: "form-control",
                              id: "mpd-file",
                              onchange: (event) => {
                                _state.mpdFile = event.target.value;
                              },
                            };
                          case "text":
                            return {
                              element: "textarea",
                              className: "form-control",
                              id: "mpd-text",
                              onchange: (event) => {
                                _state.mpdText = event.target.value;
                                _state.validatorState = "not_implemented";
                                render();
                              },
                            };
                        }
                      })(),
                    },
                  ],
                },
              ],
            },
            {
              className: "mb-3 row",
              children: [
                {
                  element: "label",
                  className: "col-sm-2 col-form-label",
                  text: "Include additional tests",
                },
                {
                  className: "col-sm-10",
                  children: modules.map((module) => ({
                    className: "form-check",
                    children: [
                      {
                        element: "input",
                        type: "checkbox",
                        className: "form-check-input",
                        id: module.id,
                        onchange: (event) => {
                          _state.activeModules[module.id] =
                            event.target.checked;
                        },
                        checked: _state.activeModules[module.id],
                      },
                      {
                        element: "label",
                        className: "form-check-label",
                        for: module.id,
                        text: module.text,
                      },
                    ],
                  })),
                },
              ],
            },
            {
              className:
                "d-grid gap-2 d-md-flex justify-content-md-end align-items-center",
              children: [
                {
                  id: _durationElementId,
                },
                {
                  element: "button",
                  type: "button",
                  className:
                    "btn btn-primary" +
                    (_state.validatorState === READY ? "" : " disabled"),
                  onclick: handleValidation,
                  children: (() => {
                    switch (_state.validatorState) {
                      case NOT_IMPLEMENTED:
                      case READY:
                        return [
                          { element: "i", className: "fa-solid fa-play me-2" },
                          { element: "span", text: "Process" },
                        ];
                      case PROCESSING:
                        return [
                          {
                            element: "i",
                            className: "fa-solid fa-gear fa-spin me-2",
                          },
                          { element: "span", text: "Processing" },
                        ];
                    }
                  })(),
                },
              ],
            },
          ],
        },
      ],
    });

    UI.replaceElement(elementId, validator);

    if (_state.validatorState === PROCESSING) updateDuration();
  }

  instance = {
    onProcessingFinished,
    render,
  };
  return instance;
}
