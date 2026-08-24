// Headless driver for test/index.html.
//
// Upstream drove this harness on real browsers through TestSwarm, which CI cannot
// reach, so nothing in the repo runs the unit tests unattended. This script opens
// the same page in PhantomJS, hooks QUnit's testDone/done callbacks and reports
// every test, exiting non-zero when any assertion fails.
//
// Usage: phantomjs test/qunit-runner.js <url>
var page = require( "webpage" ).create(),
	system = require( "system" ),
	url = system.args[ 1 ],
	tests = { passed: 0, failed: 0 },
	failures = [],
	finished = false;

page.onConsoleMessage = function( msg ) {
	console.log( msg );
};

page.onCallback = function( data ) {
	var i;

	if ( data.event === "testDone" ) {
		if ( data.failed > 0 ) {
			tests.failed++;
			failures.push( data.module + ": " + data.name +
				" (" + data.failed + "/" + data.total + " assertions failed)" );
			console.log( "not ok  " + data.module + ": " + data.name );
		} else {
			tests.passed++;
			console.log( "ok      " + data.module + ": " + data.name );
		}
	} else if ( data.event === "done" ) {
		finished = true;
		console.log( "" );
		console.log( "QUnit assertions: " + data.passed + " passed, " +
			data.failed + " failed, " + data.total + " total" );
		console.log( "QUnit tests: " + tests.passed + " passed, " +
			tests.failed + " failed" );
		for ( i = 0; i < failures.length; i++ ) {
			console.log( "FAILED: " + failures[ i ] );
		}
		phantom.exit( data.failed > 0 ? 1 : 0 );
	}
};

// QUnit only exists once the page's own scripts have run, so poll for it.
page.onInitialized = function() {
	page.evaluate( function() {
		var waiting = setInterval( function() {
			if ( window.QUnit && window.QUnit.testDone && window.QUnit.done ) {
				clearInterval( waiting );
				window.QUnit.testDone( function( d ) {
					window.callPhantom( { event: "testDone", module: d.module,
						name: d.name, failed: d.failed, passed: d.passed,
						total: d.total } );
				} );
				window.QUnit.done( function( d ) {
					window.callPhantom( { event: "done", passed: d.passed,
						failed: d.failed, total: d.total, runtime: d.runtime } );
				} );
			}
		}, 50 );
	} );
};

page.open( url, function( status ) {
	if ( status !== "success" ) {
		console.log( "could not open " + url );
		phantom.exit( 2 );
	}
} );

setTimeout( function() {
	if ( !finished ) {
		console.log( "TIMEOUT: QUnit never reported done for " + url );
		phantom.exit( 3 );
	}
}, 600000 );
