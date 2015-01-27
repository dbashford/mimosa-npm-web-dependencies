"use strict";

var path = require( "path" )
  , fs = require( "fs" )
  ;

exports.defaults = function() {
  return {
    npmWeb: {
      modules: []
    }
  };
};

exports.validate = function ( config, validators ) {
  var errors = []
    , npm = config.npmWeb;

  if ( validators.ifExistsIsObject(errors, "npmWeb config", npm ) ) {
    if (!npm.modules) {
      npm.modules = [];
    }

    validators.isArrayOfStrings( errors, "npmWeb.modules", npm.modules);
  }

  if ( !errors.length ) {
    npm.resolvedPackages = [];

    for ( var i = 0; i < npm.modules.length; i++ ) {
      var modulePath = path.join( config.root, "node_modules", npm.modules[i] );
      var moduleExists = fs.existsSync( modulePath );
      if ( moduleExists ) {
        var packageJSONPath = path.join( modulePath, "package.json" );
        try {
          var packageJSON = require( packageJSONPath );
        } catch ( err ) {
          errors.push( "Could not read/parse package.json at [[ " + packageJSONPath + " ]]");
          continue;
        }

        var main = packageJSON.main;
        if ( !main ) {
          errors.push( "Package [[ " + npm.modules[i] + " ]] has no main property in its package.json" );
        } else {
          var moduleMain = path.join( modulePath, main );
          if (path.extname(moduleMain) === "") {
            moduleMain += ".js";
          }
          var outputFolder = path.join( config.vendor.javascripts, npm.modules[i] );
          npm.resolvedPackages.push({
            outputFolder: outputFolder,
            mainFile: moduleMain
          });
        }
      } else {
        errors.push( "Module [[ " + npm.modules[i] + " ]] cannot be found at [[ " + modulePath + " ]]");
      }
    }
  }

  return errors;
};
