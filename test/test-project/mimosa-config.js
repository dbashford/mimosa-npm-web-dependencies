exports.config = {
  "modules": [
    "copy",
    "jshint",
    "csslint",
    "require",
    "minify-js",
    "minify-css",
    "bower",
    "npm-web-dependencies"
  ],
  "server": {
    "views": {
      "compileWith": "html",
      "extension": "html"
    }
  },
  npmWeb: {
    modules: ["chai", "jquery", "when"]
  }
}