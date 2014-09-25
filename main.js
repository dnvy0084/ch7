
function extend( Super, Child )
{
	for( var s in Super.prototype )
	{
		Child.prototype[s] = Super.prototype[s];
	}
}

var EventDispatcher = function()
{
	this.map = {};
}

EventDispatcher.prototype = 
{
	addEventListener: function( type, listener, scope )
	{
		// { type: [ listener, listener, list ...... ],
		//   enterframe: [ list .... .] }

		if( !this.hasEventListener( type ) )
			this.map[ type ] = [];

		var index = this.indexOf( type, listener );

		if( index > -1 ) return;

		this.map[ type ].push( { listener: listener, scope: scope } );
	},

	removeEventListener: function( type, listener )
	{
		var index = this.indexOf( type, listener );

		if( index == -1 ) return;

		this.map[ type ].splice( index, 1 );
	},

	hasEventListener: function( type )
	{
		return this.map[ type ] != undefined && this.map[ type ].length > 0;
	},

	dispatchEvent: function( event )
	{
		//{ type: "test", args: 1234 }; 

		var arr = this.map[ event.type ];

		if( arr == undefined ) return;

		event.target = this;

		for( var i = 0; i < arr.length; i++ )
		{
			// { listener: listener, scope: scope };
			arr[ i ].listener.apply( arr[i].scope, [event] );
		}
	},

	indexOf: function( type, listener )
	{
		if( !this.hasEventListener( type ) ) return -1;

		for( var i = 0; i < this.map[ type ].length; i++ )
		{
			if( this.map[ type ][i].listener == listener )
				return i;
		}

		return -1;
	}
}


var Stage = function( canvas )
{	
	EventDispatcher.apply( this, [] );

	this.canvas = canvas;
	this.context = canvas.getContext( "2d" );
	this.children = [];

	this.reqId = requestAnimationFrame( this.update.bind( this ) );

	this.__defineGetter__( 
		"stageWidth", 
		function(){ return this.context.canvas.width } );

	this.__defineGetter__(
		"stageHeight",
		function(){ return this.context.canvas.height } );

	this.init();
}

Stage.prototype = 
{
	init: function()
	{
		this.offScreen = document.createElement( "canvas" );
		this.offScreen.width = this.stageWidth;
		this.offScreen.height = this.stageHeight;

		this.offContext = this.offScreen.getContext( "2d" );

		//document.body.appendChild( this.offScreen );

		this.dict = {};

		this.hexCount = 0;
		this.initEvents();

		this.current = null;
	},

	initEvents: function()
	{
		this.canvas.addEventListener( "mousemove", this.onMouseMove.bind( this ) );
		this.canvas.addEventListener( "mousedown", this.onMouseDown.bind( this ) );
		this.canvas.addEventListener( "mouseup", this.onMouseUp.bind( this ) );
	},

	onMouseDown: function( e )
	{
		var hit = this.getMouseHitObject( e.offsetX, e.offsetY );

		this.dispatchEvent( { type: "mousedown", x: e.offsetX, y: e.offsetY } );

		if( hit )
		{
			hit.dispatchEvent( { type: "mousedown", x: e.offsetX, y: e.offsetY } );
		}
	},

	onMouseUp: function( e )
	{
		var hit = this.getMouseHitObject( e.offsetX, e.offsetY );

		this.dispatchEvent( { type: "mouseup", x: e.offsetX, y: e.offsetY } );

		if( hit )
		{
			hit.dispatchEvent( { type: "mouseup", x: e.offsetX, y: e.offsetY } );
		}
	},

	getMouseHitObject: function( x, y )
	{
		var data = this.offContext.getImageData( x, y, 1, 1 ).data;

		if( data[3] == 0 ) return null;

		var color = data[0] << 16 | data[1] << 8 | data[2];

		return this.dict[ toHex( color ) ];;
	},

	onMouseMove: function( e )
	{
		// [ r, g, b, a ];
		var data = this.offContext.getImageData( e.offsetX, e.offsetY, 1, 1 ).data;

		this.dispatchEvent( { type: "mousemove", x: e.offsetX, y: e.offsetY } );

		if( data[3] == 0 )
		{
			if( this.current != null )
			{
				this.current.dispatchEvent( { type: "mouseout", x: e.offsetX, y: e.offsetY } );
			}

			this.current = null;
			this.canvas.style.cursor = "";
			return;
		}

		var color = data[0] << 16 | data[1] << 8 | data[2];
		var child = this.dict[ toHex( color ) ];

		if( child == null ) return;

		if( this.current != child )
		{
			if( this.current != null )
			{
				this.current.dispatchEvent( { type: "mouseout", x: e.offsetX, y: e.offsetY } );
			}

			child.dispatchEvent( { type: "mouseover", x: e.offsetX, y: e.offsetY } );
			this.current = child;

			this.canvas.style.cursor = "pointer";
		}

		child.dispatchEvent( { type: "mousemove", x: e.offsetX, y: e.offsetY } );
	},

	addChild: function( child )
	{
		if( this.contains( child ) )
			this.removeChild( child );

		this.children.push( child );
		child.stage = this;

		child.$hex = toHex( this.hexCount );
		this.dict[ child.$hex ] = child;

		this.hexCount += 100;

		if( this.hexCount > 4294967295 )
			this.hexCount = 0;
	},

	removeChild: function( child )
	{
		var index = this.children.indexOf( child );

		if( index == -1 ) return;

		this.children.splice( index, 1 )[0].stage = null;
	},

	contains: function( child )
	{
		return this.children.indexOf( child ) > -1;
	},

	update: function( ms )
	{
		this.context.clearRect( 
			0, 0, this.context.canvas.width, this.context.canvas.height );

		this.offContext.clearRect(
			0, 0, this.context.canvas.width, this.context.canvas.height );

		for( var i = 0; i < this.children.length; i++ )
		{
			this.children[i].dispatchEvent( { type: "enterframe" } );

			this.context.save();

			this.children[i].draw( this.context );

			this.context.restore();

			if( this.children[i].mouseEnabled )
			{
				this.offContext.save();
				this.children[i].drawPath( this.offContext );
				this.offContext.fillStyle = this.children[i].$hex;
				this.offContext.fill();
				this.offContext.restore();
			}
		}

		this.reqId = requestAnimationFrame( this.update.bind( this ) );
	}
}

extend( EventDispatcher, Stage );


function toHex( value )
{
	// ff -> 0000ff;
	return "#" + prefix( "0", parseInt( value ).toString( 16 ), 6 );
}

function prefix( char, value, digit )
{
	if( value.toString().length >= digit ) return value;

	return prefix( char, char + value, digit );
}



var RAD = 1 * Math.PI / 180;

var Circle = function( radius, fillStyle )
{
	EventDispatcher.apply( this, [] );

	this.x = 0;
	this.y = 0;

	this.scaleX = 1;
	this.scaleY = 1;

	this.vx = this.vy = 0;

	this.radius = radius;
	this.fillStyle = fillStyle;

	this.mouseEnabled = true;
}

Circle.prototype = 
{
	draw: function( context )
	{
		context.translate( this.x, this.y );
		context.scale( this.scaleX, this.scaleY );

		context.fillStyle = this.fillStyle;
		context.beginPath();
		context.arc( 0, 0, this.radius, 0, 360 * RAD );
		context.fill();
	},

	drawPath: function( context )
	{
		context.translate( this.x, this.y );
		context.scale( this.scaleX, this.scaleY );

		context.beginPath();
		context.arc( 0, 0, this.radius, 0, 360 * RAD );
	},

	onEnter: function( e )
	{
		this.x += this.vx;
		this.y += this.vy;

		this.vy += 0.15;
	},

	fire: function( v )
	{
		this.vx = vx;
		this.vy = vy;

		this.addEventListener( "enterframe", this.onEnter, this );
	}
}

extend( EventDispatcher, Circle );






var Point = function( x, y )
{
	this.x = x;
	this.y = y;

	this.__defineGetter__( "length", 
		function()
		{
			return Math.sqrt( this.x * this.x + this.y * this.y );
		}
	);
}

Point.prototype = 
{
	add: function( p )
	{
		return new Point( this.x + p.x, this.y + p.y );
	},

	substract: function( p )
	{
		return new Point( this.x - p.x, this.y - p.y );
	},

	dot: function( p )
	{
		return this.x * p.x + this.y * p.y;
	},

	cross: function( p )
	{
		return new Point( this.x * p.x, this.y * p.y );
	},

	normalize: function()
	{
		var len = this.length;

		this.x /= len;
		this.y /= len;
	},

	perpendicular: function()
	{
		return new Point( this.y, -this.x );
	},

	rotate: function( t )
	{
		//cos, sin
		//-sin, cos

		var cos = Math.cos( t );
		var sin = Math.sin( t );

		return new Point( cos * this.x + sin * this.y, -sin * this.x + cos * this.y );
	}
}



var Line = function( a, b )
{
	EventDispatcher.apply( this, [] );

	this.a = a;
	this.b = b;
	this.lineStyle = "#000000";
}

Line.prototype = 
{
	draw: function( context )
	{
		context.beginPath();

		context.strokeStyle = this.lineStyle;
		context.moveTo( this.a.x, this.a.y );
		context.lineTo( this.b.x, this.b.y );
		context.stroke();
	},

	hitTestLine: function( target, IP )
	{
		var AP1 = this.a;
		var AP2 = this.b;

		var BP1 = target.a;
		var BP2 = target.b;

		var t;

	    var s; 

	    var under = (BP2.y-BP1.y)*(AP2.x-AP1.x)-(BP2.x-BP1.x)*(AP2.y-AP1.y);

	    if(under==0) return false;



	    var _t = (BP2.x-BP1.x)*(AP1.y-BP1.y) - (BP2.y-BP1.y)*(AP1.x-BP1.x);

	    var _s = (AP2.x-AP1.x)*(AP1.y-BP1.y) - (AP2.y-AP1.y)*(AP1.x-BP1.x); 



	    t = _t/under;

	    s = _s/under; 



	    if(t<0.0 || t>1.0 || s<0.0 || s>1.0) return false;

	    if(_t==0 && _s==0) return false; 



	    IP.x = AP1.x + t * (AP2.x-AP1.x);

	    IP.y = AP1.y + t * (AP2.y-AP1.y);

	    return true;
	}
}

extend( EventDispatcher, Line );



var Rect = function( w, h, fillStyle )
{
	EventDispatcher.apply( this, [] );

	this.width = w;
	this.height = h;
	this.fillStyle = fillStyle;

	this.x = this.y = 0;
	this.scaleX = this.scaleY = 1;
	this.rotation = 0;

	this.mouseEnabled = true;
}

Rect.prototype = 
{
	draw: function( context )
	{
		context.translate( this.x, this.y );
		context.rotate( this.rotation );
		context.scale( this.scaleX, this.scaleY );

		context.fillStyle = this.fillStyle;
		context.beginPath();
		context.rect( -( this.width / 2 ), -( this.height / 2 ), this.width, this.height );
		context.fill();
	},

	drawPath: function( context )
	{
		context.translate( this.x, this.y );
		context.rotate( this.rotation );
		context.scale( this.scaleX, this.scaleY );

		context.beginPath();
		context.rect( -( this.width / 2 ), -( this.height / 2 ), this.width, this.height );
	},

	getAxes: function()
	{
		var a = new Point( 1, 0 ).rotate( -this.rotation );
		var b = new Point( 0, 1 ).rotate( -this.rotation );

		aAxis = a.perpendicular();
		aAxis.normalize();

		bAxis = b.perpendicular();
		bAxis.normalize();

		return [ aAxis, bAxis ];
	},

	hitTestObject: function( target )
	{
		var axes = this.getAxes().concat( target.getAxes() );

		for( var i = 0; i < axes.length; i++ )
		{
			var axis = axes[i];

			var pA = this.project( axis );
			var pB = target.project( axis );

			if( pA.a > pB.b || pA.b < pB.a ) return false;
		}

		return true;
	},

	project: function( axis )
	{
		var points = [
			new Point( 0, 0 ), 
			new Point( this.width, 0 ),
			new Point( 0, this.height ),
			new Point( this.width, this.height )
		];

		var min = 100000;
		var max = -100000;

		for( var i = 0; i < points.length; i++ )
		{
			var p = points[i];

			p = p.add( new Point( -this.width / 2, -this.height / 2 ) );
			p = p.rotate( -this.rotation );
			p = p.add( new Point( this.x, this.y ) );
			
			var t = p.dot( axis );

			if( t < min ) min = t;
			if( t > max ) max = t;
		}

		return { a: min, b: max };
	}
}

extend( EventDispatcher, Rect );





var canvas;
var context;
var stage;

window.onload = function()
{
	console.log( "init" );

	canvas = document.getElementById( "canvas" );
	context = canvas.getContext( "2d" );
	stage = new Stage( canvas );

	//testCircle();
	//testEventDispatcher();
	//testPendulum();

	//testTween();
	//testMouseEvent();
	//testSAT();

	testBouncing();
}

function testBouncing()
{
	var n = 10;
	var lines = [];

	for( var i = 0; i < n; i++ )
	{
		var l = new Line();

		l.a = new Point( stage.stageWidth * Math.random(), stage.stageHeight * Math.random() );
		l.b = new Point( stage.stageWidth * Math.random(), stage.stageHeight * Math.random() );

		lines.push( l );

		stage.addChild( l );
	}

	var ray = new Line();

	ray.lineStyle = "#cc0000";
	ray.a = new Point( 0, 0 );
	ray.b = new Point( 10, 10 );

	stage.addChild( ray );

	var p = new Circle( 3, "#0000ff" );
	stage.addChild( p );

	var bounce = new Line();
	bounce.lineStyle = "#0000ff";
	bounce.a = new Point( 0, 0 );
	bounce.b = new Point( 0, 0 );
	stage.addChild( bounce );

	function onMove( e )
	{
		ray.b.x = e.x;
		ray.b.y = e.y;

		var hitPoint = new Point( 0, 0 );

		for( var i = 0; i < lines.length; i++ )
		{
			if( ray.hitTestLine( lines[i], hitPoint ) )
			{
				p.x = hitPoint.x;
				p.y = hitPoint.y;

				var v = ray.a.substract( ray.b );
				var l = lines[i].b.substract( lines[i].a );

				l.normalize();

				var scalar = v.dot( l ); 

				l.x *= 2 * scalar;
				l.y *= 2 * scalar;

				var _v = v.substract( l ).add( new Point( p.x, p.y ) );

				bounce.a.x = p.x;
				bounce.a.y = p.y;

				bounce.b.x = _v.x;
				bounce.b.y = _v.y;
			}
		}
	}

	stage.addEventListener( "mousemove", onMove );
}



function testSAT()
{
	// var n = 2;

	// for( var i = 0; i < n; i++ )
	// {
	// 	var r = new Rect( 20, 20, "#ff0000" );

	// 	r.x = stage.stageWidth * Math.random();
	// 	r.y = stage.stageHeight * Math.random();
	// 	r.scaleX = Math.random() + 1;
	// 	r.rotation = 15 * RAD;

	// 	stage.addChild( r );
	// }

	var target;
	var targetFillStyle;

	function onDown( e )
	{
		target = e.target;
		targetFillStyle = target.fillStyle;

		stage.addEventListener( "mousemove", onMove );
		stage.addEventListener( "mouseup", onUp );
	}

	function onMove( e )
	{
		target.x = e.x;
		target.y = e.y;

		target.rotation += 0.05;

		for( var i = 0; i < arr.length; i++ )
		{
			if( target == arr[i] ) continue;

			if( target.hitTestObject( arr[i] ) )
			{
				console.log( "HIT", arr[i].fillStyle );

				target.fillStyle = "#00CC00";
			}
			else
			{
				console.log( "NOT" );
				target.fillStyle = targetFillStyle;
			}
		}
	}

	function onUp( e )
	{
		stage.removeEventListener( "mousemove", onMove );
		stage.removeEventListener( "mouseup", onUp );
	}


	var a = new Rect( 200, 20, "#0000ff" );
	var b = new Rect( 50, 100, "#ff0000" );

	var arr = [a,b];

	for( var i = 0; i < arr.length; i++ )
	{
		stage.addChild( arr[i] );

		arr[i].x = 20 + i * 100;
		arr[i].y = 200;
		arr[i].rotation = 360 * Math.random() * RAD;
		arr[i].addEventListener( "mousedown", onDown );
	}


	// var o = b.project( new Point( 0, 1 ) );

	// console.log( o );

	// var l0 = new Line();
	// l0.a = new Point( b.x + o.a, b.y );
	// l0.b = new Point( b.x, b.y );
	// l0.lineStyle = "#00cc00";

	// var l1 = new Line();
	// l1.a = new Point( b.x + o.b, b.y + 1 );
	// l1.b = new Point( b.x, b.y + 1 );
	// l1.lineStyle = "#0000ff";

	// stage.addChild( l0 );
	// stage.addChild( l1 );


	// var axises = b.getAxes();

	// for( var i = 0; i < axises.length; i++ )
	// {
	// 	var p = axises[i];
	// 	l = new Line();

	// 	l.a = new Point( b.x, b.y );
	// 	l.b = new Point( b.x + p.x * 100, b.y + p.y * 100 );

	// 	stage.addChild( l );
	// }

	
	// var points = [
	// 	new Point( 0, 0 ),
	// 	new Point( b.width, 0 ),
	// 	new Point( 0, b.height ),
	// 	new Point( b.width, b.height )
	// ]

	// var fillStyle = [
	// 	"#000000",
	// 	"#00ff00",
	// 	"#0000ff",
	// 	"#ff00ff"
	// ]


	// for( i = 0; i < points.length; i++ )
	// {
	// 	var c = new Circle( 5, fillStyle[i] );
	// 	var a = points[i];

	// 	a = a.add( new Point( -b.width / 2, -b.height / 2 ) );
	// 	a = a.rotate( -b.rotation );

	// 	stage.addChild( c );

	// 	c.x = b.x + a.x;
	// 	c.y = b.y + a.y;
	// }
}










function testMouseEvent()
{
	var n = 200;
	var min = 5;
	var max = 20;


	function onMouseOver( e )
	{
		e.target.scaleX = 1.2;
		e.target.scaleY = 1.2;
	}

	function onMouseOut( e )
	{
		e.target.scaleX = 1;
		e.target.scaleY = 1;
	}


	var target;
	
	function onMouseMove( e )
	{
		target.x = e.x;
		target.y = e.y;
	}

	function onMouseUp( e )
	{
		stage.removeEventListener( "mousemove", onMouseMove );
		stage.removeEventListener( "mouseup", onMouseUp );
	}


	function onMouseDown( e )
	{
		target = e.target;

		e.target.stage.addEventListener( "mousemove", onMouseMove );
		e.target.stage.addEventListener( "mouseup", onMouseUp );
	}


	for( var i = 0; i < n; i++ )
	{
		var c = new Circle( max * Math.random() + min, toHex( 0xffffff * Math.random() ) );

		c.x = stage.stageWidth * Math.random();
		c.y = stage.stageHeight * Math.random();

		c.addEventListener( "mouseover", onMouseOver, this );
		c.addEventListener( "mouseout", onMouseOut, this );
		c.addEventListener( "mousedown", onMouseDown, this );

		stage.addChild( c );
	}
}








var Tween = function()
{

}

Tween.to = function( target, delay, prop )
{
	var t = new Tween();

	t.target = target;
	t.delay = parseInt( delay * 1000 );
	t.prop = prop;

	t.start();

	return t;
}

Tween.prototype = 
{
	start: function()
	{
		this.startVO = {};
		this.now = parseInt( window.performance.now() );

		for( var s in this.prop )
		{
			if( !this.target.hasOwnProperty( s ) ) continue;

			this.startVO[s] = this.target[s];
		}

		this.reqId = requestAnimationFrame( this.update.bind( this ) );
	},

	update: function( ms )
	{
		ms = Math.min( this.delay, ms - this.now );

		var a;
		var b;
		var t;

		for( var s in this.startVO )
		{
			a = this.startVO[s];
			b = this.prop[s];

			t = this.prop.ease( ms, this.delay );

			this.target[s] = a + t * ( b - a );
		}

		if( ms >= this.delay )
			cancelAnimationFrame( this.reqId )
		else
			this.reqId = requestAnimationFrame( this.update.bind( this ) );
	}
}

Tween.linear = function( current, total )
{
	return current / total;
}

Tween.easeIn = function( current, total )
{
	return Math.pow( current / total, 6 );
}

Tween.easeOut = function( current, total )
{
	return 1 - Math.pow( 1 - current / total, 6 );
}

//c / t – sin( c / t * 2pi ) / ( 2pi );
Tween.easeInOut = function( current, total )
{
	return current / total - Math.sin( current / total * 2 * Math.PI ) / ( 2 * Math.PI );
}



function testTween()
{
	//Tween.to( cicle, 1, { x: 100, y: 100, ease: Tween.easeIn } );

	var c = new Circle( 10, "#ff0000" );

	stage.addChild( c );

	Tween.to( c, 1, { x: 400, y: 400, scaleX: 2, scaleY: 2, ease: Tween.easeInOut } );
}



function testPendulum()
{
	var c = new Circle( 10, "#ff0000" );

	stage.addChild( c );

	c.x = stage.stageWidth / 2;
	c.y = stage.stageHeight / 2;

	var len = 100;
	var cx = stage.stageWidth / 2;
	var cy = stage.stageHeight / 2 - len;
	var t;
	var t0 = Math.PI / 4;
	var ang = 0;

	function onEnter( e )
	{
		t = Math.PI / 2 + t0 * Math.cos( 2 * ang );

		c.x = cx + len * Math.cos( t );
		c.y = cy + len * Math.sin( t );

		ang += 0.05;

		t0 *= 0.995;
	}

	c.addEventListener( "enterframe", onEnter );
}



function testEventDispatcher()
{
	var e = new Circle();

	function onTest( e )
	{
		console.log( e );
	}

	e.addEventListener( "test", onTest, this ); 
	e.dispatchEvent( { type: "test", num: 1234 } );
}


function testCircle()
{
	function onClick( e )
	{
		var c = new Circle( 10, "#0000ff" );

		c.x = 0;
		c.y = canvas.height;

		c.fire( e.offsetX / 20, ( e.offsetY - canvas.height )/ 20 );

		stage.addChild( c );
	}

	canvas.addEventListener( "click", onClick );
}











