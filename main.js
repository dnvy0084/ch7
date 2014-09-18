
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
}

Stage.prototype = 
{
	addChild: function( child )
	{
		if( this.contains( child ) )
			this.removeChild( child );

		this.children.push( child );
	},

	removeChild: function( child )
	{
		var index = this.children.indexOf( child );

		if( index == -1 ) return;

		this.children.splice( index, 1 );
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

	this.radius = radius;
	this.fillStyle = fillStyle;
}

Circle.prototype = 
{
	draw: function( context )
	{
		context.translate( this.x, this.y );

		context.fillStyle = this.fillStyle;
		context.beginPath();
		context.arc( 0, 0, this.radius, 0, 2 * Math.PI );
		context.fill();
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

	testCircle();
	//testEventDispatcher();
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
	var c = new Circle( 10, "#0000ff" );

	stage.addChild( c );

	c.x = 100;
	c.y = 100;

	function onEnter( e )
	{
		c.x++;
	}

	c.addEventListener( "enterframe", onEnter ); 
}











