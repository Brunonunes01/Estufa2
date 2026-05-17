"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onPlantioWrite = exports.onTarefaWrite = exports.onColheitaWrite = exports.onDespesaWrite = exports.onVendaWrite = void 0;
const app_1 = require("firebase-admin/app");
const dashboardSummary_1 = require("./dashboardSummary");
Object.defineProperty(exports, "onVendaWrite", { enumerable: true, get: function () { return dashboardSummary_1.onVendaWrite; } });
Object.defineProperty(exports, "onDespesaWrite", { enumerable: true, get: function () { return dashboardSummary_1.onDespesaWrite; } });
Object.defineProperty(exports, "onColheitaWrite", { enumerable: true, get: function () { return dashboardSummary_1.onColheitaWrite; } });
Object.defineProperty(exports, "onTarefaWrite", { enumerable: true, get: function () { return dashboardSummary_1.onTarefaWrite; } });
Object.defineProperty(exports, "onPlantioWrite", { enumerable: true, get: function () { return dashboardSummary_1.onPlantioWrite; } });
(0, app_1.initializeApp)();
//# sourceMappingURL=index.js.map