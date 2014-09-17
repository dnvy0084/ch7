
var Stage = function( context )
{
	this.context = context;
	this.children = [];
}

Stage.prototype = 
{
	addChild: function( child )
	{
		if( this.contains( child ) )
		{
			this.removeChild( child );
		}

		this.children.push( child );
	},

	removeChild: function( child )
	{
		var index = this.children.indexOf( child );

		if( index > -1 ) 
			this.children.splice( index, 1 );
	},

	contains: function( child )
	{
		return this.children.indexOf( child ) > -1;
	},

	update: function()
	{
		this.context.clearRect( 0, 0, this.context.canvas.width, this.context.canvas.height );

		for( var i = 0; i < this.children.length; i++ )
		{
			this.context.save();

			this.children[i].draw( this.context );

			this.context.restore();
		}
	}
}

var Circle = function( radius, fillStyle )
{
	this.x = 0;
	this.y = 0;

	this.scaleX = 1;
	this.scaleY = 1;

	this.radius = radius;
	this.fillStyle = fillStyle;
}

Circle.prototype = 
{
	draw: function( context )
	{
		context.scale( this.scaleX, this.scaleY );
		//context.translate( this.x, this.y );

		context.fillStyle = this.fillStyle;
		context.beginPath();
		context.arc( 0, 0, this.radius, 0, 2 * Math.PI );
		context.fill();
	}
}


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
}




function testCircle()
{
	var circle =  new Circle( 10, "#cc0000" );
	stage.addChild( circle );

	circle.x = 100;
	circle.y = 100;

	function render()
	{
		stage.update();

		circle.x++;
		circle.scaleX = Math.cos( window.performance.now() / 10 );

		id = requestAnimationFrame( render );
	}

	var id = requestAnimationFrame( render );

	stage.update();
}
