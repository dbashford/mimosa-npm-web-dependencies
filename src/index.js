"use strict";

var fs = require( "fs" )
  , path = require( "path" )
  , moduleConfig = require( "./config" )
  , logger;

var _outputFile = function( pack ) {
  return path.join( pack.outputFolder, path.basename( pack.outputFolder ) + ".js" );
};

var _cachePath = function( mimosaConfig ) {
  return path.join( mimosaConfig.root, ".mimosa", "npmWebDependencies", "package-cache.json" );
};

// make directory if it needs making
var _makeDirectory = function( forFile ) {
  if ( !fs.existsSync( forFile ) ) {
    var wrench = require( "wrench" );
    wrench.mkdirSyncRecursive( path.dirname( forFile ), "0777" );
  }
};

// writes cache file
var _writeCache = function( mimosaConfig ) {
  var cachePath = _cachePath( mimosaConfig );
  var cacheStr = JSON.stringify( mimosaConfig.npmWeb.packageJSONDeps );
  _makeDirectory( cachePath );
  fs.writeFileSync( cachePath, cacheStr );
};

// writes output, provides proper success message
// calls to make directory if needed
var _writeFile = function( pack, text, isBrowserify ) {
  var outputFile = _outputFile( pack );
  _makeDirectory( outputFile );
  fs.writeFileSync( outputFile, text );
  if ( isBrowserify ) {
    logger.info( "npm-web-dependencies created browserified package [[ " + outputFile + " ]]" );
  } else {
    logger.info( "npm-web-dependencies created single file module [[ " + outputFile + " ]]" );
  }
};

// creates single file output for main file
// from package .son
var _browserifyModule = function( pack, done ) {
  var browserify = require( "browserify" )
    , derequire = require( "derequire" )
    ;

  var b = browserify( {standalone: path.basename( pack.mainFile ).toUpperCase()} );
  b.add( pack.mainFile );
  b.bundle( function( err, buf ) {
    if ( err ) {
      logger.error( "Failed browserifying [[ " + pack.mainFile + " ]], Error:\n" + err );
    } else {

      // derequire the code to avoid any bundling issues down the road
      // consider pulling out if a derequire module is introduced
      var code = derequire( buf.toString(), [{
          from: "require",
          to: "_dereq_"
        }, {
          from: "define",
          to: "_defi_"
        }]
      );

      _writeFile( pack, code, true );
    }
    done();
  });
};

var _process = function ( mimosaConfig, next ) {

  // return if no packages to install
  if ( mimosaConfig.npmWeb.resolvedPackages.length === 0 ) {
    if ( next ) {
      next();
    }
    return;
  }

  logger.info( "Starting NPM web install..." );

  // handle async
  var i = 0;
  var done = function() {
    if ( ++i === mimosaConfig.npmWeb.resolvedPackages.length ) {
      // installs performed, need to cache details
      _writeCache( mimosaConfig );
      if ( next ) {
        next();
      }
    }
  };

  var detective = require( "detective" );
  mimosaConfig.npmWeb.resolvedPackages.forEach( function( pack ) {

    // diagnose if file has dependencies
    var mainText = fs.readFileSync( pack.mainFile, "utf8" );
    var requires = detective( mainText );

    // if it doesn't require anything, just need to copy file
    // to output directory
    if ( !requires.length ) {
      _writeFile( pack, mainText );
      done();
    } else {
      // it has a depedency tree, so browserify it
      _browserifyModule( pack, done );
    }
  });
};

// loads JSON deps out of cache file
var _loadCachedJSONDeps = function( mimosaConfig ) {
  var cachePath = _cachePath( mimosaConfig );
  var cacheJSON;
  if ( !fs.existsSync( cachePath ) ) {
    // no cache, so install needed
    return null;
  } else {
    try {
      cacheJSON = require( cachePath );
    } catch ( err ) {
      logger.error( "npm-web-dependencies: Error reading package.json cache", err);
      // possible bad format file
      return null;
    }
  }

  return cacheJSON;
};

// loads projects package json dependencies into the mimosaconfig
var _loadPackageJSONDeps = function( mimosaConfig ) {
  // would fail validation if package.json was not there or not valid
  var packageJSON = require( path.join( mimosaConfig.root, "package.json" ) );
  mimosaConfig.npmWeb.packageJSONDeps = {};
  ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"].forEach( function( deps ) {
    if ( packageJSON[deps] ) {
      // place json deps in mimosaconfig for future reference
      mimosaConfig.npmWeb.packageJSONDeps[deps] = packageJSON[deps];
    }
  });
};

// compares cached package.json dependencies vs
// current package.json dependencies
var _determineIfInstall = function( mimosaConfig ) {
  _loadPackageJSONDeps( mimosaConfig );

  var cacheJSON = _loadCachedJSONDeps( mimosaConfig );
  if ( !cacheJSON ) {
    return true;
  }

  if ( JSON.stringify( mimosaConfig.npmWeb.packageJSONDeps ) ===
       JSON.stringify( cacheJSON ) ) {
    // cache same as current, do not perform install
    return false;
  }

  return true;
};

var _lifecycleInstall = function( mimosaConfig, options, next ) {
  var shouldInstall = _determineIfInstall( mimosaConfig );
  if ( shouldInstall ) {
    _process( mimosaConfig, next );
  } else {
    next();
  }
};

var registerCommand = function ( program, _logger, retrieveConfig ) {
  logger = _logger;
  program
    .command( "npmweb" )
    .option("-P, --profile <profileName>", "select a mimosa profile")
    .description( "Pull your NPM-managed web dependencies into your app" )
    .action( function( opts ){
      opts.buildFirst = false;
      retrieveConfig( opts, function( mimosaConfig ) {
        _loadPackageJSONDeps( mimosaConfig );
        _process( mimosaConfig );
      });
    });
};

var registration = function (mimosaConfig, register) {
  logger = mimosaConfig.log;
  register( ["preBuild"], "init", _lifecycleInstall );
};

module.exports = {
  registration: registration,
  registerCommand: registerCommand,
  defaults: moduleConfig.defaults,
  validate: moduleConfig.validate
};
