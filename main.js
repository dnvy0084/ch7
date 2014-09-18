
// var Vector = function( x, y )
// {
// 	this.x = x;
// 	this.y = y;
// }

// Vector.prototype = 
// {
// 	add: function( v )
// 	{
// 		this.x += v.x;
// 		this.y += v.y;
// 	},

// 	sub: function( v )
// 	{
// 		this.x -= v.x;

// 	},

// 	dot: function( v )
// 	{
// 		return this.x * v.x + this.y * v.y;
// 	},

// 	normalize: function( v)
// 	{
// 		var len = Math.sqrt( this.x * this.x + y * y );

// 		this.x /= len;
// 		this.y /= len;
// 	}
// }


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
			if( this.map[ type ].listener == listener )
				return i;
		}

		return -1;
	}
}


var Stage = function( context )
{	
	EventDispatcher.apply( this, [] );

	this.context = context;
	this.children = [];

	this.reqId = requestAnimationFrame( this.update.bind( this ) );

	this.__defineGetter__( 
		"stageWidth", 
		function(){ return this.context.canvas.width } );

	this.__defineGetter__(
		"stageHeight",
		function(){ return this.context.canvas.height } );
}

Stage.prototype = 
{
	addChild: function( child )
	{
		if( this.contains( child ) )
			this.removeChild( child );

		this.children.push( child );
		child.stage = this;
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

		for( var i = 0; i < this.children.length; i++ )
		{
			this.children[i].dispatchEvent( { type: "enterframe" } );

			this.context.save();

			this.children[i].draw( this.context );

			this.context.restore();
		}

		this.reqId = requestAnimationFrame( this.update.bind( this ) );
	}
}

extend( EventDispatcher, Stage );


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
}

Circle.prototype = 
{
	draw: function( context )
	{
		context.translate( this.x, this.y );
		context.scale( this.scaleX, this.scaleY );

		context.fillStyle = this.fillStyle;
		context.beginPath();
		context.arc( 0, 0, this.radius, 0, 2 * Math.PI );
		context.fill();
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









var canvas;
var context;
var stage;

window.onload = function()
{
	console.log( "init" );

	canvas = document.getElementById( "canvas" );
	context = canvas.getContext( "2d" );
	stage = new Stage( context );

	//testCircle();
	//testEventDispatcher();
	//testPendulum();

	testTween();
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











