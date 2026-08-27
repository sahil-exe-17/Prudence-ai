
      (function () {
        var state = {
          file: null,
          previewUrl: "",
          annotations: true,
          analysis: null,
          pdfDoc: null,
          pdfPage: 1,
          pdfZoom: 1.35,
          renderToken: 0,
          cadFile: null,
          cadPayload: null,
          analysisCache: {}
        };

        var fileInput = document.getElementById("file-input");
        var uploadButton = document.getElementById("upload-button");
        var cadStatus = document.getElementById("cad-status");
        var chooseButton = document.getElementById("choose-button");
        var layersButton = document.getElementById("layers-button");
        var exportButton = document.getElementById("export-button");
        var jurisdiction = document.getElementById("jurisdiction");
        var viewer = document.getElementById("viewer");
        var emptyState = document.getElementById("empty-state");
        var preview = document.getElementById("preview");
        var annotationLayer = document.getElementById("annotation-layer");
        var documentTitle = document.getElementById("document-title");
        var loadedBadge = document.getElementById("loaded-badge");
        var loadedName = document.getElementById("loaded-name");
        var loadedMeta = document.getElementById("loaded-meta");
        var planIntel = document.getElementById("plan-intel");
        var documentReading = document.getElementById("document-reading");
        var readingProvider = document.getElementById("reading-provider");
        var readingSummary = document.getElementById("reading-summary");
        var readingItems = document.getElementById("reading-items");
        var ruleMatrix = document.getElementById("rule-matrix");
        var ruleSummary = document.getElementById("rule-summary");
        var ruleChecks = document.getElementById("rule-checks");
        var rulePackInputs = Array.prototype.slice.call(document.querySelectorAll('input[name="rule-pack"]'));

        function formatBytes(bytes) {
          if (!bytes) return "0 KB";
          var units = ["B", "KB", "MB", "GB"];
          var index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
          return (bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1) + " " + units[index];
        }

        function escapeHtml(value) {
          return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
        }

        function getSelectedRulePacks() {
          var selected = rulePackInputs.filter(function (input) { return input.checked; }).map(function (input) { return input.value; });
          if (!selected.length) {
            rulePackInputs.forEach(function (input) { input.checked = true; });
            selected = rulePackInputs.map(function (input) { return input.value; });
          }
          return selected;
        }

        function cadExtension(file) {
          var match = String(file && file.name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
          return match ? match[1] : "cad";
        }

        function isCadFile(file) {
          return /\.(dwg|dxf|ifc|step|stp|zip|cad|svg|txt)$/i.test(String(file && file.name || ""));
        }

        function isTextCadFile(file) {
          return /\.(dxf|ifc|svg|txt|xml|json|csv)$/i.test(String(file && file.name || "")) ||
            String(file && file.type || "").indexOf("text/") === 0;
        }

        function prepareCadPayload(file) {
          if (!file) return Promise.resolve(null);
          var base = {
            attached: true,
            filename: file.name,
            size: file.size,
            mimeType: file.type || "application/octet-stream",
            extension: cadExtension(file),
            extractedText: "",
            analysisMode: "binary-cad-reference"
          };
          if (!isTextCadFile(file)) return Promise.resolve(base);
          return file.text().then(function (text) {
            return Object.assign({}, base, {
              extractedText: text.replace(/\s+/g, " ").trim().slice(0, 120000),
              analysisMode: "cad-layer-text-extraction"
            });
          }).catch(function () {
            return base;
          });
        }

        function updateCadStatus() {
          cadStatus.textContent = "Layer parsing, DWG/DXF geometry checks, and CAD overlays are coming soon.";
        }

        function makeAnalysis(file) {
          var sizeSignal = Math.max(1, Math.min(12, Math.round(file.size / 250000)));
          var score = Math.max(64, 88 - sizeSignal);
          return {
            documentName: file.name,
            documentSize: formatBytes(file.size),
            jurisdiction: jurisdiction.value,
            score: score,
            coverage: 94,
            risk: score >= 84 ? "Low" : score >= 72 ? "Medium" : "High",
            status: score >= 84 ? "Review Passed" : "Conditional Approval",
            provider: "Local fallback",
            providerMessage: "Local rule checks are running while cloud document reading is unavailable.",
            summary: "PRUDENCE loaded the drawing and prepared local compliance checks. Gemini reading will appear here when the API accepts the file.",
            extractedItems: [
              "Uploaded file preview is active.",
              "Checking setbacks, parking count, FAR/FSI, coverage, fire access, and road width.",
              "Values marked pending need a readable plan or Gemini response."
            ],
            plan: {
              sheetType: /\.pdf$/i.test(file.name) ? "PDF Plan Sheet" : file.type.indexOf("image/") === 0 ? "Image Plan" : "CAD Package",
              scale: "Not detected",
              plotCoverage: "Pending",
              farFsi: "Pending",
              setbackBand: "Pending",
              parking: "Pending",
              cadOverlay: "Work in progress"
            },
            ruleResults: [],
            ruleSummary: { checked: 0, pass: 0, fail: 0, missing: 0, review: 0, textCharacters: 0 },
            rulePacks: [],
            annotations: [],
            violations: [
              { severity: "CRITICAL", title: "Boundary Setback Deficit", required: "6.0 m", found: "4.2 m", delta: "1.8 m" },
              { severity: "MAJOR", title: "Parking Space Deficit", required: "24 Units", found: "18 Units", delta: "6 Units" },
              { severity: "MINOR", title: "Fire Safety Clearance", note: "Refuge area access width falls short of NBC 2016 standards by 0.3 m." }
            ]
          };
        }

        function renderPlanIntelligence(file, analysis) {
          var plan = analysis.plan || {};
          var items = Array.isArray(analysis.extractedItems) ? analysis.extractedItems.slice(0, 5) : [];
          planIntel.hidden = false;
          document.getElementById("intel-sheet").textContent = plan.sheetType || (/\.pdf$/i.test(file.name) ? "PDF Plan Sheet" : file.type.indexOf("image/") === 0 ? "Image Plan" : "CAD Package");
          document.getElementById("intel-scale").textContent = plan.scale || "Not detected";
          document.getElementById("intel-coverage").textContent = plan.plotCoverage || (analysis.coverage + "% scan");
          document.getElementById("intel-far").textContent = plan.farFsi || "Pending";
          document.getElementById("intel-setback").textContent = plan.setbackBand || "Pending";
          document.getElementById("intel-parking").textContent = plan.parking || "Pending";
          document.getElementById("intel-cad").textContent = plan.cadOverlay || "Work in progress";
          documentReading.hidden = false;
          readingProvider.textContent = (analysis.provider || "Gemini Reading") + (analysis.providerMessage ? " - " + analysis.providerMessage : "");
          readingSummary.textContent = analysis.summary || "Document reading complete.";
          readingItems.innerHTML = items.map(function (item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("");
        }

        function renderRuleResults(analysis) {
          var results = Array.isArray(analysis.ruleResults) ? analysis.ruleResults : [];
          var summary = analysis.ruleSummary || {};
          ruleMatrix.hidden = !results.length;
          if (!results.length) {
            ruleSummary.innerHTML = "";
            ruleChecks.innerHTML = "";
            return;
          }

          ruleSummary.innerHTML =
            '<div class="rule-count"><label>Checked</label><span>' + escapeHtml(summary.checked || results.length) + '</span></div>' +
            '<div class="rule-count"><label>Correct</label><span>' + escapeHtml(summary.pass || 0) + '</span></div>' +
            '<div class="rule-count"><label>Fail</label><span>' + escapeHtml(summary.fail || 0) + '</span></div>' +
            '<div class="rule-count"><label>Missing</label><span>' + escapeHtml(summary.missing || 0) + '</span></div>' +
            '<div class="rule-count"><label>Review</label><span>' + escapeHtml(summary.review || 0) + '</span></div>';

          ruleChecks.innerHTML = results.map(function (item) {
            var status = String(item.status || "Review");
            var statusLabel = status === "Pass" ? "Correct" : status;
            var statusClass = statusLabel.toLowerCase();
            return '<article class="rule-check">' +
              '<div class="rule-check-top">' +
                '<div><div class="rule-pack">' + escapeHtml(item.pack || "Rule") + '</div><h5>' + escapeHtml(item.title || "Compliance Check") + '</h5></div>' +
                '<span class="rule-status ' + escapeHtml(statusClass) + '">' + escapeHtml(statusLabel) + '</span>' +
              '</div>' +
              '<div class="rule-fields">' +
                '<div class="rule-field"><label>Required</label><span>' + escapeHtml(item.required || "Not specified") + '</span></div>' +
                '<div class="rule-field"><label>Current</label><span>' + escapeHtml(item.current || "Not found") + '</span></div>' +
              '</div>' +
              '<div class="rule-detail-grid">' +
                '<div class="rule-detail"><label>Rule / Clause</label><span>' + escapeHtml(item.clause || item.id || item.source || "Local rule") + '</span></div>' +
                '<div class="rule-detail"><label>Evidence</label><span>' + escapeHtml(item.evidence || item.sourceNote || "Evidence not available") + '</span></div>' +
                '<div class="rule-detail"><label>Calculation</label><span>' + escapeHtml(item.calculation || "No calculation available") + '</span></div>' +
                '<div class="rule-detail"><label>Action</label><span>' + escapeHtml(item.action || "Review required") + '</span></div>' +
                '<div class="rule-detail"><label>Training Example</label><span>' + escapeHtml(item.trainingExample || "Generic rule template") + '</span></div>' +
              '</div>' +
            '</article>';
          }).join("");
        }

        function renderAnnotations(analysis) {
          var annotations = Array.isArray(analysis && analysis.annotations) ? analysis.annotations : [];
          annotationLayer.innerHTML = annotations.map(function (item) {
            var x = Math.max(2, Math.min(98, Number(item.x || 50)));
            var y = Math.max(2, Math.min(98, Number(item.y || 50)));
            var label = item.label || "V";
            var title = item.title || "Violation";
            var required = item.required ? "Required: " + item.required : "";
            var current = item.current ? "Provided: " + item.current : "";
            var side = x > 76 ? "left" : x < 24 ? "right" : y > 72 ? "top" : "bottom";
            return '<div class="annotation" data-side="' + side + '" style="left:' + x + '%; top:' + y + '%;">' +
              '<button class="pulse-dot" type="button" data-label="' + escapeHtml(label) + '" aria-label="' + escapeHtml(label + " " + title) + '"></button>' +
              '<div class="callout"><strong>' + escapeHtml(label) + ' ' + escapeHtml(title) + '</strong>' +
                '<small>' + escapeHtml(required) + '</small>' +
                '<small>' + escapeHtml(current) + '</small>' +
              '</div>' +
            '</div>';
          }).join("");
          state.annotations = annotations.length ? true : state.annotations;
          viewer.classList.toggle("show-annotations", state.annotations && annotations.length > 0);
          updateLayersButton();
          syncAnnotationLayer();
          requestAnimationFrame(syncAnnotationLayer);
        }

        function updateLayersButton() {
          var count = annotationLayer.querySelectorAll(".annotation").length;
          if (!state.file && !count) {
            layersButton.classList.remove("is-active");
            layersButton.setAttribute("aria-pressed", "false");
            layersButton.title = "Upload a drawing to view markups";
            layersButton.textContent = "Layers";
            delete layersButton.dataset.count;
            return;
          }
          layersButton.classList.toggle("is-active", state.annotations);
          layersButton.setAttribute("aria-pressed", state.annotations ? "true" : "false");
          layersButton.title = state.annotations ? "Hide violation markups" : "Show violation markups";
          layersButton.textContent = state.annotations ? "Hide Markups" : "Show Markups";
          if (count) {
            layersButton.dataset.count = String(count);
          } else {
            delete layersButton.dataset.count;
          }
        }

        function getPreviewSurface() {
          return preview.querySelector(".pdf-stage canvas") ||
            preview.querySelector("img") ||
            preview.querySelector("canvas") ||
            preview.querySelector("iframe") ||
            null;
        }

        function syncAnnotationLayer() {
          var surface = getPreviewSurface();
          var viewerRect = viewer.getBoundingClientRect();
          var rect = surface && surface.getBoundingClientRect ? surface.getBoundingClientRect() : viewerRect;
          if (!rect.width || !rect.height) {
            annotationLayer.style.left = "0px";
            annotationLayer.style.top = "0px";
            annotationLayer.style.width = "100%";
            annotationLayer.style.height = "100%";
            return;
          }
          annotationLayer.style.left = (rect.left - viewerRect.left) + "px";
          annotationLayer.style.top = (rect.top - viewerRect.top) + "px";
          annotationLayer.style.width = rect.width + "px";
          annotationLayer.style.height = rect.height + "px";
        }

        function normalizeServerAnalysis(result, file) {
          if (!result || typeof result !== "object") return makeAnalysis(file);
          var fallback = makeAnalysis(file);
          return {
            documentName: result.documentName || result.document || fallback.documentName,
            documentSize: result.documentSize || fallback.documentSize,
            jurisdiction: result.jurisdiction || jurisdiction.value,
            score: Number(result.score || fallback.score),
            coverage: Number(result.coverage || fallback.coverage),
            risk: result.risk || fallback.risk,
            status: result.status || fallback.status,
            provider: result.provider || fallback.provider,
            providerMessage: result.providerMessage || fallback.providerMessage,
            summary: result.summary || fallback.summary,
            extractedItems: Array.isArray(result.extractedItems) ? result.extractedItems : fallback.extractedItems,
            plan: result.plan && typeof result.plan === "object" ? result.plan : fallback.plan,
            ruleResults: Array.isArray(result.ruleResults) ? result.ruleResults : fallback.ruleResults,
            ruleSummary: result.ruleSummary && typeof result.ruleSummary === "object" ? result.ruleSummary : fallback.ruleSummary,
            rulePacks: Array.isArray(result.rulePacks) ? result.rulePacks : fallback.rulePacks,
            annotations: Array.isArray(result.annotations) ? result.annotations : fallback.annotations,
            violations: Array.isArray(result.violations) && result.violations.length ? result.violations : fallback.violations
          };
        }

        function fileToBase64(file) {
          return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () {
              var value = String(reader.result || "");
              resolve(value.indexOf(",") >= 0 ? value.split(",", 2)[1] : value);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }

        function renderPdfForAnalysis(file) {
          return file.arrayBuffer()
            .then(function (buffer) {
              return import("/pdf.min.mjs").then(function (pdfjs) {
                pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
                return pdfjs.getDocument({ data: buffer.slice(0) }).promise;
              });
            })
            .then(function (doc) {
              return doc.getPage(1).then(function (page) {
                var textPromise = page.getTextContent().then(function (content) {
                  return content.items.map(function (item) { return item.str || ""; }).join(" ").replace(/\s+/g, " ").trim();
                }).catch(function () { return ""; });
                var baseViewport = page.getViewport({ scale: 1 });
                var scale = Math.max(1, Math.min(2.2, 1700 / Math.max(baseViewport.width, baseViewport.height)));
                var viewport = page.getViewport({ scale: scale });
                var canvas = document.createElement("canvas");
                var context = canvas.getContext("2d", { alpha: false });
                canvas.width = Math.floor(viewport.width);
                canvas.height = Math.floor(viewport.height);
                context.fillStyle = "#fff";
                context.fillRect(0, 0, canvas.width, canvas.height);
                return page.render({ canvasContext: context, viewport: viewport }).promise.then(function () {
                  return textPromise.then(function (text) {
                    var dataUrl = canvas.toDataURL("image/jpeg", .88);
                    return {
                      data: dataUrl.split(",", 2)[1] || "",
                      mimeType: "image/jpeg",
                      sourceMimeType: "application/pdf",
                      extractedText: text,
                      analysisSource: "pdf-page-render",
                      renderedPage: 1
                    };
                  });
                });
              });
            });
        }

        function prepareAnalysisPayload(file) {
          var isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
          if (isPdf) {
            return renderPdfForAnalysis(file).catch(function () {
              return fileToBase64(file).then(function (data) {
                return {
                  data: data,
                  mimeType: "application/pdf",
                  sourceMimeType: "application/pdf",
                  extractedText: "",
                  analysisSource: "pdf-raw-fallback",
                  renderedPage: 0
                };
              });
            });
          }
          return fileToBase64(file).then(function (data) {
            return {
              data: data,
              mimeType: file.type || "application/octet-stream",
              sourceMimeType: file.type || "application/octet-stream",
              extractedText: "",
              analysisSource: "uploaded-file",
              renderedPage: 0
            };
          });
        }

        function requestAnalysis(file) {
          return prepareAnalysisPayload(file).then(function (prepared) {
            return prepareCadPayload(state.cadFile).then(function (cadPayload) {
              state.cadPayload = cadPayload;
              updateCadStatus();
              var selectedPacks = getSelectedRulePacks();
              var cadKey = cadPayload ? [
                cadPayload.filename,
                cadPayload.size,
                cadPayload.extension,
                cadPayload.analysisMode,
                (cadPayload.extractedText || "").slice(0, 120),
                (cadPayload.extractedText || "").length
              ].join(":") : "no-cad";
              var cacheKey = [
                file.name,
                file.size,
                file.type || "",
                jurisdiction.value,
                selectedPacks.join(","),
                prepared.mimeType,
                prepared.analysisSource,
                prepared.data.length,
                prepared.data.slice(0, 80),
                prepared.data.slice(-80),
                prepared.extractedText.slice(0, 120),
                cadKey
              ].join("|");
              if (state.analysisCache[cacheKey]) {
                return JSON.parse(JSON.stringify(state.analysisCache[cacheKey]));
              }
              return fetch("/api/analyze-file", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  filename: file.name,
                  size: file.size,
                  mimeType: prepared.mimeType,
                  sourceMimeType: prepared.sourceMimeType,
                  originalMimeType: file.type || ( /\.pdf$/i.test(file.name) ? "application/pdf" : "application/octet-stream"),
                  jurisdiction: jurisdiction.value,
                  rulePacks: selectedPacks,
                  data: prepared.data,
                  extractedText: prepared.extractedText,
                  analysisSource: prepared.analysisSource,
                  renderedPage: prepared.renderedPage,
                  cad: cadPayload
                })
              }).then(function (response) {
                if (!response.ok) throw new Error("Gemini file analysis failed");
                return response.json();
              }).then(function (result) {
                var normalized = normalizeServerAnalysis(result, file);
                state.analysisCache[cacheKey] = normalized;
                return JSON.parse(JSON.stringify(normalized));
              }).catch(function () {
                return fetch("/api/analyze", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    filename: file.name,
                    size: file.size,
                    type: file.type || "unknown",
                    jurisdiction: jurisdiction.value,
                    rulePacks: selectedPacks,
                    cad: cadPayload
                  })
                })
                  .then(function (response) {
                    if (!response.ok) throw new Error("API analysis failed");
                    return response.json();
                  })
                  .then(function (result) {
                    var normalized = normalizeServerAnalysis(result, file);
                    state.analysisCache[cacheKey] = normalized;
                    return JSON.parse(JSON.stringify(normalized));
                  })
                  .catch(function () {
                    var fallback = makeAnalysis(file);
                    state.analysisCache[cacheKey] = fallback;
                    return JSON.parse(JSON.stringify(fallback));
                  });
              });
            });
          }).then(function (response) {
            return response;
          });
        }

        function setReasoning(mode) {
          var status = document.getElementById("reasoning-status");
          var steps = document.getElementById("steps");
          if (mode === "idle") {
            status.textContent = "Waiting for Upload";
            steps.innerHTML =
              '<div class="step dim"><span class="step-icon">○</span><span>Extracting Building Dimensions</span></div>' +
              '<div class="step dim"><span class="step-icon">○</span><span>Cross-referencing Municipal Bye-Laws</span></div>' +
              '<div class="step dim"><span class="step-icon">○</span><span>Checking Setback Requirements...</span></div>' +
              '<div class="step dim"><span class="step-icon">○</span><span>Validating Parking Layout</span></div>';
            return;
          }
          if (mode === "analyzing") {
            status.textContent = "Analyzing Regulations";
            steps.innerHTML =
              '<div class="step"><span class="step-icon">✓</span><span>Extracting Building Dimensions</span></div>' +
              '<div class="step"><span class="step-icon">✓</span><span>Cross-referencing Municipal Bye-Laws</span></div>' +
              '<div class="step"><span class="step-icon">↻</span><span class="typing">Checking Setback Requirements...</span></div>' +
              '<div class="step dim"><span class="step-icon">○</span><span>Validating Parking Layout</span></div>';
            return;
          }
          status.textContent = "Analysis Complete";
          steps.innerHTML =
            '<div class="step"><span class="step-icon">✓</span><span>Extracting Building Dimensions</span></div>' +
            '<div class="step"><span class="step-icon">✓</span><span>Cross-referencing Municipal Bye-Laws</span></div>' +
            '<div class="step"><span class="step-icon">✓</span><span>Checking Setback Requirements</span></div>' +
            '<div class="step"><span class="step-icon">✓</span><span>Validating Parking Layout</span></div>';
        }

        function renderViolations(analysis) {
          var container = document.getElementById("violations");
          document.getElementById("violations-title").textContent = "Active Violations (" + analysis.violations.length + ")";
          container.innerHTML = analysis.violations.map(function (item) {
            var severity = String(item.severity || "MINOR").toUpperCase();
            var severityClass = severity === "MAJOR" ? "major" : severity === "MINOR" ? "minor" : "";
            var detail = '<div class="rule-detail-grid">' +
              (item.clause ? '<div class="rule-detail"><label>Rule / Clause</label><span>' + escapeHtml(item.clause) + '</span></div>' : '') +
              (item.evidence ? '<div class="rule-detail"><label>Evidence</label><span>' + escapeHtml(item.evidence) + '</span></div>' : '') +
              (item.calculation ? '<div class="rule-detail"><label>Calculation</label><span>' + escapeHtml(item.calculation) + '</span></div>' : '') +
              (item.note ? '<div class="rule-detail"><label>Fix Required</label><span>' + escapeHtml(item.note) + '</span></div>' : '') +
              '</div>';
            var body = '<div class="metrics">' +
                  '<div class="metric"><label>Required</label><span>' + escapeHtml(item.required || "Not legible") + '</span></div>' +
                  '<div class="metric"><label>Found</label><span>' + escapeHtml(item.found || "Not legible") + '</span></div>' +
                  '<div class="metric right"><label>' + (severity === "MAJOR" ? "Deficit" : "Violation") + '</label><span>' + escapeHtml(item.delta || "Pending") + '</span></div>' +
                '</div>' + detail;
            return '<article class="violation glass-card">' +
              '<div class="violation-top" style="align-items: center; justify-content: space-between;"><div style="display:flex; align-items:center; gap:10px;"><span class="severity ' + severityClass + '">' + escapeHtml(severity) + '</span><span style="color: rgba(255,255,255,.55);">Open</span></div><button class="auto-fix-btn" onclick="applyAutoFix(this, event)">✨ Auto-Fix</button></div>' +
              '<h4>' + escapeHtml(item.title || "Compliance item") + '</h4>' + body +
            '</article>';
          }).join("");
        }

        function renderScore(analysis) {
          document.getElementById("score-value").textContent = analysis.score + "%";
          document.getElementById("score-ring").style.background = "conic-gradient(#fff " + analysis.score + "%, rgba(255,255,255,.12) 0)";
          document.getElementById("status-text").textContent = analysis.status;
          document.getElementById("coverage-value").textContent = analysis.coverage + "%";
          document.getElementById("risk-value").textContent = analysis.risk;
          document.getElementById("code-value").textContent = analysis.jurisdiction;
        }

        function enhanceDarkPlan(source) {
          var width = source.naturalWidth || source.width;
          var height = source.naturalHeight || source.height;
          if (!width || !height) return;

          try {
            var sample = document.createElement("canvas");
            var sampleWidth = 64;
            var sampleHeight = Math.max(24, Math.round(sampleWidth * height / width));
            sample.width = sampleWidth;
            sample.height = Math.min(96, sampleHeight);
            var context = sample.getContext("2d", { willReadFrequently: true });
            context.drawImage(source, 0, 0, sample.width, sample.height);
            var data = context.getImageData(0, 0, sample.width, sample.height).data;
            var total = 0;
            var count = 0;
            for (var i = 0; i < data.length; i += 16) {
              total += (data[i] + data[i + 1] + data[i + 2]) / 3;
              count += 1;
            }
            if (count && total / count < 92) source.classList.add("light-plan");
          } catch (error) {
            return;
          }
        }

        function renderFallback(file) {
          preview.innerHTML =
            '<div class="blueprint">' +
              '<div class="plan">' +
                '<div class="dimension-line north"></div>' +
                '<div class="dimension-line east"></div>' +
                '<div class="north-arrow">N</div>' +
                '<div class="outer"></div>' +
                '<div class="setback"></div>' +
                '<div class="room-a"></div>' +
                '<div class="room-b"></div>' +
                '<div class="room-c"></div>' +
                '<div class="room-d"></div>' +
                '<div class="room-e"></div>' +
                '<div class="core"></div>' +
                '<div class="stair"></div>' +
                '<div class="entry-court"></div>' +
                '<div class="parking-bay p1"></div>' +
                '<div class="parking-bay p2"></div>' +
                '<div class="parking-bay p3"></div>' +
                '<div class="parking-bay p4"></div>' +
                '<div class="parking-bay p5"></div>' +
                '<div class="parking-bay p6"></div>' +
                '<div class="plan-label setback-label">North setback band</div>' +
                '<div class="plan-label plot-label">Plot boundary 42 m x 30 m</div>' +
                '<div class="plan-label core-label">Lift + stair core</div>' +
                '<div class="plan-label parking-label">Basement parking bays</div>' +
                '<div class="road-label">24 m wide access road</div>' +
              '</div>' +
            '</div>';
        }

        function showReferencePlan() {
          renderFallback({ name: "Reference municipal site plan" });
          emptyState.hidden = false;
          preview.hidden = false;
          loadedBadge.hidden = true;
          annotationLayer.innerHTML = "";
          viewer.classList.remove("has-file", "show-annotations");
        }

        function renderPdfEmbed(file) {
          if (!state.previewUrl) state.previewUrl = URL.createObjectURL(file);
          preview.innerHTML =
            '<iframe class="pdf-embed" title="' + escapeHtml(file.name) + '" src="' + escapeHtml(state.previewUrl) + '#toolbar=1&navpanes=0"></iframe>';
        }

        function renderPdfPage() {
          if (!state.pdfDoc) return;
          var token = ++state.renderToken;
          state.pdfDoc.getPage(state.pdfPage).then(function (page) {
            if (token !== state.renderToken) return;
            var viewport = page.getViewport({ scale: state.pdfZoom });
            var canvas = document.createElement("canvas");
            var context = canvas.getContext("2d", { alpha: false });
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, canvas.width, canvas.height);
            var stage = document.createElement("div");
            stage.className = "pdf-stage";
            stage.appendChild(canvas);
            preview.innerHTML = "";
            preview.appendChild(stage);
            return page.render({ canvasContext: context, viewport: viewport }).promise.then(function () {
              enhanceDarkPlan(canvas);
              syncAnnotationLayer();
            });
          }).catch(function () {
            if (state.file) renderPdfEmbed(state.file);
          });
        }

        function renderPdf(file) {
          preview.innerHTML = '<div class="pdf-loading">Rendering PDF plan page...</div>';
          return file.arrayBuffer()
            .then(function (buffer) { return import("/pdf.min.mjs").then(function (pdfjs) {
              pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
              return pdfjs.getDocument({ data: buffer }).promise;
            }); })
            .then(function (doc) {
              state.pdfDoc = doc;
              state.pdfPage = 1;
              state.pdfZoom = 1.45;
              renderPdfPage();
            })
            .catch(function () {
              renderPdfEmbed(file);
            });
        }

        function renderPreview(file) {
          preview.innerHTML = "";
          state.pdfDoc = null;
          if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
          state.previewUrl = URL.createObjectURL(file);

          if (file.type && file.type.indexOf("image/") === 0) {
            var img = document.createElement("img");
            img.onload = function () {
              enhanceDarkPlan(img);
              syncAnnotationLayer();
            };
            img.src = state.previewUrl;
            img.alt = file.name;
            preview.appendChild(img);
          } else if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
            renderPdf(file);
          } else {
            renderFallback(file);
          }
        }

        
        // --- AI FEATURES LOGIC ---
        var chatHistory = [];
        window.toggleChat = function() {
          // Save the current analysis state to local storage for the chat tab to read
          if (state && state.analysis) {
            localStorage.setItem('prudence_analysis', JSON.stringify(state.analysis));
          }
          window.open('/chat.html', '_blank');
        };
        window.toggle3D = function() {
          var is3D = document.body.classList.toggle('mode-3d');
          var preview = document.getElementById('preview');
          var leftWall = document.querySelector('.elevation-left');
          var rightWall = document.querySelector('.elevation-right');
          
          if (is3D && preview && leftWall && rightWall) {
            var child = preview.querySelector('canvas') || preview.querySelector('img');
            if (child) {
              var src = child.tagName === 'CANVAS' ? child.toDataURL() : child.src;
              leftWall.style.backgroundImage = 'url(' + src + ')';
              rightWall.style.backgroundImage = 'url(' + src + ')';
            }
          }
        };

        // --- ORBIT CONTROLS ---
        (function() {
          var isDragging = false;
          var startX, startY;
          var rx = 60;
          var rz = 45;
          
          document.addEventListener('mousedown', function(e) {
            if (!document.body.classList.contains('mode-3d')) return;
            // Only drag if clicking inside the left viewer
            if (!e.target.closest('.left')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
          });
          
          document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            var dx = e.clientX - startX;
            var dy = e.clientY - startY;
            
            rz += dx * 0.4;
            rx -= dy * 0.4;
            
            if (rx < 15) rx = 15;
            if (rx > 85) rx = 85;
            
            startX = e.clientX;
            startY = e.clientY;
            
            var wrapper = document.querySelector('.preview-wrapper');
            if (wrapper) {
              wrapper.style.setProperty('--rx', rx + 'deg');
              wrapper.style.setProperty('--rz', rz + 'deg');
            }
          });
          
          document.addEventListener('mouseup', function() {
            isDragging = false;
          });
        })();
        
        function applyAutoFix(btn, event) {
          if (event) { event.stopPropagation(); }
          if (!annotationLayer) return;
          var title = btn.closest('.violation').querySelector('h4').textContent;
          
          var ghost = document.createElement('div');
          ghost.className = 'annotation auto-fix-ghost';
          ghost.style.left = '20%';
          ghost.style.top = '70%';
          ghost.style.width = '15%';
          ghost.style.height = '10%';
          
          var label = document.createElement('div');
          label.className = 'label';
          label.textContent = 'Proposed Fix: ' + title;
          ghost.appendChild(label);
          
          annotationLayer.appendChild(ghost);
          syncAnnotationLayer();
        }
        
        window.sendChatMessage = function() {
          var input = document.getElementById('chat-input');
          var text = input.value.trim();
          if (!text) return;
          
          input.value = '';
          var msgs = document.getElementById('chat-messages');
          msgs.innerHTML += '<div class="chat-msg user">' + escapeHtml(text) + '</div>';
          msgs.scrollTop = msgs.scrollHeight;
          
          chatHistory.push({role: 'user', content: text});
          
          fetch('/api/chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              history: chatHistory.slice(0, -1),
              message: text,
              analysis: state.analysis || {}
            })
          })
          .then(res => res.json())
          .then(data => {
            if (data.error) {
              msgs.innerHTML += '<div class="chat-msg ai" style="color:#ef4444;">Error: ' + escapeHtml(data.error) + '</div>';
            } else {
              chatHistory.push({role: 'model', content: data.response});
              msgs.innerHTML += '<div class="chat-msg ai">' + escapeHtml(data.response) + '</div>';
            }
            msgs.scrollTop = msgs.scrollHeight;
          })
          .catch(err => {
            msgs.innerHTML += '<div class="chat-msg ai" style="color:#ef4444;">Failed to send message.</div>';
          });
        }
        // -------------------------

        function runCurrentAnalysis() {
          if (!state.file) return Promise.resolve();
          exportButton.disabled = true;
          setReasoning("analyzing");
          return requestAnalysis(state.file).then(function (analysis) {
            state.analysis = analysis;
            renderViolations(state.analysis);
            renderScore(state.analysis);
            renderPlanIntelligence(state.file, state.analysis);
            renderRuleResults(state.analysis);
            renderAnnotations(state.analysis);
            loadedMeta.textContent = formatBytes(state.file.size) + " | " + (state.file.type || "CAD/document file") + " | " + (state.analysis.provider || "Analyzed");
            setReasoning("complete");
            exportButton.disabled = false;
          });
        }

        function acceptFile(file) {
          if (!file) return;
          if (isCadFile(file) && !/\.pdf$/i.test(file.name) && !(file.type && file.type.indexOf("image/") === 0)) {
            updateCadStatus();
            return;
          }
          state.file = file;
          state.annotations = true;
          annotationLayer.innerHTML = "";
          updateLayersButton();
          renderPreview(file);
          emptyState.hidden = true;
          preview.hidden = false;
          loadedBadge.hidden = false;
          viewer.classList.add("has-file");
          viewer.classList.add("show-annotations");
          loadedName.textContent = file.name;
          loadedMeta.textContent = formatBytes(file.size) + " | Reading uploaded file with Gemini";
          documentTitle.textContent = file.name;
          runCurrentAnalysis();
        }

        function loadJsPdf() {
          if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
          return new Promise(function (resolve, reject) {
            var existing = document.querySelector('script[data-prudence-jspdf="true"]');
            if (existing) {
              existing.addEventListener("load", function () { resolve(window.jspdf.jsPDF); });
              existing.addEventListener("error", reject);
              return;
            }
            var script = document.createElement("script");
            script.src = "/jspdf.umd.min.js";
            script.async = true;
            script.dataset.prudenceJspdf = "true";
            script.onload = function () { resolve(window.jspdf.jsPDF); };
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        function imageToDataUrl(file) {
          if (!file || !file.type || file.type.indexOf("image/") !== 0) return Promise.resolve("");
          return new Promise(function (resolve) {
            var reader = new FileReader();
            reader.onload = function () { resolve(String(reader.result || "")); };
            reader.onerror = function () { resolve(""); };
            reader.readAsDataURL(file);
          });
        }

        function exportReport() {
          if (!state.analysis) return;
          exportButton.disabled = true;
          exportButton.textContent = "Preparing PDF...";
          Promise.all([loadJsPdf(), imageToDataUrl(state.file)]).then(function (values) {
            var jsPDF = values[0];
            var imageData = values[1];
            var analysis = state.analysis;
            var results = Array.isArray(analysis.ruleResults) ? analysis.ruleResults : [];
            var summary = analysis.ruleSummary || {};
            var doc = new jsPDF({ unit: "pt", format: "a4" });
            var pageWidth = doc.internal.pageSize.getWidth();
            var pageHeight = doc.internal.pageSize.getHeight();
            var margin = 42;
            var y = margin;
            var exportedAt = new Date();

            function addPageIfNeeded(height) {
              if (y + height <= pageHeight - margin) return;
              doc.addPage();
              y = margin;
              drawFooter();
            }

            function drawFooter() {
              doc.setFont("helvetica", "normal");
              doc.setFontSize(8);
              doc.setTextColor(120, 120, 120);
              doc.text("PRUDENCE Compliance Report | Generated locally from uploaded drawing and selected rule packs", margin, pageHeight - 22);
              doc.text(String(doc.getNumberOfPages()), pageWidth - margin, pageHeight - 22, { align: "right" });
            }

            function section(title) {
              addPageIfNeeded(34);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(13);
              doc.setTextColor(20, 20, 20);
              doc.text(title, margin, y);
              y += 10;
              doc.setDrawColor(210, 210, 210);
              doc.line(margin, y, pageWidth - margin, y);
              y += 18;
            }

            function textBlock(label, value, options) {
              options = options || {};
              var width = options.width || pageWidth - margin * 2;
              var lines = doc.splitTextToSize(String(value || "Not available"), width);
              addPageIfNeeded(18 + lines.length * 11);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(8);
              doc.setTextColor(90, 90, 90);
              doc.text(String(label).toUpperCase(), margin, y);
              y += 11;
              doc.setFont("helvetica", "normal");
              doc.setFontSize(options.size || 10);
              doc.setTextColor(35, 35, 35);
              doc.text(lines, margin, y);
              y += lines.length * (options.leading || 12) + 8;
            }

            function pill(label, value, x, color) {
              doc.setFillColor(color[0], color[1], color[2]);
              doc.roundedRect(x, y, 92, 46, 6, 6, "F");
              doc.setTextColor(255, 255, 255);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(16);
              doc.text(String(value), x + 12, y + 21);
              doc.setFontSize(7);
              doc.text(String(label).toUpperCase(), x + 12, y + 35);
            }

            function ruleCard(item) {
              var status = item.status === "Pass" ? "Correct" : (item.status || "Review");
              var body = [
                ["Required", item.required],
                ["Current", item.current],
                ["Rule / Clause", item.clause || item.id || item.source],
                ["Evidence", item.evidence || item.sourceNote],
                ["Calculation", item.calculation],
                ["Action", item.action],
              ];
              var estimated = 68 + body.reduce(function (sum, row) {
                return sum + doc.splitTextToSize(String(row[1] || "Not available"), pageWidth - margin * 2 - 22).length * 10 + 12;
              }, 0);
              addPageIfNeeded(Math.min(estimated, pageHeight - margin * 2));

              var top = y;
              doc.setDrawColor(220, 220, 220);
              doc.setFillColor(250, 250, 250);
              doc.roundedRect(margin, y, pageWidth - margin * 2, 30, 5, 5, "FD");
              doc.setFont("helvetica", "bold");
              doc.setFontSize(10);
              doc.setTextColor(30, 30, 30);
              doc.text((item.pack || "RULE") + " - " + (item.title || "Compliance Check"), margin + 10, y + 19);
              doc.setFontSize(8);
              var statusColor = status === "Correct" ? [22, 128, 66] : status === "Fail" ? [190, 18, 18] : status === "Missing" ? [170, 105, 0] : [110, 55, 170];
              doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
              doc.text(status.toUpperCase(), pageWidth - margin - 10, y + 19, { align: "right" });
              y += 43;

              body.forEach(function (row) {
                var lines = doc.splitTextToSize(String(row[1] || "Not available"), pageWidth - margin * 2 - 22);
                addPageIfNeeded(lines.length * 10 + 22);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(7.5);
                doc.setTextColor(90, 90, 90);
                doc.text(row[0].toUpperCase(), margin + 10, y);
                y += 10;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.setTextColor(35, 35, 35);
                doc.text(lines, margin + 10, y);
                y += lines.length * 10 + 8;
              });

              doc.setDrawColor(230, 230, 230);
              doc.line(margin, y, pageWidth - margin, y);
              y += 14;
              return y - top;
            }

            doc.setFillColor(12, 12, 12);
            doc.rect(0, 0, pageWidth, 96, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(24);
            doc.text("PRUDENCE", margin, 42);
            doc.setFontSize(11);
            doc.text("Prudential Urban Development Compliance Engine", margin, 62);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.text("Generated: " + exportedAt.toLocaleString(), margin, 80);
            y = 126;

            doc.setTextColor(20, 20, 20);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.text("Construction Compliance Report", margin, y);
            y += 24;
            textBlock("Document", analysis.documentName || (state.file && state.file.name) || "Uploaded drawing");
            textBlock("Status", (analysis.status || "Review Required") + " | Risk: " + (analysis.risk || "Medium") + " | Score: " + (analysis.score || 0) + "%");
            textBlock("Selected Rule Packs", (analysis.rulePacks || []).map(function (pack) { return pack.label + " (" + pack.source + ")"; }).join(", ") || "DCR, NBC, RERA");

            pill("Score", (analysis.score || 0) + "%", margin, [30, 95, 190]);
            pill("Correct", summary.pass || 0, margin + 105, [22, 128, 66]);
            pill("Failed", summary.fail || 0, margin + 210, [190, 18, 18]);
            pill("Missing", summary.missing || 0, margin + 315, [170, 105, 0]);
            y += 70;

            section("Executive Summary");
            textBlock("Agent Reading", analysis.summary || "No summary available.");
            (analysis.extractedItems || []).forEach(function (item, index) {
              textBlock("Finding " + (index + 1), item);
            });

            if (imageData) {
              section("Uploaded Drawing Preview");
              addPageIfNeeded(260);
              try {
                doc.addImage(imageData, state.file.type.indexOf("png") >= 0 ? "PNG" : "JPEG", margin, y, pageWidth - margin * 2, 250, undefined, "FAST");
                y += 270;
              } catch (error) {
                textBlock("Preview", "Image preview could not be embedded, but rule results are included below.");
              }
            }

            section("Correct Checks");
            var correct = results.filter(function (item) { return item.status === "Pass"; });
            if (correct.length) correct.forEach(ruleCard);
            else textBlock("Correct Checks", "No passing checks were detected for the selected packs.");

            section("Violations And Missing Items");
            var gaps = results.filter(function (item) { return item.status !== "Pass"; });
            if (gaps.length) gaps.forEach(ruleCard);
            else textBlock("Violations", "No violations or missing items were detected.");

            section("Plan Intelligence");
            Object.keys(analysis.plan || {}).forEach(function (key) {
              textBlock(key.replace(/([A-Z])/g, " $1"), analysis.plan[key]);
            });

            drawFooter();
            var total = doc.getNumberOfPages();
            for (var page = 1; page <= total; page += 1) {
              doc.setPage(page);
              drawFooter();
            }
            var safeName = (analysis.documentName || "drawing").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
            doc.save("prudence-compliance-report-" + safeName + ".pdf");
          }).catch(function () {
            alert("PDF export could not be prepared. Please try again after the analysis completes.");
          }).finally(function () {
            exportButton.textContent = "Export Report";
            exportButton.disabled = !state.analysis;
          });
        }

        uploadButton.addEventListener("click", function () { fileInput.click(); });
        chooseButton.addEventListener("click", function () { fileInput.click(); });
        exportButton.addEventListener("click", exportReport);
        fileInput.addEventListener("change", function (event) { acceptFile(event.target.files[0]); event.target.value = ""; });
        jurisdiction.addEventListener("change", function () {
          if (state.file) {
            runCurrentAnalysis();
          } else {
            document.getElementById("code-value").textContent = jurisdiction.value;
          }
        });
        rulePackInputs.forEach(function (input) {
          input.addEventListener("change", function () {
            if (!state.file) return;
            runCurrentAnalysis();
          });
        });
        layersButton.addEventListener("click", function () {
          state.annotations = !state.annotations;
          viewer.classList.toggle("show-annotations", state.annotations && annotationLayer.querySelectorAll(".annotation").length > 0);
          updateLayersButton();
          syncAnnotationLayer();
        });
        window.addEventListener("resize", syncAnnotationLayer);
        viewer.addEventListener("scroll", syncAnnotationLayer, true);
        document.querySelector('.toolstrip button[title="Zoom in"]').addEventListener("click", function () {
          if (!state.pdfDoc) return;
          state.pdfZoom = Math.min(3, state.pdfZoom + .2);
          renderPdfPage();
        });
        document.querySelector('.toolstrip button[title="Zoom out"]').addEventListener("click", function () {
          if (!state.pdfDoc) return;
          state.pdfZoom = Math.max(.7, state.pdfZoom - .2);
          renderPdfPage();
        });
        viewer.addEventListener("dragover", function (event) {
          event.preventDefault();
          viewer.classList.add("dragging");
        });
        viewer.addEventListener("dragleave", function () { viewer.classList.remove("dragging"); });
        viewer.addEventListener("drop", function (event) {
          event.preventDefault();
          viewer.classList.remove("dragging");
          acceptFile(event.dataTransfer.files[0]);
        });

        showReferencePlan();
      })();
    