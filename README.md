mimosa-npm-web-dependencies
===========

## Overview

This module will take modules you have installed via NPM and install then into Mimosa's vendor directories for use in your web application.

For more information regarding Mimosa, see http://mimosa.io

## Usage

Add `'npm-web-dependencies'` to your list of `modules`.  That's all!  Mimosa will install the module for you when you start `mimosa watch` or `mimosa build`.

## Functionality

When `mimosa watch` and `mimosa build` starts (also for `npmweb` command, see below), this module looks at the `package.json` files for the modules you have indicated you would like to be injected.  Inside the `package.json` it expects to find a `main` property.

If the `main` file has no dependencies, like with, for instance, jquery (it is already bundled), then that file is copied into `vendor.javascripts` directory inside a folder named for the module.

Note: This module does NOT install your NPM dependencies for you. NPM does a great job of that.

### Command: `mimosa npmweb`

This module adds a new command, `mimosa npmweb`, to your project.  When executed, the `npmweb` command will inject NPM installed libraries into your web application's vendor directories.  The `npmweb` command ignores any cache and installs libraries whether they have changed or not.

### Using browserify

If the `main` file has dependencies on other files, this module will [Browserify](http://browserify.org/) the library and insert the single file in the `vendor.javascripts` directory inside a folder named for the module.  So, if installing, for instance, [Chai](https://github.com/chaijs/chai), a bundled `chai.js` would be placed in `vendor.javascripts` in a `chai` folder.

### `package.json` cache

After a successful install, this module will update a cache file in the `.mimosa/npmWebDependencies` folder.  This cache prevents repeated unnecessary installs.  The cache tracks the `package.json` dependencies from the last time an install occurred.

## Default Config

```javascript
npmWeb: {
  modules: []
}
```

#### `modules` array of strings
An array of strings representing the modules you would like to install. The string should correspond to the name of a NPM installed module in your project.  For each `module` string, there should be a `node_modules` folder.

## Example Config

```javascript
npmWeb: {
  modules: ["chai", "jquery", "when"]
}
```