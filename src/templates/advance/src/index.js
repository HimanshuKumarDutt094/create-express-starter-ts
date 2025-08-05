"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var env_js_1 = require("@/utils/env.js");
var health_routes_js_1 = require("@/api/v1/routes/health.routes.js");
var user_route_js_1 = require("@/api/v1/routes/user.route.js");
require("./zod-extend.js");
var app = (0, express_1.default)();
// Middleware to parse JSON bodies
app.use(express_1.default.json());
// API V1 Routes
app.use("/api/v1", health_routes_js_1.default);
app.use("/api/v1/users", user_route_js_1.default);
var PORT = env_js_1.env.PORT;
app.listen(PORT, function () {
    console.log("Server is running on http://localhost:".concat(PORT));
});
exports.default = app;
